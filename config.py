"""
config.py — Central configuration (updated with confirmed working models).

Also installs a UTF-8 console shim on import (see below). Every entrypoint
(server.py, rag.py, ingest*.py, diagnose.py) imports this module, so importing
it is enough to make their emoji log lines safe on a default Windows console.
"""
import os
import sys

# ── UTF-8 console shim ────────────────────────────────────────────────────────
# A default Windows console hands Python a cp1252 stdout, which cannot encode
# the emoji in our startup logs (✅ ⚠️ 🔢) — every such print() raises
# UnicodeEncodeError and takes the process down. That bit hardest under
# `uvicorn --reload`, where each reload spawns a fresh worker that dies on its
# first log line. Re-wrapping the streams in UTF-8 with errors="replace" fixes
# it without needing PYTHONUTF8=1 in the environment, and the replace policy
# means an exotic character in an exception message can never crash a log call.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[union-attr]
    except (AttributeError, OSError):
        # Not a real TextIOWrapper (pytest capture, some WSGI hosts) — those
        # are already UTF-8 or discard output, so there's nothing to fix.
        pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ── .env, loaded here rather than by each caller ──────────────────────────────
# Every setting below is read from the environment at import time, so .env has
# to be loaded before this module's body runs. Leaving that to the importer is
# an ordering trap: a caller whose `import config` happens to sit above its
# load_dotenv() silently gets the defaults instead (which is exactly how an
# EMBED_BACKEND=local install ends up querying the Gemini collection and
# reporting "collection does not exist"). Loading it here makes the module
# correct regardless of import order.
#
# Anchored to BASE_DIR, not the cwd, so launching from another directory still
# finds it. override=False keeps a real environment variable — how Railway and
# Render inject config — winning over the checked-in file.
from dotenv import load_dotenv  # noqa: E402 — must follow BASE_DIR

load_dotenv(os.path.join(BASE_DIR, ".env"), override=False)

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
