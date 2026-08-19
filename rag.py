"""
rag.py — Retrieval-Augmented Generation engine.

Generation priority:
  1. Groq  (LLaMA / Mixtral)  — primary; fast, 1k–14k req/day free, no daily cap issues
  2. Gemini generation models — fallback when Groq is rate-limited

Embeddings: always Gemini (gemini-embedding-001 or similar).

Groq uses the OpenAI-compatible chat format (system + user + assistant messages),
which gives better multi-turn answers than the single-string Gemini prompt.
"""

import os
from google import genai
import chromadb
from dotenv import load_dotenv

from config import (
    DB_PATH, COLLECTION, TOP_K,
    EMBED_BACKEND, COLLECTION_LOCAL, LOCAL_EMBED_MODEL, LOCAL_EMBED_ENGINE,
)

# BGE retrieval models expect this instruction prefix on the *query* only —
# passages are embedded as-is (see ingest_local.py). Improves recall notably.
_LOCAL_QUERY_PREFIX = "Represent this sentence for searching relevant passages: "

load_dotenv()

# ── Groq models ───────────────────────────────────────────────────────────────
# Tried in order; first that responds without 429/deprecation wins. Groq
# periodically retires whole model families — the entire llama-3.x chat
# lineup (and mixtral, gemma2) was deprecated in 2026 in favor of these
# openai/gpt-oss-* production-tier models. Check console.groq.com/docs/models
# before assuming a "Groq unavailable" error means the API key is bad.
GROQ_MODELS = [
    "openai/gpt-oss-20b",     # production tier, ~1000 tok/s, 131k context — fastest
    "openai/gpt-oss-120b",    # production tier, ~500 tok/s, 131k context — higher quality
]

# ── Gemini embedding candidates ───────────────────────────────────────────────
_EMBED_CANDIDATES = [
    ("v1",    "gemini-embedding-001"),
    ("v1",    "gemini-embedding-2"),
    ("v1beta", "gemini-embedding-001"),
    ("v1beta", "gemini-embedding-2"),
    ("v1",    "text-embedding-004"),
]

# ── Gemini generation fallback ────────────────────────────────────────────────
_GEMINI_GEN_PRIORITY = [
    "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash",
    "gemini-3.1-flash-lite", "gemini-2.5-flash-lite", "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001", "gemma-4-26b-a4b-it", "gemma-4-31b-it",
    "gemini-2.0-flash", "gemini-2.5-flash",
]

# ── System prompts ────────────────────────────────────────────────────────────

_PROMPTS: dict[str, str] = {

"study": """\
You are a knowledgeable system design tutor. The student is working through
Alex Xu's "System Design Interview" books (Parts 1 & 2) plus open-source
system design repositories from GitHub.

GUIDELINES:
- Ground every answer in the provided BOOK CONTEXT.
- Structure: concept → how it works → tradeoffs → when to use it.
- Use concrete numbers when available (QPS, latency, storage estimates).
- ASCII diagrams and bullet points are welcome when they help.
- If the context doesn't fully cover a question, say so clearly.
""",

"quiz": """\
You are a rigorous system design interviewer. The student is preparing using
Alex Xu's "System Design Interview" books (Parts 1 & 2).

RULES:
1. Start each topic with ONE clear interview question.
2. Never give the answer directly — use Socratic follow-ups:
   • "Good start — what happens when the cache fills up?"
   • "Walk me through 10× the traffic."
   • "What are the tradeoffs between Option A and B?"
3. After 3–4 exchanges on a topic, end with a structured debrief:

--- INTERVIEW DEBRIEF ---
Score: X / 5
Nailed: [what they got right]
Gaps: [specific weak areas]
Book ref: [chapter / concept]
-------------------------
""",

"deep_dive": """\
You are a senior staff engineer doing a deep technical walkthrough.
The student has Alex Xu's System Design Interview books as a companion.

APPROACH:
1. Open with a concise ASCII architecture diagram.
2. Each component: purpose → implementation → failure modes.
3. Every design decision: state the tradeoff explicitly.
4. Scalability ladder: 1× → 10× → 100× — what changes?
5. Tie back to the book when relevant.
6. Close with 2–3 follow-up questions for the student.
""",


# ── Topic-scoped modes (/api/topic-chat) ─────────────────────────────────────
# These two back the tutor attached to every theory topic in ML, SQL and OOD.
# They're deliberately subject-neutral: the caller passes the topic title (e.g.
# "SQL — CTE Materialization") as the anchor and the topic's own notes as the
# reference context, which pins the subject far more reliably than baking three
# near-identical per-subject prompts in here that would then drift apart.

"topic_quiz": """\
You are a rigorous technical interviewer. The student is preparing for
interviews and has given you their own notes on one specific topic as the
reference context below. Interview them on THAT topic, at the level of
difficulty a real interview for it would use.

RULES:
1. Ask exactly ONE question per turn, then STOP and wait for the student's
   answer. Your entire reply is ONE short reaction plus ONE question —
   never a numbered list, never multiple "Follow-up N" blocks, never more
   than one question mark in the whole reply. Root the first question in the
   reference context below, in plain language, not just textbook jargon.
2. Never give the answer directly. Read the student's actual answer and react
   to it specifically before asking the next single question:
   • If they nailed it, push on an edge case: "Good — now what breaks at 100×
     the data?" / "Right — what if that column is nullable?"
   • If they were vague or wrong: point out exactly what's missing or off,
     then re-ask or narrow the question — don't just move on.
3. Favor concrete, worked examples over bare definitions. Where the topic
   naturally has code (SQL, class design), ask them to reason about a small
   concrete snippet rather than recite a definition.
4. Count the student's answers so far in the conversation history. Only once
   they've answered at least 3 separate questions may you stop asking and
   write the structured debrief below INSTEAD of a question — never combine
   a debrief with a new question, and never debrief after just 1–2 answers:

--- INTERVIEW DEBRIEF ---
Score: X / 5
Nailed: [what they got right]
Gaps: [specific weak areas]
Concept ref: [the specific topic/subsection to review again]
-------------------------
""",

"topic_ask": """\
You are a patient, precise tutor. The student is reading one specific topic from
their own interview-prep notes (the reference context below) and wants to ask
free-form questions about it. Unlike the interview mode, here you DO answer.

GUIDELINES:
- Answer the question directly first, in two or three sentences, then expand.
- Stay anchored to the current topic. Related material is fair game when it
  genuinely helps ("this is why the index doesn't get used here"), but don't
  wander into a different topic entirely.
- Prefer a small concrete example over an abstract restatement — a worked
  number, a three-row table, a five-line snippet.
- Correct the premise when a question contains a misconception, explicitly:
  "Careful — X doesn't actually do that. What it does is…"
- The notes are the student's own; if they're incomplete or the question goes
  past them, say so plainly and answer from general knowledge, flagging which
  part is beyond the notes.
- Keep it tight. No filler preamble, no "great question", no restating the
  question back before answering it.
- End with ONE optional nudge toward what's worth understanding next, only when
  there's genuinely a natural next step.
""",
}


# ── RAG Engine ────────────────────────────────────────────────────────────────

class RAGEngine:
    """
    Embedding:  Gemini (default) or a local sentence-transformers model
                (EMBED_BACKEND=local in .env) — must match whichever
                ingest script built the collection being queried.
    Generation: Groq primary → Gemini fallback
    """

    # ── Static helpers ─────────────────────────────────────────────────────────

    @staticmethod
    def _load_all_keys() -> list[str]:
        """Load any env var matching GEMINI_API_KEY{_1…_9, 1…9, or plain}."""
        keys, seen = [], set()
        for name in (
            ["GEMINI_API_KEY"]
            + [f"GEMINI_API_KEY_{n}" for n in range(1, 10)]
            + [f"GEMINI_API_KEY{n}"  for n in range(1, 10)]
        ):
            v = os.getenv(name, "").strip()
            if v and v not in seen:
                keys.append(v)
                seen.add(v)
        return keys

    # ── Init ───────────────────────────────────────────────────────────────────

    def __init__(self) -> None:
        self.embed_backend = EMBED_BACKEND    # "gemini" (default) or "local"

        self._gemini:      genai.Client | None = None
        self._embed_model: str = ""
        self._gen_model:   str = ""     # best Gemini gen model found so far
        self._local_model = None        # sentence-transformers model, if backend=="local"

        all_keys = self._load_all_keys()

        # ── 1. Embeddings ──────────────────────────────────────────────────────
        if self.embed_backend == "local":
            if LOCAL_EMBED_ENGINE == "fastembed":
                from fastembed import TextEmbedding
                print(f"  🔢 Loading fastembed model '{LOCAL_EMBED_MODEL}' (ONNX, no torch)…")
                self._local_model = TextEmbedding(model_name=LOCAL_EMBED_MODEL)
            else:
                from sentence_transformers import SentenceTransformer
                print(f"  🔢 Loading local embedding model '{LOCAL_EMBED_MODEL}'…")
                self._local_model = SentenceTransformer(LOCAL_EMBED_MODEL)
        else:
            if not all_keys:
                raise RuntimeError("No GEMINI_API_KEY found. Copy .env.example → .env")

            for api_key in all_keys:
                for api_version, model in _EMBED_CANDIDATES:
                    try:
                        client = genai.Client(
                            api_key=api_key,
                            http_options={"api_version": api_version},
                        )
                        client.models.embed_content(model=model, contents="test")
                        self._gemini      = client
                        self._embed_model = model
                        break
                    except Exception:
                        continue
                if self._gemini:
                    break

            if not self._gemini:
                raise RuntimeError(
                    "No working Gemini embedding model found.\n"
                    "Run  python diagnose.py  for details."
                )

        # ── 2. Gemini generation (fallback) ─────────────────────────────────────
        # Independent of embed backend — Gemini can still serve as the
        # generation fallback (behind Groq) even when embeddings are local.
        if self._gemini is None and all_keys:
            for api_key in all_keys:
                for api_version, model in _EMBED_CANDIDATES:
                    try:
                        self._gemini = genai.Client(
                            api_key=api_key,
                            http_options={"api_version": api_version},
                        )
                        break
                    except Exception:
                        continue
                if self._gemini:
                    break

        if self._gemini:
            # Discover Gemini generation models (no test call — avoids quota waste)
            try:
                listed = {m.name.replace("models/", "") for m in self._gemini.models.list()}
                self._gemini_gen = [m for m in _GEMINI_GEN_PRIORITY if m in listed]
                for name in listed:
                    if (name not in self._gemini_gen
                            and "gemini" in name
                            and "embed" not in name
                            and "imagen" not in name
                            and "image" not in name):
                        self._gemini_gen.append(name)
            except Exception:
                self._gemini_gen = list(_GEMINI_GEN_PRIORITY)
        else:
            self._gemini_gen = []

        # ── 2. Groq (primary generation) ──────────────────────────────────────
        self._groq = None
        groq_key = os.getenv("GROQ_API_KEY", "").strip()
        if groq_key:
            try:
                from groq import Groq as GroqClient
                self._groq = GroqClient(api_key=groq_key)
                # Smoke-test against the fallback list itself, not one
                # hardcoded model — a single retired/renamed model must not
                # disable Groq entirely if another model in GROQ_MODELS works.
                smoke_errors = []
                for model in GROQ_MODELS:
                    try:
                        self._groq.chat.completions.create(
                            model=model,
                            messages=[{"role": "user", "content": "hi"}],
                            max_tokens=3,
                        )
                        break
                    except Exception as model_exc:
                        smoke_errors.append(f"{model}: {model_exc}")
                else:
                    raise RuntimeError("; ".join(smoke_errors))
                print("  ✅ Groq connected (primary generation)")
            except ImportError:
                print("  ⚠️  groq package not installed — run: pip install groq")
                self._groq = None
            except Exception as e:
                print(f"  ⚠️  Groq unavailable ({e}) — will use Gemini for generation")
                self._groq = None
        else:
            print("  ℹ️  No GROQ_API_KEY — add one from console.groq.com for faster chat")

        # ── 3. Vector DB ───────────────────────────────────────────────────────
        collection_name = COLLECTION_LOCAL if self.embed_backend == "local" else COLLECTION
        _db = chromadb.PersistentClient(path=DB_PATH)
        self._coll = _db.get_collection(collection_name)

        gen_src    = "Groq" if self._groq else ("Gemini" if self._gemini else "none")
        embed_name = LOCAL_EMBED_MODEL if self.embed_backend == "local" else self._embed_model
        print(
            f"✅  RAG ready  "
            f"(embed={embed_name}, gen={gen_src}, chunks={self._coll.count():,})"
        )

    # ── Public API ─────────────────────────────────────────────────────────────

    @property
    def chunk_count(self) -> int:
        return self._coll.count()

    def retrieve(self, query: str, k: int = TOP_K) -> list[dict]:
        """Embed the query and return the top-k most similar book chunks."""
        if self.embed_backend == "local":
            # BGE models expect this instruction prefix on queries; other
            # local models (e.g. MiniLM) weren't trained with it, so skip it.
            text = _LOCAL_QUERY_PREFIX + query if "bge" in LOCAL_EMBED_MODEL.lower() else query
            if LOCAL_EMBED_ENGINE == "fastembed":
                q_emb = list(self._local_model.embed([text]))[0].tolist()
            else:
                q_emb = self._local_model.encode(text, normalize_embeddings=True).tolist()
        else:
            result = self._gemini.models.embed_content(
                model=self._embed_model, contents=query
            )
            q_emb = result.embeddings[0].values

        res = self._coll.query(
            query_embeddings=[q_emb],
            n_results=k,
            include=["documents", "metadatas", "distances"],
        )
        return [
            {
                "text":       doc,
                "source":     meta.get("source", "Unknown"),
                "page":       meta.get("page", 0),
                "similarity": round(1.0 - dist, 3),
            }
            for doc, meta, dist in zip(
                res["documents"][0],
                res["metadatas"][0],
                res["distances"][0],
            )
        ]

    def stream_answer(
        self,
        query:   str,
        mode:    str,
        history: list[dict],
        chunks:  list[dict],
        topic:   str = "",
    ):
        """
        Generator — yields text tokens.

        Priority:
          1. Groq  — tries GROQ_MODELS in order, falls through on 429
          2. Gemini — tries _gemini_gen in order, falls through on 429
        """
        context  = self._format_context(chunks)
        # topic_quiz's "ask exactly one question, then stop" rule needs much
        # tighter instruction-following than free-form tutoring gets away
        # with — at 0.7 the model reliably front-loads a whole multi-question
        # script on the very first turn. Scoped to this mode only so the
        # existing system-design "quiz" mode's tone is untouched.
        temperature = 0.3 if mode == "topic_quiz" else 0.7

        # ── 1. Groq (proper chat messages format) ─────────────────────────────
        if self._groq:
            messages = self._build_groq_messages(query, mode, history, context, topic)
            groq_ok  = False

            for model in GROQ_MODELS:
                try:
                    stream = self._groq.chat.completions.create(
                        model=model,
                        messages=messages,
                        stream=True,
                        max_tokens=2048,
                        temperature=temperature,
                    )
                    for chunk in stream:
                        content = chunk.choices[0].delta.content
                        if content:
                            groq_ok = True
                            yield content

                    if groq_ok:
                        return                    # Groq succeeded ✓

                except Exception as exc:
                    err = str(exc)
                    _rate_keywords = [
                        "429", "rate_limit", "rate limit",
                        "model_not_active", "model_decommissioned",
                        "model_not_found", "model not found", "does not exist",
                    ]
                    if any(kw in err.lower() for kw in _rate_keywords):
                        continue                  # try next Groq model
                    # Non-quota error → report and stop
                    yield f"\n\n⚠️ **Groq error** ({model}): {exc}"
                    return

            # All Groq models rate-limited → fall through to Gemini

        # ── 2. Gemini fallback ────────────────────────────────────────────────
        prompt  = self._build_gemini_prompt(query, mode, history, context, topic)
        ordered = []
        if self._gen_model:
            ordered.append(self._gen_model)
        ordered += [m for m in self._gemini_gen if m != self._gen_model]

        for model in ordered:
            try:
                tokens_yielded = False
                for piece in self._gemini.models.generate_content_stream(
                    model=model, contents=prompt
                ):
                    if piece.text:
                        if not tokens_yielded:
                            self._gen_model = model   # cache working model
                        tokens_yielded = True
                        yield piece.text

                if tokens_yielded:
                    return

            except Exception as exc:
                err = str(exc)
                if "429" in err or "RESOURCE_EXHAUSTED" in err:
                    continue
                yield f"\n\n⚠️ **Gemini error** ({model}): {exc}"
                return

        # All options exhausted
        yield (
            "\n\n**All generation models are rate-limited.**\n\n"
            "- Groq: add/rotate API keys at https://console.groq.com\n"
            "- Gemini: quotas reset at midnight Pacific time\n"
        )

    # ── Private ────────────────────────────────────────────────────────────────

    @staticmethod
    def _format_context(chunks: list[dict]) -> str:
        return "\n\n---\n\n".join(
            f"[Source {i}: {c['source']} - Page {c['page']}]\n{c['text']}"
            for i, c in enumerate(chunks, 1)
        )

    @staticmethod
    def _build_groq_messages(
        query:   str,
        mode:    str,
        history: list[dict],
        context: str,
        topic:   str = "",
    ) -> list[dict]:
        """Build OpenAI-compatible messages list for Groq."""
        system = _PROMPTS.get(mode, _PROMPTS["study"])
        anchor = f"CURRENT TOPIC: {topic}\nStay focused on this topic for every question, follow-up, and debrief — do not drift to a different topic even if the reference context below mentions one.\n\n" if topic else ""

        messages = [
            {
                "role":    "system",
                "content": f"{system}\n\n{anchor}REFERENCE CONTEXT (top relevant sections):\n{context}",
            }
        ]

        # Last 8 turns of conversation history
        for m in history[-8:]:
            role    = "user" if m["role"] == "user" else "assistant"
            content = m["content"][:800] + "…" if len(m["content"]) > 800 else m["content"]
            messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": query})
        return messages

    @staticmethod
    def _build_gemini_prompt(
        query:   str,
        mode:    str,
        history: list[dict],
        context: str,
        topic:   str = "",
    ) -> str:
        """Build single-string prompt for Gemini (non-chat API)."""
        system = _PROMPTS.get(mode, _PROMPTS["study"])
        anchor = f"CURRENT TOPIC: {topic}\nStay focused on this topic for every question, follow-up, and debrief — do not drift to a different topic even if the reference context below mentions one.\n\n" if topic else ""
        hist   = ""
        if history:
            hist = "\n\nCONVERSATION HISTORY:\n"
            for m in history[-8:]:
                role    = "Student" if m["role"] == "user" else "Tutor"
                content = m["content"][:600] + "…" if len(m["content"]) > 600 else m["content"]
                hist   += f"{role}: {content}\n"
        return (
            f"{system}\n\n"
            f"{anchor}"
            f"REFERENCE CONTEXT:\n{context}"
            f"{hist}\n\n"
            f"Student: {query}\nTutor:"
        )
