import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { appendExchange } from "@/lib/db";

// Takes precedence over the catch-all proxy in next.config.mjs (which is a
// `fallback` rewrite, so every real route here wins) — letting this, and only
// this, chat path attach a verified identity to a saved conversation.
// /api/status and /api/evaluate have no route file, so they still fall through
// to the FastAPI backend untouched.
export const runtime = "nodejs";

const BACKEND = process.env.API_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { query, mode, history, topic, topicId } = body as {
    query: string; mode: string; history: unknown; topic?: string; topicId?: string;
  };

  // Never trust a client-supplied user id — this is the only identity that
  // ever gets written to the database, and it comes from a signature NextAuth
  // already verified. Falls back to "no session" if auth isn't configured yet
  // (missing AUTH_SECRET/Google credentials) so chat keeps working for guests.
  const userId = await auth().then(s => s?.user?.id).catch(() => undefined);

  const backendRes = await fetch(`${BACKEND}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ query, mode, history, topic: topic ?? "" }),
  });

  if (!backendRes.ok || !backendRes.body) {
    return new Response(backendRes.body, { status: backendRes.status });
  }

  const reader  = backendRes.body.getReader();
  const decoder = new TextDecoder();

  let fullText  = "";
  let sources: unknown = [];
  let sseBuffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        if (userId && topicId) {
          try {
            await appendExchange(userId, topicId, mode, query, fullText, sources);
          } catch (err) {
            console.error("chat history persist failed:", err);
          }
        }
        return;
      }

      controller.enqueue(value); // forward immediately — persistence never adds latency

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "token" && evt.text) fullText += evt.text;
          else if (evt.type === "sources" && evt.data) sources = evt.data;
        } catch { /* ignore malformed frame */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}
