"use client";
import { useState, useCallback, useRef } from "react";
import type { Message, Source } from "@/lib/types";
import { streamChat } from "@/lib/api";
import { sessionKey, loadChatSession, saveChatSession, clearChatSession } from "@/lib/chat-storage";

export function useChat(mode: string, topicId: string, topicContext?: string) {
  const key = sessionKey(topicId, mode);

  const [messages, setMessages] = useState<Message[]>(() => loadChatSession(key)?.messages ?? []);
  const [streaming, setStreaming] = useState(false);
  const historyRef = useRef<Pick<Message, "role" | "content">[]>(loadChatSession(key)?.history ?? []);

  // Swap to the session for the new topic/mode as soon as `key` changes —
  // done during render (React's sanctioned "reset state on prop change"
  // pattern) so effects never see a mismatched (new key, old messages) pair.
  const prevKeyRef = useRef(key);
  if (prevKeyRef.current !== key) {
    prevKeyRef.current = key;
    const stored = loadChatSession(key);
    setMessages(stored?.messages ?? []);
    historyRef.current = stored?.history ?? [];
  }

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text, sources: [] };
    setMessages(prev => {
      const next = [...prev, userMsg, { role: "assistant" as const, content: "", sources: [], streaming: true }];
      saveChatSession(key, next.slice(0, -1), historyRef.current); // save up to the user turn now
      return next;
    });
    historyRef.current = [...historyRef.current, { role: "user", content: text }];
    setStreaming(true);

    let fullContent = "";
    let finalSources: Source[] = [];

    try {
      for await (const event of streamChat(text, mode, historyRef.current, topicContext)) {
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
        saveChatSession(key, msgs, historyRef.current);
        return msgs;
      });
      setStreaming(false);
    }
  }, [mode, topicContext, key, streaming]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
    clearChatSession(key);
  }, [key]);

  return { messages, streaming, sendMessage, clearMessages };
}
