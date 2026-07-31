"""
ingest_local.py — Builds the vector database using a local, open-source
embedding model (no API keys, no daily quota, no cost).

Writes to its own ChromaDB collection (config.COLLECTION_LOCAL) — never
mixed with the Gemini-embedded collection, since different embedding models
produce incompatible vector spaces.

Reuses the same extraction/chunking logic as ingest.py so both pipelines
see identical source content.
"""

import hashlib
import os
import sys

import chromadb
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

from config import (
    PDF_SOURCES, NOTES_FILE, DB_PATH, COLLECTION_LOCAL,
    CHUNK_SIZE, CHUNK_OVERLAP, LOCAL_EMBED_MODEL,
)
from ingest import extract_pdf, extract_notes, extract_github, make_chunks, GITHUB_CONTENT_DIR

BATCH_SIZE = 64


def main() -> None:
    db = chromadb.PersistentClient(path=DB_PATH)
    if COLLECTION_LOCAL in [c.name for c in db.list_collections()]:
        coll = db.get_collection(COLLECTION_LOCAL)
        print(f"✅  Local DB exists — {coll.count():,} chunks. "
              f"Delete the '{COLLECTION_LOCAL}' collection to re-ingest.\n")
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

    if not all_pages:
        print("\n❌  No content extracted."); sys.exit(1)

    print(f"\n  Total: {len(all_pages):,} source items")

    # ── Chunk ──────────────────────────────────────────────────────────────────
    print("\n✂️   Chunking…")
    texts, metas, ids = [], [], []
    for item in tqdm(all_pages, desc="  Chunking"):
        source = item["source"]
        prefix = source.replace(" ", "_").replace("–", "-").replace("/", "_")[:20]
        source_hash = hashlib.md5(source.encode("utf-8")).hexdigest()[:8]
        for j, chunk in enumerate(make_chunks(item["text"], CHUNK_SIZE, CHUNK_OVERLAP)):
            texts.append(chunk)
            metas.append({"source": source, "page": item["page"]})
            ids.append(f"{prefix}_{source_hash}_p{item['page']:04d}_c{j:03d}")
    print(f"  ✓  {len(texts):,} chunks total")

    # ── Embed (local model — no quota, no keys) ───────────────────────────────
    print(f"\n🔢  Loading local embedding model '{LOCAL_EMBED_MODEL}'…")
    model = SentenceTransformer(LOCAL_EMBED_MODEL)
    print(f"  ✓  dim={model.get_sentence_embedding_dimension()}\n")

    embeddings = model.encode(
        texts,
        batch_size=BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,
    ).tolist()

    # ── Store in ChromaDB ──────────────────────────────────────────────────────
    print("\n💾  Storing in ChromaDB…")
    coll = db.create_collection(
        COLLECTION_LOCAL,
        metadata={"hnsw:space": "cosine", "embed_model": LOCAL_EMBED_MODEL},
    )
    for i in tqdm(range(0, len(texts), 400), desc="  Writing"):
        coll.add(
            documents =texts     [i:i+400],
            embeddings=embeddings[i:i+400],
            metadatas =metas     [i:i+400],
            ids       =ids       [i:i+400],
        )

    print(f"\n🎉  {len(texts):,} chunks stored in ./db/ collection '{COLLECTION_LOCAL}' "
          f"(model: {LOCAL_EMBED_MODEL})")
    print("    ▶  set EMBED_BACKEND=local in .env, then  python server.py\n")


if __name__ == "__main__":
    main()
