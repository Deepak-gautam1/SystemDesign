"""
fetch_github.py — Download markdown content from top system design GitHub repos.

Fetches:
  - donnemartin/system-design-primer  (~300k stars)
  - karanpratapsingh/system-design    (~44k stars)
  - ByteByteGoHq/system-design-101    (~86k stars)

No git required — uses GitHub's raw content URLs via the REST API.
Saves all content to  ./github_content/  then re-runs ingestion.

Usage:
    python fetch_github.py
    python fetch_github.py --ingest   # also rebuild the vector DB
"""

import os
import sys
import time
import json
import requests
from pathlib import Path
from tqdm import tqdm

REPOS = [
    {
        "owner": "donnemartin",
        "repo":  "system-design-primer",
        "label": "SD Primer",
        "branch": "master",
    },
    {
        "owner": "karanpratapsingh",
        "repo":  "system-design",
        "label": "SD Karan",
        "branch": "main",
    },
    {
        "owner": "ByteByteGoHq",
        "repo":  "system-design-101",
        "label": "SD ByteByteGo",
        "branch": "main",
    },
]

OUTPUT_DIR = Path(__file__).parent / "github_content"
SKIP_DIRS  = {".github", "node_modules", "images", "img", "assets", "static"}
MIN_CHARS  = 300   # skip tiny files


def github_headers(token: str | None = None) -> dict:
    h = {"Accept": "application/vnd.github.v3+json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return h


def list_md_files(owner: str, repo: str, branch: str, token: str | None) -> list[dict]:
    """Return all .md paths in a repo using the git tree API."""
    url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1"
    resp = requests.get(url, headers=github_headers(token), timeout=30)

    if resp.status_code == 403:
        print("  ⚠️  GitHub rate limit hit. Set GITHUB_TOKEN env var to get 5000 req/hr.")
        return []
    if resp.status_code != 200:
        print(f"  ⚠️  Could not list repo ({resp.status_code}): {resp.text[:200]}")
        return []

    tree = resp.json().get("tree", [])
    return [
        item for item in tree
        if item["type"] == "blob"
        and item["path"].endswith((".md", ".markdown"))
        and not any(skip in item["path"].split("/") for skip in SKIP_DIRS)
    ]


def fetch_raw(owner: str, repo: str, branch: str, path: str) -> str | None:
    url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
    resp = requests.get(url, timeout=15)
    return resp.text if resp.status_code == 200 else None


def process_repo(cfg: dict, token: str | None) -> list[dict]:
    owner, repo, label, branch = cfg["owner"], cfg["repo"], cfg["label"], cfg["branch"]
    print(f"\n  Fetching  {owner}/{repo}  …")

    files = list_md_files(owner, repo, branch, token)
    if not files:
        return []

    print(f"  Found {len(files)} markdown files")
    docs: list[dict] = []

    for item in tqdm(files, desc=f"  {label}", unit="file"):
        content = fetch_raw(owner, repo, branch, item["path"])
        if content and len(content.strip()) >= MIN_CHARS:
            docs.append({
                "text":   content.strip(),
                "source": f"{label} ({item['path']})",
                "page":   1,
                "path":   item["path"],
            })
        time.sleep(0.05)    # be polite to GitHub

    return docs


def save(docs: list[dict], label: str) -> None:
    out_path = OUTPUT_DIR / f"{label.replace(' ', '_').lower()}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(docs, f, ensure_ascii=False, indent=2)
    print(f"  ✓  Saved {len(docs)} docs → {out_path.name}")


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    token = os.getenv("GITHUB_TOKEN")   # optional but recommended
    if not token:
        print("ℹ️  No GITHUB_TOKEN set — unauthenticated (60 req/hr limit).")
        print("   For large repos, set GITHUB_TOKEN in .env to avoid rate limits.\n")

    total = 0
    for cfg in REPOS:
        docs = process_repo(cfg, token)
        if docs:
            save(docs, cfg["label"])
            total += len(docs)

    print(f"\n✅  Fetched {total} total documents into  ./github_content/")

    if "--ingest" in sys.argv:
        print("\n▶  Re-running ingest with GitHub content included…\n")
        # Delete existing DB so ingest runs fresh
        import shutil
        db_path = Path(__file__).parent / "db"
        if db_path.exists():
            shutil.rmtree(db_path)
            print("  Cleared ./db/  for fresh ingest")
        os.system("python ingest.py")
    else:
        print("\n   To rebuild the vector DB with this content, run:")
        print("   python fetch_github.py --ingest")


if __name__ == "__main__":
    main()
