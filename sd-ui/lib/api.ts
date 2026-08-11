import type { ApiStatus, ChatEvent, Message } from "./types";

const API_BASE =
  typeof window !== "undefined"
    ? ""
    : process.env.API_URL || "http://localhost:8000";

export async function fetchStatus(): Promise<ApiStatus> {
  const res = await fetch(`${API_BASE}/api/status`, { cache: "no-store" });
  if (!res.ok) throw new Error("Status fetch failed");
  return res.json();
}

// ── Shared SSE reader ──────────────────────────────────────────────────────

async function* readSSE(res: Response): AsyncGenerator<ChatEvent> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let   buffer  = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try { yield JSON.parse(line.slice(6)) as ChatEvent; } catch { /* skip */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ── Chat ──────────────────────────────────────────────────────────────────

export async function* streamChat(
  query:   string,
  mode:    string,
  history: Pick<Message, "role" | "content">[],
  topic?:  string,
  topicId?: string
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ query, mode, history, topic: topic ?? "", topicId: topicId ?? "" }),
  });
  yield* readSSE(res);
}

// ── Code evaluation ───────────────────────────────────────────────────────

export async function* evaluateCode(params: {
  studentCode:        string;
  problemTitle:       string;
  referenceCode:      string;
  problemDescription?: string;
}): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${API_BASE}/api/evaluate`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      student_code:        params.studentCode,
      problem_title:       params.problemTitle,
      reference_code:      params.referenceCode,
      problem_description: params.problemDescription ?? "",
    }),
  });
  yield* readSSE(res);
}
