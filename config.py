"""
config.py — Central configuration (updated with confirmed working models).
"""
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

PDF_SOURCES = {
    "Part 1 – Alex Xu": os.path.join(BASE_DIR, "System Design Interview by Alex Xu -PART1.pdf"),
    "Part 2 – Alex Xu": os.path.join(BASE_DIR, "system-design-interview-PART2.pdf"),
}
NOTES_FILE = os.path.join(BASE_DIR, "System Design Notes.txt")

DB_PATH    = os.path.join(BASE_DIR, "db")
COLLECTION = "system_design"

CHUNK_SIZE    = 900
CHUNK_OVERLAP = 120

# Confirmed from model listing (diagnose.py output)
EMBED_MODEL = "gemini-embedding-001"   # 3072-dim, works on v1
CHAT_MODEL  = "gemini-2.0-flash"       # exists, 429 in diagnose = rate limit not missing

TOP_K = 6

# ── Local (open-source) embedding backend ──────────────────────────────────────
# Built by ingest_local.py into its own collection — never mixed with the
# Gemini-embedded vectors above (different model = different vector space).
#
# Overridable via env vars so a memory-constrained free-tier deploy (e.g.
# Render's 512MB cap) can use a smaller model/collection than the local dev
# setup, without touching your personal .env. Defaults = the best local
# option (bge-base) for your own use.
COLLECTION_LOCAL   = os.getenv("COLLECTION_LOCAL", "system_design_local")
LOCAL_EMBED_MODEL   = os.getenv("LOCAL_EMBED_MODEL", "BAAI/bge-base-en-v1.5")   # 768-dim, CPU-friendly, no API/quota

# Which library loads LOCAL_EMBED_MODEL:
#   "sentence-transformers" (default) — needs torch, floors around ~500MB RAM
#                                        just for the runtime. Fine locally.
#   "fastembed"                       — ONNX runtime, no torch, ~250MB total.
#                                        Used for memory-capped free hosting
#                                        (e.g. Render's 512MB limit).
LOCAL_EMBED_ENGINE = os.getenv("LOCAL_EMBED_ENGINE", "sentence-transformers").strip().lower()

# Which backend server.py's RAGEngine uses at query time.
# Override with EMBED_BACKEND=local in .env once ingest_local.py has run.
EMBED_BACKEND = os.getenv("EMBED_BACKEND", "gemini").strip().lower()
