import type { Message } from "./types";

// Per-tab, per-browser-session chat cache — keyed by topic+mode so Study,
// Quiz, and Deep Dive each keep their own thread. Backed by sessionStorage,
// which the browser clears on its own when the tab/browser closes, so a
// "live" conversation survives topic/mode switching but never persists
// beyond the session.

const PREFIX = "sd_chat:";

interface StoredSession {
  messages: Message[];
  history:  Pick<Message, "role" | "content">[];
}

export function sessionKey(topicId: string, mode: string): string {
  return `${topicId}::${mode}`;
}

export function loadChatSession(key: string): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function saveChatSession(key: string, messages: Message[], history: StoredSession["history"]): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify({ messages, history }));
  } catch {}
}

export function clearChatSession(key: string): void {
  try {
    sessionStorage.removeItem(PREFIX + key);
  } catch {}
}
