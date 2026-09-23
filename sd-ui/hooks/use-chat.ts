"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import type { Message, Source } from "@/lib/types";
import { streamChat, deleteSavedHistory } from "@/lib/api";
import {
  sessionKey, loadChatSession, saveChatSession, clearChatSession,
  getAttemptId, setAttemptId, rotateAttemptId,
} from "@/lib/chat-storage";

export function useChat(mode: string, topicId: string, topicContext?: string) {
  const key = sessionKey(topicId, mode);
  const { status } = useSession();
  const signedIn = status === "authenticated";

  const [messages, setMessages]   = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const historyRef = useRef<Pick<Message, "role" | "content">[]>([]);
  const attemptRef = useRef<string>("");

  // Which key the state currently reflects. Also gates the save effect below so
  // a not-yet-hydrated (empty) state can't overwrite a stored conversation.
  const hydratedKey = useRef<string | null>(null);

  // What the load effect just handed to setMessages, until a render shows it.
  // hydratedKey alone isn't enough: the save effect runs in the same commit as
  // the load, while `messages` is still the pre-load value — [] on mount, or
  // the previous topic's thread on a switch — and would write that over the
  // conversation just loaded. React StrictMode's double-run in dev then reloads
  // the overwritten copy, so the chat was lost for real.
  const pendingLoad = useRef<Message[] | null>(null);

  // Load the conversation for this topic+mode: sessionStorage first (instant,
  // works for everyone), then — if signed in — overlay whatever's saved in
  // Postgres, which is the durable copy.
  //
  // If this browser already knows its attempt id we ask for that attempt, so a
  // cleared screen stays cleared. If it doesn't (fresh browser, new device, or
  // just signed back in) we send no attempt id and take the server's latest —
  // otherwise saved history would be invisible behind a brand-new attempt id.
  useEffect(() => {
    let cancelled = false;
    const stored = loadChatSession(key);
    historyRef.current = stored?.history ?? [];
    attemptRef.current = getAttemptId(key) ?? "";
    const loaded = stored?.messages ?? [];
    pendingLoad.current = loaded;
    setMessages(loaded);
    hydratedKey.current = key;

    if (status === "authenticated") {
      const asked = attemptRef.current;
      const qs = new URLSearchParams({ topicId, mode });
      if (asked) qs.set("attemptId", asked);

      fetch(`/api/history?${qs.toString()}`)
        .then(r => r.json())
        .then((data: { messages?: Message[]; attemptId?: string | null }) => {
          // Drop a late response if the view moved on or a new attempt started.
          if (cancelled || attemptRef.current !== asked) return;
          // Adopt the attempt the server actually loaded, so the next message
          // continues that thread rather than silently forking a new one.
          if (data.attemptId && data.attemptId !== attemptRef.current) {
            attemptRef.current = data.attemptId;
            setAttemptId(key, data.attemptId);
          }
          if (!data.messages?.length) return;
          pendingLoad.current = data.messages;   // a load too — saved once rendered
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
    if (pendingLoad.current && messages !== pendingLoad.current) return;  // stale, pre-load state
    pendingLoad.current = null;
    saveChatSession(key, messages, historyRef.current);
  }, [messages, streaming, key]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return;

    // Every saved thread is attempt-scoped; mint one if this is the first
    // message from a browser that hasn't been assigned an attempt yet.
    if (!attemptRef.current) attemptRef.current = rotateAttemptId(key);

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
      for await (const event of streamChat(
        text, mode, historyRef.current, topicContext, topicId, attemptRef.current
      )) {
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
  }, [mode, topicId, topicContext, streaming, key]);

  /**
   * Clear the screen and start a fresh attempt. Nothing is deleted server-side:
   * a new attempt id means the next message opens a new saved thread, leaving
   * the previous attempt intact in the database.
   */
  const clearScreen = useCallback(() => {
    if (streaming) return;
    setMessages([]);
    historyRef.current = [];
    clearChatSession(key);
    attemptRef.current = rotateAttemptId(key);
  }, [key, streaming]);

  /**
   * Permanently delete every saved attempt for this topic+mode, locally and in
   * the database. Irreversible.
   */
  const deleteEverything = useCallback(async () => {
    if (streaming) return 0;
    let deleted = 0;
    if (signedIn) {
      try { deleted = await deleteSavedHistory(topicId, mode); }
      catch { /* local clear still proceeds */ }
    }
    setMessages([]);
    historyRef.current = [];
    clearChatSession(key);
    attemptRef.current = rotateAttemptId(key);
    return deleted;
  }, [key, topicId, mode, signedIn, streaming]);

  return {
    messages, streaming, sendMessage,
    clearScreen, deleteEverything, signedIn,
    hasMessages: messages.length > 0,
  };
}
