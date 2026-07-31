"""
ingest.py — Builds the vector database.

Features:
  • RESUMABLE   — crashes/quota hits save progress; rerun picks up exactly where it left off
  • MULTI-KEY   — add GEMINI_API_KEY_2, _3, etc. in .env for automatic key rotation
                  when one key's daily quota (1000/day) is exhausted
"""

import os, sys, time, re, json
import fitz
from pathlib import Path
from tqdm import tqdm
import chromadb
from google import genai
from dotenv import load_dotenv

from config import PDF_SOURCES, NOTES_FILE, DB_PATH, COLLECTION, CHUNK_SIZE, CHUNK_OVERLAP

load_dotenv()

GITHUB_CONTENT_DIR = Path(__file__).parent / "github_content"
CACHE_FILE         = Path(__file__).parent / "embedding_cache.json"
MAX_PAGE_CHARS     = 15_000

_EMBED_CANDIDATES = [
    ("v1",    "gemini-embedding-001"),
    ("v1",    "gemini-embedding-2"),
    ("v1beta", "gemini-embedding-001"),
    ("v1beta", "gemini-embedding-2"),
    ("v1",    "text-embedding-004"),
]

# ── Key manager ───────────────────────────────────────────────────────────────

class KeyManager:
    """
    Holds multiple Gemini clients (one per API key) and rotates to the next
    one automatically when a daily quota limit is hit.
    """

    def __init__(self) -> None:
        self._clients:  list[genai.Client] = []
        self._models:   list[str]          = []
        self._idx:      int                = 0   # currently active key index
        self._exhausted: set[int]          = set()

    # ── Init ──────────────────────────────────────────────────────────────────

    def setup(self) -> None:
        """Load all GEMINI_API_KEY* variables and create a tested client for each."""
        keys = self._load_keys()
        if not keys:
            print("❌  No GEMINI_API_KEY found in .env"); sys.exit(1)

        print(f"  Found {len(keys)} API key(s)")
        for i, key in enumerate(keys):
            label = "primary" if i == 0 else f"key #{i+1}"
            client, model = self._connect(key, label)
            if client:
                self._clients.append(client)
                self._models.append(model)

        if not self._clients:
            print("❌  No key could connect to the Gemini embedding API."); sys.exit(1)

        print(f"✅  {len(self._clients)} key(s) ready  "
              f"(active: key #1, model: {self._models[0]})\n")

    @staticmethod
    def _load_keys() -> list[str]:
        """Load GEMINI_API_KEY, GEMINI_API_KEY_1 … _9, GEMINI_API_KEY1 … 9 (any naming)."""
        keys, seen = [], set()
        candidates = (
            ["GEMINI_API_KEY"]
            + [f"GEMINI_API_KEY_{n}" for n in range(1, 10)]
            + [f"GEMINI_API_KEY{n}"  for n in range(1, 10)]
        )
        for name in candidates:
            v = os.getenv(name, "").strip()
            if v and v not in seen:
                keys.append(v)
                seen.add(v)
        return keys

    @staticmethod
    def _connect(api_key: str, label: str) -> tuple[genai.Client | None, str]:
        """Try to connect a single key and return (client, model) or (None, '')."""
        masked = api_key[:6] + "…" + api_key[-4:]
        for api_version, model in _EMBED_CANDIDATES:
            try:
                c = genai.Client(api_key=api_key,
                                 http_options={"api_version": api_version})
                c.models.embed_content(model=model, contents="test")
                print(f"  ✓  {label} ({masked})  api={api_version}  model={model}")
                return c, model
            except Exception:
                continue
        print(f"  ✗  {label} ({masked})  — could not connect, skipping")
        return None, ""

    # ── Embedding ─────────────────────────────────────────────────────────────

    @property
    def active_client(self) -> genai.Client:
        return self._clients[self._idx]

    @property
    def active_model(self) -> str:
        return self._models[self._idx]

    def embed(self, text: str) -> list[float]:
        """
        Embed text using the active key.
        On daily quota exhaustion → rotate to next key and retry.
        On per-minute rate limit  → respect the retry-delay and retry in place.
        Raises RuntimeError if all keys are daily-exhausted.
        """
        attempts = 0
        while True:
            attempts += 1
            if attempts > 20:
                raise RuntimeError("Too many embedding retries — giving up.")
            try:
                result = self.active_client.models.embed_content(
                    model=self.active_model, contents=text
                )
                return result.embeddings[0].values

            except Exception as exc:
                err = str(exc)

                if "429" not in err and "RESOURCE_EXHAUSTED" not in err:
                    raise  # Not a quota error — propagate immediately

                if self._is_daily_quota(err):
                    # This key's daily bucket is empty — try the next one
                    self._exhausted.add(self._idx)
                    rotated = self._rotate()
                    if not rotated:
                        raise RuntimeError(
                            "All API keys have hit their daily quota (1000/day).\n"
                            "Progress has been saved. Rerun after midnight Pacific "
                            "time (11 AM Kuwait) or add more keys to .env."
                        )
                else:
                    # Per-minute rate limit — parse the suggested delay and wait
                    delay = self._parse_retry_delay(err)
                    if delay and delay > 0:
                        time.sleep(delay + 1)
                    else:
                        time.sleep(5)

    def _rotate(self) -> bool:
        """Switch to the next non-exhausted key. Returns False if none left."""
        for i in range(len(self._clients)):
            if i not in self._exhausted:
                self._idx = i
                print(f"\n  🔄  Key #{self._idx + 1} was quota-exhausted — "
                      f"switched to key #{i + 1} ({self.active_model})")
                return True
        return False

    @staticmethod
    def _is_daily_quota(err: str) -> bool:
        """True if error is a DAILY limit, not just a per-minute spike."""
        return "PerDay" in err or "PerDayPer" in err

    @staticmethod
    def _parse_retry_delay(err: str) -> int | None:
        m = re.search(r'"retryDelay":\s*"(\d+)', err)
        return int(m.group(1)) if m else None


# ── Extraction ────────────────────────────────────────────────────────────────

def _page_text(page) -> str:
    text = page.get_text("text")
    if text and len(text.strip()) > 80:
        return text.strip()[:MAX_PAGE_CHARS]
    try:
        d = page.get_text("dict")
        parts = [s.get("text","") for b in d.get("blocks",[]) if b.get("type")==0
                 for l in b.get("lines",[]) for s in l.get("spans",[])]
        combined = " ".join(p for p in parts if p.strip())
        if len(combined) > 80: return combined[:MAX_PAGE_CHARS]
    except Exception: pass
    try:
        html = page.get_text("html")
        if html:
            plain = re.sub(r"<[^>]+>"," ",html)
            plain = re.sub(r"\s+"," ",plain).strip()
            if len(plain) > 80: return plain[:MAX_PAGE_CHARS]
    except Exception: pass
    return ""


def extract_pdf(path: str, label: str) -> list[dict]:
    pages = []
    doc = fitz.open(path)
    for i, pg in enumerate(tqdm(doc, desc=f"  {label} [pymupdf]", unit="pg"), 1):
        t = _page_text(pg)
        if t: pages.append({"text": t, "page": i, "source": label})
    doc.close()
    if pages: return pages

    print("  ⚠️  PyMuPDF 0 pages — trying pdfplumber…")
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            for i, pg in enumerate(tqdm(pdf.pages, desc=f"  {label} [pdfplumber]", unit="pg"), 1):
                try:
                    t = pg.extract_text()
                    if t and len(t.strip()) > 80:
                        pages.append({"text": t.strip()[:MAX_PAGE_CHARS], "page": i, "source": label})
                except Exception: continue
    except Exception: pass
    if not pages:
        print(f"  ⚠️  '{label}' appears image/scanned — skipping")
    return pages


def extract_notes(path: str) -> list[dict]:
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        raw = f.read()
    secs = [s.strip() for s in raw.split("\n\n") if len(s.strip()) > 80]
    return [{"text": s[:MAX_PAGE_CHARS], "page": i+1, "source": "Study Notes"}
            for i, s in enumerate(secs)]


def extract_github(d: Path) -> list[dict]:
    docs = []
    if not d.exists(): return docs
    for jf in d.glob("*.json"):
        try:
            with open(jf, encoding="utf-8") as f:
                items = json.load(f)
            for item in items:
                t = item.get("text","").strip()
                if len(t) >= 200:
                    docs.append({"text": t[:MAX_PAGE_CHARS],
                                 "page": item.get("page",1),
                                 "source": item.get("source", jf.stem)})
        except Exception: pass
    return docs


# ── Chunking ──────────────────────────────────────────────────────────────────

def make_chunks(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    text = text.strip()
    if not text: return []
    if len(text) <= size: return [text] if len(text) > 50 else []
    chunks, start = [], 0
    while start < len(text):
        end   = min(start + size, len(text))
        piece = text[start:end]
        if end < len(text):
            for sep in (".\n", ". ", "\n\n", "\n"):
                pos = piece.rfind(sep)
                if pos > size // 2:
                    piece = text[start : start + pos + len(sep)]
                    end   = start + len(piece)
                    break
        chunk_text = piece.strip()
        if len(chunk_text) > 50:
            chunks.append(chunk_text)
        if end >= len(text):
            break
        start = end - overlap
    return chunks


# ── Cache helpers ─────────────────────────────────────────────────────────────

def load_cache() -> dict:
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, encoding="utf-8") as f:
                data = json.load(f)
            print(f"  ♻️   Resuming: {len(data):,} chunks already embedded\n")
            return data
        except Exception as e:
            print(f"  ⚠️  Cache corrupt ({e}) — starting fresh")
    return {}


def save_cache(cache: dict) -> None:
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("\n🔑  Loading API keys…")
    km = KeyManager()
    km.setup()

    db = chromadb.PersistentClient(path=DB_PATH)
    if COLLECTION in [c.name for c in db.list_collections()]:
        coll = db.get_collection(COLLECTION)
        print(f"✅  DB exists — {coll.count():,} chunks. "
              f"Delete ./db/ + embedding_cache.json to re-ingest.\n")
        return

    # ── Extract ────────────────────────────────────────────────────────────────
    print("📚  Extracting all sources…")
    all_pages: list[dict] = []

    for label, path in PDF_SOURCES.items():
        if os.path.exists(path):
            pages = extract_pdf(path, label)
            all_pages.extend(pages)
            print(f"  ✓  {label}: {len(pages):,} pages")
        else:
            print(f"  ⚠️  PDF not found: {path}")

    if os.path.exists(NOTES_FILE):
        notes = extract_notes(NOTES_FILE)
        all_pages.extend(notes)
        print(f"  ✓  Study Notes: {len(notes)} sections")

    github_docs = extract_github(GITHUB_CONTENT_DIR)
    if github_docs:
        all_pages.extend(github_docs)
        print(f"  ✓  GitHub content: {len(github_docs)} documents")
    else:
        print("  ℹ️  No GitHub content. Run  python fetch_github.py  to add it.")

    if not all_pages:
        print("\n❌  No content extracted."); sys.exit(1)

    print(f"\n  Total: {len(all_pages):,} source items")

    # ── Chunk ──────────────────────────────────────────────────────────────────
    print("\n✂️   Chunking…")
    texts, metas, ids = [], [], []
    for item in tqdm(all_pages, desc="  Chunking"):
        for j, chunk in enumerate(make_chunks(item["text"])):
            prefix = item["source"].replace(" ","_").replace("–","-").replace("/","_")[:20]
            texts.append(chunk)
            metas.append({"source": item["source"], "page": item["page"]})
            ids.append(f"{prefix}_p{item['page']:04d}_c{j:03d}")
    print(f"  ✓  {len(texts):,} chunks total")

    # ── Embed (resumable + multi-key) ─────────────────────────────────────────
    cache = load_cache()
    remaining = [(i, t, id_) for i, (t, id_) in enumerate(zip(texts, ids))
                 if id_ not in cache]

    skipped = len(texts) - len(remaining)
    if skipped:
        print(f"  Skipping {skipped:,} already-cached chunks → {len(remaining):,} to embed\n")
    else:
        print(f"\n🔢  Embedding {len(remaining):,} chunks…\n")

    dim, failed = 3072, 0

    try:
        for i, (_, text, chunk_id) in enumerate(tqdm(remaining, desc="  Embedding")):
            emb = km.embed(text)
            if i == 0:
                dim = len(emb)
                print(f"\n  dim={dim}")
            cache[chunk_id] = emb

            # Save progress every 50 chunks
            if i % 50 == 49:
                save_cache(cache)

    except RuntimeError as exc:
        # All keys daily-exhausted
        save_cache(cache)
        done = len(cache)
        print(f"\n⚠️  {exc}")
        print(f"\n   Progress: {done:,} / {len(texts):,} chunks saved to {CACHE_FILE.name}")
        print(f"   Just rerun  python ingest.py  after the quota resets.")
        sys.exit(0)

    except KeyboardInterrupt:
        save_cache(cache)
        print(f"\n⚠️  Interrupted. {len(cache):,} chunks saved — rerun to continue.")
        sys.exit(0)

    # Final cache save
    save_cache(cache)

    # ── Store in ChromaDB ──────────────────────────────────────────────────────
    embeddings = [cache.get(id_, [0.0] * dim) for id_ in ids]

    print("\n💾  Storing in ChromaDB…")
    coll = db.create_collection(
        COLLECTION,
        metadata={"hnsw:space": "cosine", "embed_model": km.active_model}
    )
    for i in tqdm(range(0, len(texts), 400), desc="  Writing"):
        coll.add(
            documents =texts     [i:i+400],
            embeddings=embeddings[i:i+400],
            metadatas =metas     [i:i+400],
            ids       =ids       [i:i+400],
        )

    # Clean up cache — it's all in ChromaDB now
    if CACHE_FILE.exists():
        CACHE_FILE.unlink()
        print(f"  🗑  Cleaned up {CACHE_FILE.name}")

    print(f"\n🎉  {len(texts):,} chunks stored in ./db/  (model: {km.active_model})")
    print("    ▶  python server.py\n")


if __name__ == "__main__":
    main()
