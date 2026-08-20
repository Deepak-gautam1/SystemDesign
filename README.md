# 🏗️ archprep — Interview Prep Study Bot

A personal, RAG-powered interview prep platform covering **System Design, Object-Oriented Design, SQL, and Machine Learning**. System Design chat is grounded in Alex Xu's *System Design Interview* books (Parts 1 & 2), your own notes, and open-source system-design repos; OOD/SQL/ML are hand-written theory curricula with their own AI tutor.

---

## What's inside

| Section | Content | AI feature |
|---|---|---|
| 🏢 **System Design** | 22 topics, book-grounded | Study / Quiz / Deep Dive chat modes, full RAG over the books + notes |
| 🧩 **Object-Oriented Design** | 46 theory topics (8 categories) + 11 practice problems, C++ | Per-topic **Tutor** (Interview + Ask) · code-review practice |
| 🗄️ **SQL** | 40 theory topics (8 categories) + 24 practice problems, PostgreSQL | Per-topic **Tutor** (Interview + Ask) · code-review practice |
| 🧠 **Machine Learning** | 70 theory topics (15 categories), theory only | Per-topic **Tutor** (Interview + Ask), no coding |

Every theory topic across OOD/SQL/ML also gets: full-text **search**, **progress tracking** (mark done, per-category counters, All/To do/Done filters), and a general (not-topic-scoped) tutor covering the whole curriculum.

System Design chat answers reference exact **source + page number** with a similarity score. OOD/SQL/ML tutor answers can include real math (`\( \)`, `\[ \]`, `$$ $$` LaTeX), rendered with KaTeX rather than shown as raw text.

---

## Architecture

```
Sources
  Alex Xu PDFs + Study Notes + GitHub repos (fetch_github.py)
       │
       ▼
  ingest.py            ← Gemini embeddings (needs API keys, 1,000/day quota per key)
  ingest_local.py       ← local bge-base-en-v1.5 embeddings (no keys, no quota, slower CPU pass)
  │  extract → chunk (~900 chars, overlap) → embed → store in ChromaDB (./db/)
       │
       ▼
  server.py            ← FastAPI backend (run every time)
  ├── RAGEngine (rag.py): embed query (Gemini or local, matches EMBED_BACKEND)
  ├── POST /api/chat        → book-grounded System Design chat (retrieves from ChromaDB)
  ├── POST /api/topic-chat  → OOD/SQL/ML tutor — client supplies the topic's own
  │                            notes as context, no ChromaDB retrieval needed
  ├── POST /api/evaluate    → code-quality review for OOD/SQL practice problems
  ├── generate: Groq (primary) → Gemini (fallback)
  └── stream every response over SSE
       │
       ├── frontend/index.html   ← minimal built-in UI, System Design only, served by server.py at :8000
       └── sd-ui/                ← full Next.js app at :3000 — all four sections, auth, themes
```

`app.py` (Streamlit) is an earlier prototype kept for reference — it is **not** the active app; use `server.py` + `sd-ui`.

---

## Setup

### 1. Get API keys

| Key | Where | Needed for |
|---|---|---|
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey (free) | Gemini embeddings + generation fallback |
| `GROQ_API_KEY` | https://console.groq.com (free) | Primary chat generation (fast, generous limits) |

You can add multiple Gemini keys (`GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, …) — `ingest.py` and `rag.py` automatically rotate to the next one when a key's daily quota (1,000/day) is exhausted.

### 2. Create your `.env` file
```bash
copy .env.example .env
```
Fill in your keys. See `.env.example` for all supported variables, including `EMBED_BACKEND` (below). `.env` is loaded automatically by `config.py` on import — every entrypoint (`server.py`, `rag.py`, `ingest*.py`, `diagnose.py`) picks it up regardless of import order.

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. (Optional) Fetch GitHub content
```bash
python fetch_github.py
```
Downloads markdown from `donnemartin/system-design-primer`, `karanpratapsingh/system-design`, and `ByteByteGoHq/system-design-101` into `./github_content/`.

### 5. Build the vector database — pick ONE embedding backend

**Option A — Gemini (default)**
```bash
python ingest.py
```
- Free, but capped at 1,000 embeddings/day per key.
- **Fully resumable**: progress saves to `embedding_cache.json` every 50 chunks and on quota exhaustion. If both keys run out for the day, it exits cleanly — just rerun `python ingest.py` after the daily reset (midnight Pacific / ~11 AM Kuwait time).
- You only need to get it to complete once — after that, rerunning is a no-op (it detects the existing collection and returns immediately).

**Option B — Local model (no API keys, no quota)**
```bash
python ingest_local.py
```
- Uses `sentence-transformers` (`BAAI/bge-base-en-v1.5`, 768-dim) entirely on your machine.
- Slower per-chunk on CPU, but finishes in one run with no daily wait and no cost.
- Writes to a **separate** ChromaDB collection (`system_design_local`) — never mixed with the Gemini-embedded vectors, since different embedding models produce incompatible vector spaces.
- After it finishes, set `EMBED_BACKEND=local` in `.env` so `server.py` queries the local collection with the same local model at query time.

This step only feeds the **System Design** section — OOD/SQL/ML theory content is hand-written and ships in `sd-ui/lib/`, not ingested.

### 6. Launch the backend
```bash
python server.py
```
Serves the API + the minimal built-in frontend at `http://localhost:8000`. `/api/status` reports whether the RAG engine loaded and how many chunks are indexed.

### 7. Launch the full frontend (sd-ui)
```bash
cd sd-ui
npm install
npm run dev
```
Opens at `http://localhost:3000` and proxies all `/api/*` calls to `server.py` on port 8000 (both must be running). This is where System Design, OOD, SQL, and ML all live.

**Optional — sign-in and cross-device history**: copy `sd-ui/.env.local.example` to `sd-ui/.env.local` and fill in `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`AUTH_SECRET` (Google sign-in) and/or `DATABASE_URL` (Postgres, e.g. Supabase — persists System Design chat history across devices). With none of this set, the app works fully as a guest: chat lives in `sessionStorage` and theory progress lives in `localStorage`, neither leaves the browser.

---

## How each section works

### System Design — book-grounded chat
Three modes, switched from the header:

| Mode | Behavior |
|---|---|
| 📖 **Study** | Ask anything → grounded answer with sources |
| 🎯 **Quiz** | Socratic interviewer: one question, follow-ups, structured debrief after 3–4 exchanges |
| 🔬 **Deep Dive** | Full architecture walkthrough: ASCII diagram → tradeoffs → scalability ladder |

Every response retrieves the top-K most relevant chunks from ChromaDB first, then generates grounded in them — this is the only section backed by real retrieval.

### OOD / SQL / ML — theory + per-topic Tutor
Each theory topic has a **Tutor** with two modes (kept as separate transcripts, so switching mid-conversation doesn't lose either thread):

- **Interview** — Socratic: exactly one question per turn, never gives the answer directly, reacts to what you actually said, debriefs only after ≥3 answered questions. Enforced two ways — a tight system prompt, *and* a server-side guardrail that truncates the stream at the first `?` as defense-in-depth against the model front-loading multiple questions.
- **Ask** — free-form Q&A that answers directly, anchored to the current topic's own notes (no ChromaDB — the topic's markdown content is handed to the model as its only reference material).

A **general tutor** (the "Test Your Knowledge" button in each section header) runs the same two modes across the whole curriculum instead of one topic, using a compact category→title digest so it knows the full syllabus without the full text of every topic in context.

**Progress & search**: every grid has a search box (title *and* body text — press `/` to focus), an All/To do/Done filter, and a done/total progress bar with per-category counts. Progress is namespaced per section in `localStorage` (`ml:`, `sql:`, `ood:`), so resetting one section's progress never touches another's.

**Math rendering**: tutor answers render `\( ... \)`, `\[ ... \]`, and `$$ ... $$` as real math via KaTeX. A lone `$ ... $` is intentionally **not** treated as math — this app's own content discusses real dollar amounts ("$50/month"), and that delimiter would misfire on them constantly.

---

## File structure

```
SystemDesign/
├── server.py                  ← FastAPI backend (the app to run)
├── rag.py                     ← Retrieval + generation engine (Groq → Gemini, Gemini/local embeddings)
├── ingest.py                   ← Gemini-embedding pipeline (resumable, multi-key)
├── ingest_local.py              ← Local-embedding pipeline (no keys/quota)
├── fetch_github.py             ← Downloads GitHub repo content into ./github_content/
├── config.py                   ← Paths, model names, chunk settings, EMBED_BACKEND;
│                                   also loads .env and installs a UTF-8 console shim
│                                   (Windows' default cp1252 console can't print the
│                                   emoji in startup logs otherwise)
├── diagnose.py                 ← Checks which Gemini models/keys actually work
├── app.py                      ← Legacy Streamlit prototype (not the active app)
├── requirements.txt
├── .env.example
├── .env                        ← Your actual keys (NOT committed to git)
├── .gitattributes              ← Marks db/*.sqlite3, *.bin, *.pickle as binary -merge
├── scripts/
│   └── quiet-db-churn.sh       ← Silences db/chroma.sqlite3 showing as "modified" on
│                                   every run (see Git hygiene, below)
├── frontend/
│   └── index.html              ← Minimal built-in UI, System Design only, served by server.py at :8000
│
├── sd-ui/                      ← Full Next.js app at :3000 (proxies to :8000)
│   ├── .env.local.example      ← Optional Google OAuth + Postgres config, copy → .env.local
│   ├── app/                    ← Routes, layout, global styles (incl. KaTeX CSS import)
│   ├── components/
│   │   ├── chat/                ← System Design chat UI (message-bubble.tsx does math+markdown render)
│   │   ├── theory/               ← Shared across OOD/SQL/ML: theory-browser (search/progress/filters),
│   │   │                           theory-detail-shell (prose + code panel + Mark done + Tutor button),
│   │   │                           topic-tutor-chat (Interview/Ask modes)
│   │   ├── ood/ · sql/ · ml/     ← Thin per-section wrappers around the shared theory/ components
│   │   └── layout/               ← Header (auth, theme toggle), sidebar
│   ├── hooks/
│   │   └── use-theory-progress.ts ← Namespaced localStorage progress store, shared by all three sections
│   ├── lib/
│   │   ├── theory.ts · sql-theory.ts · ml-theory.ts  ← Category/topic definitions + aggregation
│   │   ├── render-markdown.ts    ← marked + KaTeX: extracts \( \)/\[ \]/$$ $$ before marked
│   │   │                            can mangle them, renders math, splices it back in
│   │   ├── auth.ts               ← NextAuth config (Google provider only)
│   │   └── db.ts                 ← Postgres chat-history persistence (no-op without DATABASE_URL)
│   └── package.json
│
├── System Design Interview by Alex Xu -PART1.pdf
├── system-design-interview-PART2.pdf
├── System Design Notes.txt
├── github_content/             ← JSON docs from fetch_github.py
│
├── db/                          ← ChromaDB data (Gemini + local collections), auto-created
└── embedding_cache.json         ← Resumable progress for ingest.py, auto-created
```

---

## Tuning

Edit `config.py` to adjust:

| Setting | Default | Effect |
|---|---|---|
| `CHUNK_SIZE` | 900 chars | Smaller = more precise retrieval |
| `CHUNK_OVERLAP` | 120 chars | More overlap = better context continuity |
| `TOP_K` | 6 | More chunks = richer context, slower |
| `EMBED_MODEL` | gemini-embedding-001 | Gemini embedding model |
| `LOCAL_EMBED_MODEL` | BAAI/bge-base-en-v1.5 | Local embedding model (used by `ingest_local.py`) |
| `EMBED_BACKEND` (env var) | gemini | Set to `local` in `.env` to query the local collection |

`GROQ_MODELS` in `server.py`/`rag.py` lists Groq models in priority order (currently `openai/gpt-oss-20b` → `openai/gpt-oss-120b`) — Groq periodically retires whole model families, so a model going away is a one-line fix there, not a rewrite.

---

## Git hygiene

`db/chroma.sqlite3` is **intentionally committed** — the deployed backend has no persistent volume, so the pre-built vector index has to ship inside the repo. But Chroma rewrites that file on every run, even a read-only query, so `git status` reports it as modified after simply starting the server.

Run this once per clone:
```bash
sh scripts/quiet-db-churn.sh
```
It sets `--skip-worktree` on `db/chroma.sqlite3` — still tracked, still deployed, just no longer reported as dirty by routine use. To commit a genuine re-ingest: `sh scripts/quiet-db-churn.sh --undo`, commit, then re-run the script (the flag lives in `.git/index`, not the repo, so it isn't cloned automatically).

---

## Troubleshooting

**`No GEMINI_API_KEY found`**
→ Make sure `.env` exists (not `.env.example`) and has at least one key, OR set `EMBED_BACKEND=local` to skip Gemini for embeddings entirely.

**`Vector database not found` / RAG in degraded mode**
→ Run `python ingest.py` or `python ingest_local.py` to completion first. This only affects System Design chat — OOD/SQL/ML theory pages don't need it.

**All API keys hit their daily quota during `ingest.py`**
→ Expected on the free tier (1,000/day/key). Progress is saved — just rerun `python ingest.py` after the reset. Add more `GEMINI_API_KEY_N` entries to `.env` to raise the daily ceiling, or switch to `python ingest_local.py` to remove the quota dependency entirely.

**PDF text extraction returns very little text**
→ Some pages are image-heavy/scanned (this repo's Part 2 PDF is fully scanned and gets skipped automatically). The surrounding extractable text is still used.

**Chat errors / no response**
→ Check the `server.py` terminal output. `/api/status` reports whether the RAG engine loaded and how many chunks are indexed.

**Equations show up as raw `\frac{}{}` / `\eta` / bare brackets**
→ Fixed as of the KaTeX integration in `sd-ui/lib/render-markdown.ts` — if you still see this, confirm you're running the `sd-ui` frontend (not `frontend/index.html`, which has no math rendering) and that `npm install` picked up the `katex` dependency.

**Sign-in button does nothing / `/api/auth/*` 500s**
→ `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`AUTH_SECRET` are unset — sign-in is fully optional, the app runs as guest without them. If you did set them, double-check the OAuth redirect URI in Google Cloud Console matches exactly (`http://localhost:3000/api/auth/callback/google` locally).

**Console crashes with `UnicodeEncodeError` on startup**
→ Should no longer happen — `config.py` re-wraps stdout/stderr as UTF-8 on import specifically so the emoji in the startup logs (`✅ ⚠️ 🔢`) don't crash a default Windows (cp1252) console. If you still hit this, you're likely running a script that doesn't `import config` before its first `print()`.

---

## Free tier limits

| Provider / Model | Requests | Notes |
|---|---|---|
| Gemini `gemini-embedding-001` | 1,000/day per key | Add more keys to `.env` to raise this; rotates automatically |
| Groq (`openai/gpt-oss-20b`/`120b`) | Generous free tier, varies by model | Primary chat + tutor generation, tried in priority order |
| Gemini generation (fallback) | Shares the embedding key's daily quota | Only used when Groq is rate-limited |
| Local embeddings (`ingest_local.py`) | Unlimited | Runs on your CPU, no external API involved |

For personal study use, you'll rarely hit the chat limits — embeddings are the only real quota bottleneck, and only during the one-time ingest for System Design.
