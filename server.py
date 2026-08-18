"""
server.py — FastAPI backend for the SD Study Bot.

API endpoints:
  GET  /api/status       → health + chunk count
  POST /api/chat         → SSE: RAG-grounded system design chat
  POST /api/evaluate     → SSE: Groq/Gemini code quality review for OOD practice
  POST /api/topic-chat   → SSE: Socratic quiz chat scoped to a client-supplied topic
                            (e.g. an ML theory topic) — no ChromaDB retrieval
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
    "openai/gpt-oss-20b",     # production tier, ~1000 tok/s, 131k context — fastest
    "openai/gpt-oss-120b",    # production tier, ~500 tok/s, 131k context — higher quality
]

# Substrings that mean "this specific model is unusable, try the next one" —
# as opposed to a real failure (bad key, network error) that should surface.
# Groq periodically retires/renames models (e.g. the entire llama-3.x chat
# lineup was deprecated in 2026 in favor of openai/gpt-oss-*), so this list
# has to catch a live "model no longer exists" response, not just rate limits.
_GROQ_SKIP_MODEL_KEYWORDS = [
    "429", "rate_limit", "rate limit",
    "model_not_active", "model_decommissioned",
    "model_not_found", "model not found", "does not exist",
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
            # Smoke-test against the fallback list itself, not one hardcoded
            # model — a single retired/renamed model (which Groq does from
            # time to time) must not disable Groq entirely if another model
            # in GROQ_MODELS still works.
            smoke_errors = []
            for model in GROQ_MODELS:
                try:
                    _groq_client.chat.completions.create(
                        model=model,
                        messages=[{"role": "user", "content": "hi"}],
                        max_tokens=3,
                    )
                    break
                except Exception as model_exc:
                    smoke_errors.append(f"{model}: {model_exc}")
            else:
                raise RuntimeError("; ".join(smoke_errors))
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
    topic:   str        = ""


class TopicChatRequest(BaseModel):
    query:         str
    mode:          str        = "ml_quiz"
    history:       list[dict] = []
    topic_title:   str        = ""
    topic_content: str        = ""


class EvaluateRequest(BaseModel):
    student_code:        str
    problem_title:       str
    reference_code:      str
    problem_description: str = ""
    language:            str = "cpp"   # "cpp" | "sql" — picks the review persona/criteria below


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
            retrieval_query = f"{req.topic}. {req.query}" if req.topic else req.query
            chunks = _rag.retrieve(retrieval_query)
            yield f"data: {json.dumps({'type': 'sources', 'data': chunks})}\n\n"
            for token in _rag.stream_answer(req.query, req.mode, req.history, chunks, req.topic):
                yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})


# ─── /api/topic-chat ──────────────────────────────────────────────────────────
# Same SSE shape as /api/chat, but the "reference material" is a short markdown
# topic blob the client already has (e.g. an ML TheoryTopic.content) rather than
# a large corpus that needs semantic search — so this skips ChromaDB retrieval
# entirely and hands that content straight to stream_answer() as a single chunk.

@app.post("/api/topic-chat")
async def topic_chat(req: TopicChatRequest):
    if not _rag:
        raise HTTPException(503, "RAG engine not ready — run python ingest.py first")
    if not req.query.strip():
        raise HTTPException(400, "query cannot be empty")

    def stream():
        try:
            chunks = (
                [{"text": req.topic_content, "source": req.topic_title or "Reference", "page": 0}]
                if req.topic_content else []
            )
            # ml_quiz's "ask exactly one question, then stop" rule is only
            # loosely followed by the model even with a strict system prompt —
            # empirically it still front-loads several questions (or an early
            # debrief) on a meaningful fraction of turns. Enforce it in code
            # instead of hoping the prompt holds: once the emitted text hits
            # its first "?", drop everything the model generates after it.
            # A debrief turn has no "?" at all, so it streams through whole.
            enforce_one_question = req.mode == "ml_quiz"
            emitted = ""
            for token in _rag.stream_answer(req.query, req.mode, req.history, chunks, req.topic_title):
                if enforce_one_question:
                    if "?" in emitted:
                        break
                    combined = emitted + token
                    q_idx = combined.find("?")
                    if q_idx != -1:
                        token = combined[len(emitted):q_idx + 1]
                    emitted = combined[:q_idx + 1] if q_idx != -1 else combined
                yield f"data: {json.dumps({'type': 'token', 'text': token})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"})


# ─── /api/evaluate ────────────────────────────────────────────────────────────

EVAL_SYSTEM_CPP = """You are a senior C++ software engineer and OOP mentor.
Review the student's C++ practice code clearly and constructively.
Be specific — reference exact class/method names from their code.
Focus on: correctness, OOP principles (encapsulation, abstraction, polymorphism, SOLID), code quality."""

EVAL_SYSTEM_SQL = """You are a senior data engineer and SQL interview coach.
Review the student's SQL practice query clearly and constructively.
Be specific — reference exact table/column/clause names from their query.
Focus on: correctness against the stated requirement, proper use of joins/window functions/aggregation,
NULL-handling edge cases, and query readability."""

def _eval_system(language: str) -> str:
    return EVAL_SYSTEM_SQL if language == "sql" else EVAL_SYSTEM_CPP


def _build_eval_prompt(req: EvaluateRequest) -> str:
    lang = "sql" if req.language == "sql" else "cpp"
    technique_section = (
        "## 🎯 SQL Technique\n"
        "[Which SQL concepts were applied correctly vs missed — joins, window functions, "
        "GROUP BY/HAVING, NULL-handling, subqueries etc.]"
        if lang == "sql" else
        "## 🎯 OOP Principles\n"
        "[Which OOP concepts were applied correctly vs missed — encapsulation, abstraction, SOLID etc.]"
    )
    return f"""Problem: **{req.problem_title}**

Reference Solution:
```{lang}
{req.reference_code[:3500]}
```

Student's Code:
```{lang}
{req.student_code[:3500]}
```

Review the student's code using EXACTLY this structure:

## Score: X/10

## ✅ What You Got Right
[Specific things they implemented correctly — be generous with genuine praise]

## ⚠️ Issues Found
[Bugs or logic errors with exact location in their code]

{technique_section}

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
                            {"role": "system", "content": _eval_system(req.language)},
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
                    if any(kw in err.lower() for kw in _GROQ_SKIP_MODEL_KEYWORDS):
                        continue
                    yield f"data: {json.dumps({'type': 'error', 'message': err})}\n\n"
                    return

        # ── 2. Gemini fallback (via RAG engine's client) ───────────────────
        if _rag and _rag._gemini:
            full_prompt = f"{_eval_system(req.language)}\n\n{prompt}"
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
