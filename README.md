# 🏗️ System Design Study Bot

A personal RAG-powered tutor built on **Alex Xu's System Design Interview books (Parts 1 & 2)** + your own notes.  
Uses **Gemini free-tier** for both embeddings and chat — zero cost.

---

## What it does

| Mode | How it works |
|---|---|
| 📖 **Study** | Ask anything → get grounded answers from the book |
| 🎯 **Quiz Me** | Simulates a real SD interview — Socratic follow-ups, final score + debrief |
| 🔬 **Deep Dive** | Full architecture walkthrough: diagrams, tradeoffs, scalability ladder |

All answers reference exact **page numbers** from the books.

---

## Architecture

```
Your PDFs + Notes
       │
       ▼
  ingest.py         ← run once
  ├── extract text (PyMuPDF)
  ├── chunk into ~900-char pieces with overlap
  ├── embed with Gemini text-embedding-004
  └── store in ChromaDB (./db/)
       │
       ▼
   app.py           ← run every time
  ├── embed user query
  ├── retrieve top-6 similar chunks from ChromaDB
  ├── inject chunks into Gemini 1.5 Flash prompt
  └── stream response → Streamlit chat UI
```

---

## Setup (5 steps)

### 1. Get a free Gemini API key
Go to → **https://aistudio.google.com/app/apikey**  
Create a key. It's free — no credit card needed.

### 2. Create your `.env` file
In the project folder, copy the template:
```bash
copy .env.example .env
```
Open `.env` and replace `your_api_key_here` with your real key:
```
GEMINI_API_KEY=AIza...your_actual_key...
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```
> If you get permission errors on Windows, try:
> `pip install -r requirements.txt --user`

### 4. Run the ingestion pipeline (ONCE)
```bash
python ingest.py
```
This will:
- Extract text from both PDFs (~600 pages total)
- Create overlapping chunks
- Embed everything with Gemini (free, ~10–20 min)
- Save to `./db/` (ChromaDB)

**You only need to run this once.** If you add new notes or want to re-process, delete the `./db/` folder and run again.

### 5. Launch the app
```bash
streamlit run app.py
```
Opens automatically at `http://localhost:8501`

---

## Usage tips

- **Study mode**: `"Explain consistent hashing"` / `"What's the tradeoff between push and pull CDN?"`
- **Quiz mode**: `"Quiz me on the rate limiter"` / `"Start"` (picks a random topic)
- **Deep Dive**: `"Deep dive on the news feed system"` / `"Walk me through YouTube's design"`
- Click any topic in the **sidebar** to instantly load it in the current mode
- Each response shows **source references** (book part + page number) — expand to see the exact chunk

---

## File structure

```
SystemDesign/
├── app.py               ← Streamlit chat UI
├── ingest.py            ← One-time PDF → vector DB pipeline
├── rag.py               ← Retrieval + Gemini generation engine
├── config.py            ← Paths, model names, chunk settings
├── requirements.txt     ← Python dependencies
├── .env.example         ← Template for your API key
├── .env                 ← Your actual key (NOT committed to git)
├── README.md            ← This file
│
├── System Design Interview by Alex Xu -PART1.pdf
├── system-design-interview-PART2.pdf
├── System Design Notes.txt
│
└── db/                  ← Auto-created by ingest.py (ChromaDB data)
```

---

## Tuning

Edit `config.py` to adjust:

| Setting | Default | Effect |
|---|---|---|
| `CHUNK_SIZE` | 900 chars | Smaller = more precise retrieval |
| `CHUNK_OVERLAP` | 120 chars | More overlap = better context continuity |
| `TOP_K` | 6 | More chunks = richer context, slower |
| `CHAT_MODEL` | gemini-1.5-flash | Swap to gemini-1.5-pro for deeper answers (lower rate limit) |

---

## Troubleshooting

**`GEMINI_API_KEY not found`**  
→ Make sure `.env` exists (not `.env.example`) and has your key.

**`Vector database not found`**  
→ Run `python ingest.py` first.

**`Rate limit error` during ingestion**  
→ The script auto-retries. If it keeps failing, wait 60 seconds and rerun — ChromaDB saves progress is NOT yet resumable in this version, so if it crashes mid-way, delete `./db/` and restart.

**PDF text extraction returns very little text**  
→ Some pages in the book are image-heavy (diagrams). This is expected — the surrounding text is still extracted and retrievable.

**Streamlit shows blank / no response**  
→ Check the terminal for errors. Usually a missing `.env` key or rate-limit hit.

---

## Free tier limits (Gemini)

| Model | Requests/min | Tokens/min | Requests/day |
|---|---|---|---|
| gemini-1.5-flash (chat) | 15 | 1,000,000 | 1,500 |
| text-embedding-004 | 1,500 | — | unlimited |

For personal study use, you'll never hit these limits during chat.
