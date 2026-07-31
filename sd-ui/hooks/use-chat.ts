"use client";
import { useState, useCallback, useRef } from "react";
import type { Message, Source } from "@/lib/types";
import { streamChat } from "@/lib/api";

export function useChat(mode: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const historyRef = useRef<Pick<Message, "role" | "content">[]>([]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    const userMsg: Message = { role: "user", content: text, sources: [] };
    setMessages(prev => [...prev, userMsg]);
    historyRef.current = [...historyRef.current, { role: "user", content: text }];

    // Placeholder assistant message
    setMessages(prev => [...prev, { role: "assistant", content: "", sources: [], streaming: true }]);
    setStreaming(true);

    let fullContent = "";
    let finalSources: Source[] = [];

    try {
      for await (const event of streamChat(text, mode, historyRef.current)) {
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
      historyRef.current = [...historyRef.current, { role: "assistant", content: fullContent }];
      setStreaming(false);
    }
  }, [mode, streaming]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    historyRef.current = [];
  }, []);

  return { messages, streaming, sendMessage, clearMessages };
}
