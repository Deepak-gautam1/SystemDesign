"""
app.py — System Design Study Bot (Streamlit UI)

Run with:
    streamlit run app.py
"""

import os
import chromadb
import streamlit as st
from dotenv import load_dotenv

from config import DB_PATH, COLLECTION
from rag import RAGEngine

load_dotenv()

# ─── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="SD Study Bot",
    page_icon="🏗️",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Blueprint / Engineering dark theme ───────────────────────────────────────
st.markdown("""
<style>
:root {
  --bg:           #080D18;
  --surface:      #0F1623;
  --surface-2:    #151D2E;
  --border:       #1E2D45;
  --accent:       #3B82F6;
  --accent-dim:   #1E3A5F;
  --accent-glow:  rgba(59,130,246,0.15);
  --green:        #10B981;
  --green-dim:    rgba(16,185,129,0.12);
  --text:         #CBD5E1;
  --text-strong:  #E2E8F0;
  --muted:        #475569;
  --user-border:  #3B82F6;
  --bot-border:   #10B981;
}
.stApp { background: var(--bg); color: var(--text); font-family: 'Inter', system-ui, sans-serif; }
.block-container { padding-top: 1.5rem !important; }
h1, h2, h3 { color: var(--text-strong); letter-spacing: -0.02em; }
a { color: var(--accent); }
section[data-testid="stSidebar"] {
  background: var(--surface);
  border-right: 1px solid var(--border);
}
[data-testid="stChatMessage"] { border-radius: 10px; padding: 0.1rem 0.2rem; margin-bottom: 0.4rem; }
[data-testid="stChatMessage"][aria-label*="user"] > div,
[data-testid="stChatMessage"]:has(div[data-testid="stChatMessageAvatarUser"]) > div {
  background: var(--accent-dim) !important;
  border-left: 3px solid var(--user-border) !important;
  border-radius: 8px;
}
[data-testid="stChatMessage"][aria-label*="assistant"] > div,
[data-testid="stChatMessage"]:has(div[data-testid="stChatMessageAvatarAssistant"]) > div {
  background: var(--green-dim) !important;
  border-left: 3px solid var(--bot-border) !important;
  border-radius: 8px;
}
[data-testid="stChatMessageContent"] p { font-size: 0.94rem; line-height: 1.75; color: var(--text); }
[data-testid="stChatMessageContent"] code {
  background: var(--surface-2); border: 1px solid var(--border);
  border-radius: 4px; padding: 0.05rem 0.35rem; font-size: 0.85em; color: #93C5FD;
}
[data-testid="stChatMessageContent"] pre {
  background: var(--surface-2) !important; border: 1px solid var(--border);
  border-radius: 6px; padding: 0.8rem 1rem;
}
[data-testid="stChatInput"] { border-top: 1px solid var(--border); background: var(--surface); }
[data-testid="stChatInput"] textarea {
  background: var(--surface-2) !important; color: var(--text-strong) !important;
  border: 1px solid var(--border) !important; border-radius: 8px !important;
}
[data-testid="stChatInput"] textarea:focus {
  border-color: var(--accent) !important; box-shadow: 0 0 0 2px var(--accent-glow) !important;
}
section[data-testid="stSidebar"] .stButton > button {
  background: var(--surface-2); color: var(--text); border: 1px solid var(--border);
  border-radius: 6px; font-size: 0.8rem; text-align: left; width: 100%;
  padding: 0.35rem 0.7rem; transition: background 0.15s, border-color 0.15s; margin-bottom: 2px;
}
section[data-testid="stSidebar"] .stButton > button:hover {
  background: var(--accent-dim); border-color: var(--accent); color: #fff;
}
[data-testid="stRadio"] label {
  background: var(--surface-2); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.35rem 0.8rem; font-size: 0.86rem; cursor: pointer; color: var(--text);
  transition: all 0.15s; display: block; margin-bottom: 3px;
}
[data-testid="stRadio"] label:has(input:checked) {
  background: var(--accent-dim); border-color: var(--accent); color: #fff;
}
[data-testid="stRadio"] > div { gap: 0 !important; }
.streamlit-expanderHeader { font-size: 0.78rem; color: var(--muted); background: transparent; }
.streamlit-expanderContent {
  background: var(--surface-2); border: 1px solid var(--border); border-radius: 0 0 6px 6px;
}
[data-testid="stInfoMessage"] {
  background: var(--accent-dim); border-left: 3px solid var(--accent); color: var(--text);
}
[data-testid="stMetricValue"] { color: var(--text-strong); font-size: 1.1rem; }
[data-testid="stMetricLabel"] { color: var(--muted); font-size: 0.72rem; }
hr { border: none; border-top: 1px solid var(--border); margin: 0.8rem 0; }
.stCaption, small { color: var(--muted); font-size: 0.78rem; }
.source-block {
  background: var(--surface); border: 1px solid var(--border); border-radius: 6px;
  padding: 0.6rem 0.8rem; font-family: 'Fira Code', 'Cascadia Code', monospace;
  font-size: 0.78rem; line-height: 1.6; color: var(--muted);
  white-space: pre-wrap; word-break: break-word; margin-top: 0.3rem;
}
</style>
""", unsafe_allow_html=True)


# ─── Constants ────────────────────────────────────────────────────────────────

MODES: dict[str, str] = {
    "📖  Study":     "study",
    "🎯  Quiz Me":   "quiz",
    "🔬  Deep Dive": "deep_dive",
}

# FIX: use single quotes inside the string to avoid " terminating the literal
WELCOMES: dict[str, str] = {
    "study": (
        "### 👋 Study Mode\n"
        "Ask me anything from Alex Xu's books — concepts, architectures, tradeoffs.\n\n"
        "I'll explain it clearly and reference the exact book section."
    ),
    "quiz": (
        "### 🎯 Quiz Mode — You're in the hot seat\n"
        "Type **'start'** or pick a topic from the sidebar and I'll open with a real "
        "interview question.\n\n"
        "I won't give you the answer — I'll make you earn it."
    ),
    "deep_dive": (
        "### 🔬 Deep Dive Mode\n"
        "Pick any system from the sidebar or ask me something like "
        "*'deep dive on the notification system'*.\n\n"
        "I'll walk you through the full architecture, components, and scalability path."
    ),
}

TOPICS: list[tuple[str, str]] = [
    ("URL Shortener",         "Explain the URL shortener design from the book."),
    ("Rate Limiter",          "How does the rate limiter design work? Cover all algorithms."),
    ("Consistent Hashing",    "Explain consistent hashing — what problem it solves and how."),
    ("Key-Value Store",       "Walk me through designing a distributed key-value store."),
    ("Unique ID Generator",   "How do you design a distributed unique ID generator?"),
    ("News Feed",             "How is a scalable news feed system designed?"),
    ("Chat System",           "What's the architecture of a chat system like WhatsApp?"),
    ("Notification System",   "How do push notification systems work at scale?"),
    ("Web Crawler",           "Design a distributed web crawler."),
    ("Search Autocomplete",   "How is type-ahead / autocomplete search implemented?"),
    ("YouTube / Video CDN",   "How does a video streaming platform like YouTube work?"),
    ("Google Drive",          "Design a cloud file storage system like Google Drive."),
    ("Database Sharding",     "Explain database sharding strategies and tradeoffs."),
    ("Proximity Service",     "How is a proximity / location-based service designed?"),
    ("Distributed Cache",     "How does a distributed cache like Redis/Memcached work?"),
    ("Payment System",        "Design a reliable distributed payment system."),
    ("Metrics Monitoring",    "How do large-scale metrics monitoring systems work?"),
    ("Message Queue",         "Design a distributed message queue system."),
]


# ─── DB / Engine init ─────────────────────────────────────────────────────────

def _check_db() -> bool:
    try:
        client = chromadb.PersistentClient(path=DB_PATH)
        return COLLECTION in [c.name for c in client.list_collections()]
    except Exception:
        return False


if not _check_db():
    st.error("Vector database not found — run the ingestion script first.")
    st.code("python ingest.py", language="bash")
    st.stop()


@st.cache_resource(show_spinner="Loading RAG engine…")
def load_rag() -> RAGEngine:
    return RAGEngine()


rag = load_rag()

# ─── Session state ────────────────────────────────────────────────────────────
if "messages"  not in st.session_state: st.session_state.messages  = []
if "mode"      not in st.session_state: st.session_state.mode      = "study"
if "pending"   not in st.session_state: st.session_state.pending   = None
if "msg_count" not in st.session_state: st.session_state.msg_count = 0


# ─── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("## 🏗️ SD Study Bot")
    st.caption("Alex Xu Books · Gemini Free Tier")
    st.divider()

    st.markdown("**Mode**")
    mode_label = st.radio(
        "_mode",
        list(MODES.keys()),
        index=list(MODES.values()).index(st.session_state.mode),
        label_visibility="collapsed",
    )
    new_mode = MODES[mode_label]
    if new_mode != st.session_state.mode:
        st.session_state.mode      = new_mode
        st.session_state.messages  = []
        st.session_state.msg_count = 0

    st.divider()
    st.markdown("**Quick Topics**")
    for label, base_prompt in TOPICS:
        if st.button(label, key=f"topic_{label}", use_container_width=True):
            mode = st.session_state.mode
            if mode == "quiz":
                prompt = f"Quiz me on: {label}"
            elif mode == "deep_dive":
                prompt = f"Deep dive on: {label}"
            else:
                prompt = base_prompt
            st.session_state.pending = prompt
            st.rerun()

    st.divider()
    c1, c2 = st.columns(2)
    c1.metric("Chunks", f"{rag.chunk_count:,}")
    c2.metric("Messages", st.session_state.msg_count)

    st.divider()
    if st.button("🗑️  New Chat", use_container_width=True, key="new_chat"):
        st.session_state.messages  = []
        st.session_state.msg_count = 0
        st.rerun()


# ─── Header ───────────────────────────────────────────────────────────────────
left, right = st.columns([5, 1])
left.markdown("# 🏗️ System Design Study Bot")
right.markdown(
    f"<div style='text-align:right;padding-top:1.3rem;font-size:0.82rem;"
    f"color:#475569'>Mode: <span style='color:#3B82F6;font-weight:600'>"
    f"{mode_label.strip()}</span></div>",
    unsafe_allow_html=True,
)

if not st.session_state.messages:
    st.info(WELCOMES[st.session_state.mode])


# ─── Chat history ─────────────────────────────────────────────────────────────
for msg in st.session_state.messages:
    with st.chat_message(msg["role"]):
        st.markdown(msg["content"])
        if msg["role"] == "assistant" and msg.get("sources"):
            srcs = msg["sources"]
            with st.expander(f"📚  {len(srcs)} book section(s) referenced"):
                for j, s in enumerate(srcs, 1):
                    col_a, col_b = st.columns([3, 1])
                    col_a.caption(f"**{s['source']}** — Page {s['page']}")
                    col_b.caption(f"relevance: `{s['similarity']:.2f}`")
                    st.markdown(
                        f"<div class='source-block'>"
                        f"{s['text'][:420] + '…' if len(s['text']) > 420 else s['text']}"
                        f"</div>",
                        unsafe_allow_html=True,
                    )
                    if j < len(srcs):
                        st.divider()


# ─── Input ────────────────────────────────────────────────────────────────────
user_input: str | None = st.session_state.pending
st.session_state.pending = None

typed = st.chat_input("Ask a question, request a quiz, or pick a topic…")
if typed:
    user_input = typed


# ─── Process ──────────────────────────────────────────────────────────────────
if user_input:
    with st.chat_message("user"):
        st.markdown(user_input)
    st.session_state.messages.append({"role": "user", "content": user_input})
    st.session_state.msg_count += 1

    with st.spinner("📖  Searching the book…"):
        try:
            chunks = rag.retrieve(user_input)
        except Exception as exc:
            st.error(f"Retrieval failed: {exc}")
            st.stop()

    with st.chat_message("assistant"):
        full_text: str = st.write_stream(
            rag.stream_answer(
                query   = user_input,
                mode    = st.session_state.mode,
                history = st.session_state.messages[:-1],
                chunks  = chunks,
            )
        )
        if chunks:
            with st.expander(f"📚  {len(chunks)} book section(s) referenced"):
                for j, s in enumerate(chunks, 1):
                    col_a, col_b = st.columns([3, 1])
                    col_a.caption(f"**{s['source']}** — Page {s['page']}")
                    col_b.caption(f"relevance: `{s['similarity']:.2f}`")
                    st.markdown(
                        f"<div class='source-block'>"
                        f"{s['text'][:420] + '…' if len(s['text']) > 420 else s['text']}"
                        f"</div>",
                        unsafe_allow_html=True,
                    )
                    if j < len(chunks):
                        st.divider()

    st.session_state.messages.append({
        "role":    "assistant",
        "content": full_text,
        "sources": chunks,
    })
    st.session_state.msg_count += 1
