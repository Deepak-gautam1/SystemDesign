"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Eraser, Mic, Square, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "@/components/chat/message-bubble";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { streamTopicChat } from "@/lib/api";
import type { Message } from "@/lib/types";

const QUICK_STARTERS = ["Start the interview", "Quiz me on this", "Explain it back to me first"];

interface MlQuizChatProps {
  /** "" runs a general interview across the whole syllabus instead of one topic. */
  topicTitle: string;
  topicContent: string;
  oneLiner?: string;
  onBack: () => void;
}

export function MlQuizChat({ topicTitle, topicContent, oneLiner, onBack }: MlQuizChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const taRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { setMessages([]); }, [topicTitle]);

  const applyInputText = (text: string) => {
    setInput(text);
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + "px";
    }
  };

  const { supported: micSupported, listening: micOn, error: micError, toggle: toggleMic } =
    useSpeechToText({ onTranscript: applyInputText });

  const effectiveTopic = topicTitle || "General ML Interview";

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    const history = messages.map(({ role, content }) => ({ role, content }));
    setMessages(prev => [...prev, { role: "user", content: text }, { role: "assistant", content: "", streaming: true }]);
    setStreaming(true);

    try {
      for await (const event of streamTopicChat(text, "ml_quiz", history, effectiveTopic, topicContent)) {
        if (event.type === "token" && event.text) {
          const tokenText = event.text;
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], content: next[next.length - 1].content + tokenText };
            return next;
          });
        } else if (event.type === "error") {
          const message = event.message ?? "Something went wrong.";
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], content: `⚠️ ${message}`, streaming: false };
            return next;
          });
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { ...next[next.length - 1], content: `⚠️ ${message}`, streaming: false };
        return next;
      });
    } finally {
      setMessages(prev => prev.map((m, i) => (i === prev.length - 1 ? { ...m, streaming: false } : m)));
      setStreaming(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    sendMessage(text);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-border bg-card">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs border border-border hover:border-border/80 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <ArrowLeft size={12} /> {topicTitle ? "Theory" : "Machine Learning"}
        </button>
        <div className="w-px h-4 bg-border" />
        <div className="w-6 h-6 rounded-md flex items-center justify-center border bg-pink-500/10 border-pink-500/25 shrink-0">
          <Brain size={13} className="text-pink-500" />
        </div>
        <span className="font-display font-semibold text-sm text-foreground truncate">{effectiveTopic}</span>

        <div className="ml-auto flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              disabled={streaming}
              title="Clear the screen and start over"
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Eraser size={12} />
              <span className="hidden lg:inline">Restart</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex gap-2.5 animate-slide-up">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-fuchsia-500/20 border-[1.5px] border-pink-500/30 flex items-center justify-center shrink-0 ring-2 ring-pink-500/10">
              <Brain size={14} className="text-pink-500" />
            </div>
            <div className="max-w-[min(85%,900px)]">
              <div className="rounded-xl rounded-tl-sm bg-card border border-border px-4 py-3 text-sm text-muted-foreground leading-relaxed">
                {topicTitle ? (
                  <>
                    Ready to test your understanding of <strong className="text-foreground font-semibold">{topicTitle}</strong>?
                    I&apos;ll ask like a real ML interviewer — no free answers, plain language, worked examples.
                    {oneLiner ? ` ${oneLiner}` : ""}
                  </>
                ) : (
                  <>
                    Ready for a general ML interview across the whole syllabus — evaluation metrics, bias-variance,
                    feature engineering, ensembles, neural networks, and more? I&apos;ll pick a question and go Socratic on it.
                  </>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {QUICK_STARTERS.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground hover:bg-pink-500/8 hover:border-pink-500/25 hover:text-pink-500 transition-all"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 py-3 border-t border-border bg-card">
        <div className={cn(
          "flex items-end gap-2 bg-muted/60 border rounded-xl px-3 py-2 transition-all",
          "focus-within:bg-background focus-within:border-pink-500/40"
        )}>
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={e => applyInputText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={micOn ? "Listening…" : "Answer, or ask a question…"}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground min-h-[22px] max-h-[120px] overflow-y-auto leading-relaxed"
          />

          {micSupported && (
            <button
              onClick={() => toggleMic(input)}
              title={micOn ? "Stop dictating" : "Dictate your answer"}
              aria-pressed={micOn}
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
                micOn
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 animate-pulse"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {micOn ? <Square size={12} fill="currentColor" /> : <Mic size={15} />}
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="w-8 h-8 rounded-lg bg-pink-500 text-white flex items-center justify-center shrink-0 transition-all hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
        <p className={cn(
          "text-center text-[10px] font-mono mt-1.5",
          micError ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
        )}>
          {micError ?? (micOn ? "Listening — tap the mic to stop" : "Enter to send · Shift+Enter for new line")}
        </p>
      </div>
    </div>
  );
}
