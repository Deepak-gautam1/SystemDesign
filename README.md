# 🏗️ System Design Study Bot

A personal RAG-powered tutor built on **Alex Xu's System Design Interview books (Parts 1 & 2)**, your own notes, and three popular system-design GitHub repos.

---

## What it does

| Mode | How it works |
|---|---|
| 📖 **Study** | Ask anything → get grounded answers from the book |
| 🎯 **Quiz Me** | Simulates a real SD interview — Socratic follow-ups, final score + debrief |
| 🔬 **Deep Dive** | Full architecture walkthrough: diagrams, tradeoffs, scalability ladder |

All answers reference exact **sources and page numbers**.

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
  ├── retrieve top-K similar chunks from ChromaDB
  ├── generate: Groq (primary) → Gemini (fallback)
  └── stream response over SSE
       │
       ├── frontend/index.html   ← built-in UI, served by server.py at :8000
       └── sd-ui/                ← richer Next.js UI at :3000, proxies /api/* to :8000
```

`app.py` (Streamlit) is an earlier prototype kept for reference — it is **not** the active app; use `server.py`.

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
Fill in your keys. See `.env.example` for all supported variables, including `EMBED_BACKEND` (below).

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

### 6. Launch the backend
```bash
python server.py
```
Serves the API + built-in frontend at `http://localhost:8000`.

### 7. (Optional) Launch the richer frontend
```bash
cd sd-ui
npm install
npm run dev
```
Opens at `http://localhost:3000` and proxies all `/api/*` calls to `server.py` on port 8000 (both must be running).

---

## Usage tips

- **Study mode**: `"Explain consistent hashing"` / `"What's the tradeoff between push and pull CDN?"`
- **Quiz mode**: `"Quiz me on the rate limiter"` / `"Start"` (picks a random topic)
- **Deep Dive**: `"Deep dive on the news feed system"` / `"Walk me through YouTube's design"`
- Click any topic in the sidebar to instantly load it in the current mode
- Each response shows **source references** (book/repo + page number) with a similarity score

---

## File structure

```
SystemDesign/
├── server.py             ← FastAPI backend (the app to run)
├── rag.py                ← Retrieval + generation engine (Groq → Gemini, Gemini/local embeddings)
├── ingest.py              ← Gemini-embedding pipeline (resumable, multi-key)
├── ingest_local.py         ← Local-embedding pipeline (no keys/quota)
├── fetch_github.py        ← Downloads GitHub repo content into ./github_content/
├── config.py              ← Paths, model names, chunk settings, EMBED_BACKEND
├── diagnose.py            ← Checks which Gemini models/keys actually work
├── app.py                 ← Legacy Streamlit prototype (not the active app)
├── requirements.txt
├── .env.example
├── .env                   ← Your actual keys (NOT committed to git)
├── frontend/
│   └── index.html         ← Built-in single-file UI, served by server.py at :8000
├── sd-ui/                 ← Next.js frontend at :3000 (proxies to :8000)
│
├── System Design Interview by Alex Xu -PART1.pdf
├── system-design-interview-PART2.pdf
├── System Design Notes.txt
├── github_content/        ← JSON docs from fetch_github.py
│
├── db/                     ← ChromaDB data (Gemini + local collections), auto-created
└── embedding_cache.json    ← Resumable progress for ingest.py, auto-created
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

---

## Troubleshooting

**`No GEMINI_API_KEY found`**
→ Make sure `.env` exists (not `.env.example`) and has at least one key, OR set `EMBED_BACKEND=local` to skip Gemini for embeddings entirely.

**`Vector database not found` / RAG in degraded mode**
→ Run `python ingest.py` or `python ingest_local.py` to completion first.

**All API keys hit their daily quota during `ingest.py`**
→ Expected on the free tier (1,000/day/key). Progress is saved — just rerun `python ingest.py` after the reset. Add more `GEMINI_API_KEY_N` entries to `.env` to raise the daily ceiling, or switch to `python ingest_local.py` to remove the quota dependency entirely.

**PDF text extraction returns very little text**
→ Some pages are image-heavy/scanned (this repo's Part 2 PDF is fully scanned and gets skipped automatically). The surrounding extractable text is still used.

**Chat errors / no response**
→ Check the `server.py` terminal output. `/api/status` reports whether the RAG engine loaded and how many chunks are indexed.

---

## Free tier limits

| Provider / Model | Requests | Notes |
|---|---|---|
| Gemini `gemini-embedding-001` | 1,000/day per key | Add more keys to `.env` to raise this; rotates automatically |
| Groq (Llama 3.3/3.1, Mixtral) | 1,000–14,400 req/day | Primary chat generation, tried in priority order |
| Gemini generation (fallback) | Shares the embedding key's daily quota | Only used when Groq is rate-limited |
| Local embeddings (`ingest_local.py`) | Unlimited | Runs on your CPU, no external API involved |

For personal study use, you'll rarely hit the chat limits — embeddings are the only real quota bottleneck, and only during the one-time ingest.
