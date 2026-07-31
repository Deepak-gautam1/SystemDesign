"""
server.py — FastAPI backend for the SD Study Bot.

API endpoints:
  GET  /api/status       → health + chunk count
  POST /api/chat         → SSE: RAG-grounded system design chat
  POST /api/evaluate     → SSE: Groq/Gemini code quality review for OOD practice
"""

import json
import os
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# ─── Global clients ───────────────────────────────────────────────────────────

_rag        = None
_groq_client= None   # kept separate so /api/evaluate works even if RAG DB missing

GROQ_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
]


# ─── Lifespan ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _rag, _groq_client

    # 1. Groq client (used by both chat and evaluate)
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    if groq_key:
        try:
            from groq import Groq
            _groq_client = Groq(api_key=groq_key)
            _groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": "hi"}],
                max_tokens=3,
            )
            print("✅  Groq client ready")
        except Exception as e:
            print(f"⚠️  Groq unavailable: {e}")
            _groq_client = None
    else:
        print("ℹ️  No GROQ_API_KEY — add one from console.groq.com")

    # 2. RAG engine (requires vector DB from ingest.py)
    print("Loading RAG engine…")
    try:
        from rag import RAGEngine
        _rag = RAGEngine()
        print(f"✅  RAG ready — {_rag.chunk_count:,} chunks")
    except Exception as exc:
        print(f"⚠️  RAG failed: {exc}")
        print("   Server in degraded mode — /api/chat unavailable until ingest completes.")
        _rag = None

    yield


app = FastAPI(title="SD Study Bot", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Pydantic models ──────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    query:   str
    mode:    str        = "study"
    history: list[dict] = []


class EvaluateRequest(BaseModel):
    student_code:        str
    problem_title:       str
    reference_code:      str
    problem_description: str = ""


# ─── /api/status ──────────────────────────────────────────────────────────────

@app.get("/api/status")
async def status():
    return {
        "status": "ok" if _rag else "not_ready",
        "chunks": _rag.chunk_count if _rag else 0,
        "groq":   _groq_client is not None,
        "message": None if _rag else "Run python ingest.py first",
    }


# ─── /api/chat ────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not _rag:
        raise HTTPException(503, "RAG engine not ready — run python ingest.py first")
    if not req.query.strip():
        raise HTTPException(400, "query cannot be empty")

    def stream():
        try:
            chunks = _rag.retrieve(req.query)
            yield f"data: {json.dumps({'type': 'sources', 'data': chunks})}\n\n"
            for token in _rag.stream_answer(req.query, req.mode, req.history, chunks):
                yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})


# ─── /api/evaluate ────────────────────────────────────────────────────────────

EVAL_SYSTEM = """You are a senior C++ software engineer and OOP mentor.
Review the student's C++ practice code clearly and constructively.
Be specific — reference exact class/method names from their code.
Focus on: correctness, OOP principles (encapsulation, abstraction, polymorphism, SOLID), code quality."""

def _build_eval_prompt(req: EvaluateRequest) -> str:
    return f"""Problem: **{req.problem_title}**

Reference Solution:
```cpp
{req.reference_code[:3500]}
```

Student's Code:
```cpp
{req.student_code[:3500]}
```

Review the student's code using EXACTLY this structure:

## Score: X/10

## ✅ What You Got Right
[Specific things they implemented correctly — be generous with genuine praise]

## ⚠️ Issues Found
[Bugs or logic errors with exact location in their code]

## 🎯 OOP Principles
[Which OOP concepts were applied correctly vs missed — encapsulation, abstraction, SOLID etc.]

## 📝 Code to Fix
[Show 1–2 concrete before/after examples of specific improvements]

## 💡 Key Takeaways
[2–3 most important lessons from this review]"""


@app.post("/api/evaluate")
async def evaluate(req: EvaluateRequest):
    if not req.student_code.strip():
        raise HTTPException(400, "No code to evaluate")

    # Check if the student hasn't changed the template
    if req.student_code.strip() == req.problem_description.strip():
        raise HTTPException(400, "Write your own implementation before evaluating")

    prompt = _build_eval_prompt(req)

    def stream():
        # ── 1. Groq (primary — fast, generous free tier) ──────────────────
        if _groq_client:
            for model in GROQ_MODELS:
                try:
                    response = _groq_client.chat.completions.create(
                        model=model,
                        messages=[
                            {"role": "system", "content": EVAL_SYSTEM},
                            {"role": "user",   "content": prompt},
                        ],
                        stream=True,
                        max_tokens=2048,
                        temperature=0.3,
                    )
                    for chunk in response:
                        content = chunk.choices[0].delta.content
                        if content:
                            yield f"data: {json.dumps({'type': 'token', 'text': content})}\n\n"
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    return
                except Exception as exc:
                    err = str(exc)
                    if any(x in err.lower() for x in ["429", "rate_limit", "model_not_active", "model_decommissioned"]):
                        continue
                    yield f"data: {json.dumps({'type': 'error', 'message': err})}\n\n"
                    return

        # ── 2. Gemini fallback (via RAG engine's client) ───────────────────
        if _rag and _rag._gemini:
            full_prompt = f"{EVAL_SYSTEM}\n\n{prompt}"
            for model in _rag._gemini_gen:
                try:
                    for piece in _rag._gemini.models.generate_content_stream(
                        model=model, contents=full_prompt
                    ):
                        if piece.text:
                            yield f"data: {json.dumps({'type': 'token', 'text': piece.text})}\n\n"
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
                    return
                except Exception as exc:
                    if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                        continue
                    yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
                    return

        yield f"data: {json.dumps({'type': 'error', 'message': 'No LLM available. Add GROQ_API_KEY to .env'})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})


# ─── Static frontend ──────────────────────────────────────────────────────────

frontend_dir = Path(__file__).parent / "frontend"
frontend_dir.mkdir(exist_ok=True)
app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
