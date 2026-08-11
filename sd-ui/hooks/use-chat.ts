"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { Message, Source } from "@/lib/types";
import { streamChat } from "@/lib/api";
import { sessionKey, loadChatSession, saveChatSession, clearChatSession } from "@/lib/chat-storage";

export function useChat(mode: string, topicId: string, topicContext?: string) {
  const key = sessionKey(topicId, mode);
  const { status } = useSession();

  const [messages, setMessages]   = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const historyRef = useRef<Pick<Message, "role" | "content">[]>([]);

  // Which key the state currently reflects. Also gates the save effect below so
  // a not-yet-hydrated (empty) state can't overwrite a stored conversation.
  const hydratedKey = useRef<string | null>(null);

  // Load the conversation for this topic+mode: sessionStorage first (instant,
  // works for everyone), then — if signed in — overlay whatever's saved in
  // Postgres, since that's the durable cross-device copy. A guest, or a
  // signed-in user with nothing saved yet, just keeps the local copy.
  useEffect(() => {
    let cancelled = false;
    const stored = loadChatSession(key);
    historyRef.current = stored?.history ?? [];
    setMessages(stored?.messages ?? []);
    hydratedKey.current = key;

    if (status === "authenticated") {
      fetch(`/api/history?topicId=${encodeURIComponent(topicId)}&mode=${encodeURIComponent(mode)}`)
        .then(r => r.json())
        .then((data: { messages?: Message[] }) => {
          if (cancelled || !data.messages?.length) return;
          setMessages(data.messages);
          historyRef.current = data.messages.map(m => ({ role: m.role, content: m.content }));
        })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [key, status, topicId, mode]);

  // Persist at rest only — a half-streamed answer isn't worth saving, and this
  // keeps writes to once per completed exchange instead of once per token.
  useEffect(() => {
    if (streaming || hydratedKey.current !== key) return;
    saveChatSession(key, messages, historyRef.current);
  }, [messages, streaming, key]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text, sources: [] };
    setMessages(prev => [
      ...prev,
      userMsg,
      { role: "assistant", content: "", sources: [], streaming: true },
    ]);
    historyRef.current = [...historyRef.current, { role: "user", content: text }];
    setStreaming(true);

    let fullContent = "";
    let finalSources: Source[] = [];

    try {
      for await (const event of streamChat(text, mode, historyRef.current, topicContext, topicId)) {
        if (event.type === "token" && event.text) {
          fullContent += event.text;
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullContent };
            return msgs;
          });
        } else if (event.type === "sources" && event.data) {
          finalSources = event.data;
          setMessages(prev => {
            const msgs = [...prev];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], sources: finalSources };
            return msgs;
          });
        } else if (event.type === "error") {
          fullContent += `\n\n**Error:** ${event.message}`;
        }
      }
    } catch (err) {
      fullContent = `Connection error: ${err instanceof Error ? err.message : String(err)}`;
    } finally {
      historyRef.current = [...historyRef.current, { role: "assistant", content: fullContent }];
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content: fullContent,
          sources: finalSources,
          streaming: false,
        };
        return msgs;
      });
      setStreaming(false);   // flips the save effect back on, persisting the exchange
    }
  }, [mode, topicId, topicContext, streaming]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    clearChatSession(key);
  }, [key]);

  return { messages, streaming, sendMessage, clearMessages };
}
