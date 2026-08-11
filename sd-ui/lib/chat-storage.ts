import type { Message } from "./types";

// Per-tab, per-browser-session chat cache — keyed by topic+mode so Study,
// Quiz, and Deep Dive each keep their own thread. Backed by sessionStorage,
// which the browser clears on its own when the tab/browser closes, so a
// "live" conversation survives topic/mode switching but never persists
// beyond the session.

const PREFIX  = "sd_chat:";      // sessionStorage — transient message cache
const ATTEMPT = "sd_attempt:";   // localStorage  — which attempt we're on

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

// ── Attempt ids ───────────────────────────────────────────────────────────
//
// Each "attempt" at a topic+mode is a separate saved thread. Clearing the
// screen mints a fresh attempt id, so a retake starts a clean conversation
// server-side instead of appending onto the previous one — and the earlier
// attempt stays in the database rather than being overwritten.
//
// Deliberately localStorage, not sessionStorage: it has to outlive the tab.
// It also must NOT be auto-created — on a fresh browser or after signing back
// in, returning null is the signal for the server to fall back to "my latest
// attempt", which is what makes saved history reappear instead of showing blank.

function newAttemptId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `a${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  }
}

/** Attempt id this browser is currently on, or null if it has none yet. */
export function getAttemptId(key: string): string | null {
  try {
    return localStorage.getItem(ATTEMPT + key);
  } catch {
    return null;
  }
}

/** Remember the attempt the server told us we're on. */
export function setAttemptId(key: string, id: string): void {
  try {
    localStorage.setItem(ATTEMPT + key, id);
  } catch {}
}

/** Start a new attempt and return its id. */
export function rotateAttemptId(key: string): string {
  const id = newAttemptId();
  setAttemptId(key, id);
  return id;
}
