"use client";
import { useEffect, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { ArrowLeft, CheckCircle2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { useChat } from "@/hooks/use-chat";
import type { Topic, Category, Mode } from "@/lib/types";

function LucideIcon({ name, size = 15, className }: { name: string; size?: number; className?: string }) {
  const I = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  return I ? <I size={size} className={className} /> : null;
}

const MODE_LABELS: Record<Mode, string> = { study: "Study", quiz: "Quiz", deep_dive: "Deep Dive" };
const MODE_CLASSES: Record<Mode, string> = {
  study:     "mode-study",
  quiz:      "mode-quiz",
  deep_dive: "mode-deep",
};

const QUICK_STARTERS: Record<Mode, string[]> = {
  study:     ["Explain the basics", "Show the architecture", "Key tradeoffs?"],
  quiz:      ["Start the interview", "Quiz me on tradeoffs", "Ask about scalability"],
  deep_dive: ["Full architecture walkthrough", "What breaks at 10× load?", "Compare design approaches"],
};

interface ChatInterfaceProps {
  topic: Topic;
  category: Category;
  mode: Mode;
  onBack: () => void;
  onMarkDone: (id: string) => void;
  isDone: boolean;
}

export function ChatInterface({ topic, category, mode, onBack, onMarkDone, isDone }: ChatInterfaceProps) {
  const topicContext = `${topic.label}: ${topic.desc}. ${topic.prompt}`;
  const { messages, streaming, sendMessage, clearMessages } = useChat(mode, topicContext);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const taRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { clearMessages(); }, [topic.id, mode, clearMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || streaming) return;
    sendMessage(text);
    setInput("");
    if (taRef.current) { taRef.current.style.height = "auto"; }
  };

  const INTRO: Record<Mode, string> = {
    study:     `I'll explain **${topic.label}** clearly, drawing from Alex Xu's books and the GitHub knowledge base.\n\n${topic.desc}`,
    quiz:      `Ready to test your understanding of **${topic.label}**? I'll ask like a real system design interviewer — no free answers.`,
    deep_dive: `Let's go deep on **${topic.label}**. I'll walk through the full architecture, components, tradeoffs, and scalability path.`,
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Topic bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-border bg-card">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs border border-border hover:border-border/80 rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <ArrowLeft size={12} /> Topics
        </button>
        <div className="w-px h-4 bg-border" />

        {/* Topic icon + name */}
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border", category.bg, category.border)}>
          <LucideIcon name={topic.icon} size={13} className={category.color} />
        </div>
        <span className="font-display font-semibold text-sm text-foreground">{topic.label}</span>
        <span className={cn(
          "text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold",
          topic.difficulty === "easy"   ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : topic.difficulty === "medium" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
        )}>
          {topic.difficulty}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className={cn("text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full border", MODE_CLASSES[mode])}>
            {MODE_LABELS[mode]}
          </span>
          <button
            data-tour="mark-done"
            onClick={() => onMarkDone(topic.id)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all",
              isDone
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                : "border-border text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/5"
            )}
          >
            <CheckCircle2 size={12} />
            {isDone ? "Done!" : "Mark done"}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-5 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex gap-2.5 animate-slide-up">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 border-[1.5px] border-primary/30 flex items-center justify-center shrink-0 ring-2 ring-primary/10">
              <Icons.Building2 size={14} className="text-primary" />
            </div>
            <div className="max-w-[min(85%,900px)]">
              <div className="rounded-xl rounded-tl-sm bg-card border border-border px-4 py-3 text-sm text-muted-foreground leading-relaxed">
                {INTRO[mode].split("**").map((part, i) =>
                  i % 2 === 1
                    ? <strong key={i} className="text-foreground font-semibold">{part}</strong>
                    : <span key={i}>{part}</span>
                )}
                <div data-tour="chat-quick-starters" className="flex flex-wrap gap-2 mt-3">
                  {QUICK_STARTERS[mode].map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground hover:bg-primary/8 hover:border-primary/25 hover:text-primary transition-all"
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
      <div data-tour="chat-input" className="shrink-0 px-4 py-3 border-t border-border bg-card">
        <div className={cn(
          "flex items-end gap-2 bg-muted/60 border rounded-xl px-3 py-2 transition-all",
          "focus-within:bg-background focus-within:border-primary/40 focus-within:shadow-glow"
        )}>
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={`Ask about ${topic.label}…`}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground min-h-[22px] max-h-[120px] overflow-y-auto leading-relaxed"
          />
          <button
            onClick={handleSend}
            disabled={streaming || !input.trim()}
            className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-center text-[10px] font-mono text-muted-foreground mt-1.5">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
