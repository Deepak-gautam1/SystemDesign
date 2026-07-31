"""
diagnose.py — Full API connectivity check.
Auto-reads available models and tests the ones that actually exist.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# ── 1. .env check ─────────────────────────────────────────────────────────────
print("=" * 60)
print(" Step 1 — .env file check")
print("=" * 60)

env_path = Path(__file__).parent / ".env"
if not env_path.exists():
    print(f"❌  .env NOT found. Copy .env.example → .env and add your key.")
    sys.exit(1)

load_dotenv(dotenv_path=env_path)
api_key = os.getenv("GEMINI_API_KEY", "")
if not api_key:
    print("❌  GEMINI_API_KEY is empty in .env")
    sys.exit(1)

masked = api_key[:6] + "*" * (len(api_key) - 10) + api_key[-4:]
print(f"✅  Key found: {masked}  (length: {len(api_key)})")

# ── 2. List ALL available models ──────────────────────────────────────────────
print("\n" + "=" * 60)
print(" Step 2 — List all available models")
print("=" * 60)

from google import genai

client = genai.Client(api_key=api_key, http_options={"api_version": "v1"})

try:
    all_models = list(client.models.list())
    print(f"\nFound {len(all_models)} models:\n")
    for m in all_models:
        print(f"  {m.name}")
except Exception as e:
    print(f"❌  Could not list models: {e}")
    sys.exit(1)

# ── 3. Test embedding models from the actual listing ─────────────────────────
print("\n" + "=" * 60)
print(" Step 3 — Test embedding models (using names from listing above)")
print("=" * 60)

embed_candidates = [
    m.name.replace("models/", "")   # SDK adds "models/" prefix itself
    for m in all_models
    if "embed" in m.name.lower()
]
print(f"\nEmbedding models to test: {embed_candidates}\n")

working_embed = []
for model in embed_candidates:
    for api_ver in ("v1", "v1beta"):
        c = genai.Client(api_key=api_key, http_options={"api_version": api_ver})
        try:
            r = c.models.embed_content(model=model, contents="hello world")
            dim = len(r.embeddings[0].values)
            print(f"  ✅  [{api_ver}] {model:<40} → {dim}-dim")
            working_embed.append((api_ver, model, dim))
            break
        except Exception as e:
            print(f"  ❌  [{api_ver}] {model:<40} → {str(e)[:70]}")

# ── 4. Test generation models ─────────────────────────────────────────────────
print("\n" + "=" * 60)
print(" Step 4 — Test generation (chat) models")
print("=" * 60)

gen_candidates = [
    m.name.replace("models/", "")
    for m in all_models
    if "gemini" in m.name.lower() and "embed" not in m.name.lower()
][:6]   # test first 6 only

working_gen = []
for model in gen_candidates:
    for api_ver in ("v1", "v1beta"):
        c = genai.Client(api_key=api_key, http_options={"api_version": api_ver})
        try:
            r = c.models.generate_content(model=model, contents="Reply: OK")
            print(f"  ✅  [{api_ver}] {model}")
            working_gen.append((api_ver, model))
            break
        except Exception as e:
            print(f"  ❌  [{api_ver}] {model:<40} → {str(e)[:70]}")

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print(" Summary — copy these into config.py")
print("=" * 60)

if working_embed:
    e = working_embed[0]
    print(f'\n  EMBED_MODEL = "{e[1]}"')
else:
    print("\n  ❌  No working embed model found")

if working_gen:
    g = working_gen[0]
    print(f'  CHAT_MODEL  = "{g[1]}"')
else:
    print("  ❌  No working generation model found")
