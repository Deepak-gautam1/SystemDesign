"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Eraser, Mic, Square, Brain, MessageCircleQuestion, Database, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble } from "@/components/chat/message-bubble";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { streamTopicChat } from "@/lib/api";
import type { Message } from "@/lib/types";

// Topic-scoped tutor, shared by ML, SQL and OOD. Started life as ML-only
// (ml-quiz-chat.tsx) — generalising it was the whole point, since "conversation
// about the thing you're reading" isn't an ML-specific affordance.
//
// Two modes, deliberately separate rather than one blended assistant:
//   interview — Socratic, one question per turn, never gives the answer
//   ask       — free-form, answers directly, stays anchored to the topic
// Mixing them produces a tutor that hands over the answer the moment you push
// back, which defeats the point of practising retrieval under pressure.

export type TutorSubject = "ml" | "sql" | "ood";
type TutorMode = "interview" | "ask";

interface SubjectStyle {
  label: string;
  generalTitle: string;
  generalBlurb: string;
  Icon: typeof Brain;
  text: string;
  chip: string;
  gradient: string;
  avatarRing: string;
  send: string;
  focus: string;
  pill: string;
}

// Literal class strings — Tailwind's JIT scanner can't see classes assembled
// from interpolated fragments, so each variant spells its palette out in full.
const SUBJECTS: Record<TutorSubject, SubjectStyle> = {
  ml: {
    label: "ML",
    generalTitle: "General ML Interview",
    generalBlurb:
      "a general ML interview across the whole syllabus — evaluation metrics, bias-variance, feature engineering, ensembles, neural networks, and more",
    Icon: Brain,
    text: "text-pink-500",
    chip: "bg-pink-500/10 border-pink-500/25",
    gradient: "from-pink-500/20 to-fuchsia-500/20",
    avatarRing: "border-pink-500/30 ring-pink-500/10",
    send: "bg-pink-500 hover:bg-pink-600",
    focus: "focus-within:border-pink-500/40",
    pill: "hover:bg-pink-500/10 hover:border-pink-500/25 hover:text-pink-500",
  },
  sql: {
    label: "SQL",
    generalTitle: "General SQL Interview",
    generalBlurb:
      "a general SQL interview across the whole curriculum — execution order, joins, window functions, transactions, indexing, and schema design",
    Icon: Database,
    text: "text-sky-500",
    chip: "bg-sky-500/10 border-sky-500/25",
    gradient: "from-sky-500/20 to-cyan-500/20",
    avatarRing: "border-sky-500/30 ring-sky-500/10",
    send: "bg-sky-500 hover:bg-sky-600",
    focus: "focus-within:border-sky-500/40",
    pill: "hover:bg-sky-500/10 hover:border-sky-500/25 hover:text-sky-500",
  },
  ood: {
    label: "LLD",
    generalTitle: "General LLD Interview",
    generalBlurb:
      "a general low-level-design interview across the whole curriculum — OOP fundamentals, class relationships, SOLID, design patterns, and concurrency",
    Icon: Code2,
    text: "text-violet-500",
    chip: "bg-violet-500/10 border-violet-500/25",
    gradient: "from-violet-500/20 to-indigo-500/20",
    avatarRing: "border-violet-500/30 ring-violet-500/10",
    send: "bg-violet-500 hover:bg-violet-600",
    focus: "focus-within:border-violet-500/40",
    pill: "hover:bg-violet-500/10 hover:border-violet-500/25 hover:text-violet-500",
  },
};

const STARTERS: Record<TutorMode, string[]> = {
  interview: ["Start the interview", "Quiz me on this", "Ask me something harder"],
  ask: ["Explain this more simply", "Give me a worked example", "When would this go wrong?"],
};

const MODES: { id: TutorMode; label: string; icon: typeof Brain; wire: "topic_quiz" | "topic_ask" }[] = [
  { id: "interview", label: "Interview", icon: Brain,                  wire: "topic_quiz" },
  { id: "ask",       label: "Ask",       icon: MessageCircleQuestion,  wire: "topic_ask"  },
];

interface TopicTutorChatProps {
  subject: TutorSubject;
  /** "" runs a general interview across the whole curriculum instead of one topic. */
  topicTitle: string;
  topicContent: string;
  oneLiner?: string;
  onBack: () => void;
  /** Label for the back button — "Theory" from a detail view, section name from a header. */
  backLabel?: string;
  initialMode?: TutorMode;
}

export function TopicTutorChat({
  subject,
  topicTitle,
  topicContent,
  oneLiner,
  onBack,
  backLabel,
  initialMode = "interview",
}: TopicTutorChatProps) {
  const style = SUBJECTS[subject];
  const [mode, setMode] = useState<TutorMode>(initialMode);
  // One transcript per mode. Switching modes mid-session shouldn't throw away a
  // half-finished interview just because you wanted one definition clarified —
  // and the two histories must not be fed to each other's prompt, since an
  // "ask" answer sitting in an interview history reads as the interviewer
  // having already given the answer away.
  const [transcripts, setTranscripts] = useState<Record<TutorMode, Message[]>>({ interview: [], ask: [] });
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const taRef  = useRef<HTMLTextAreaElement>(null);

  const messages = transcripts[mode];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { setTranscripts({ interview: [], ask: [] }); }, [topicTitle]);

  const applyInputText = (text: string) => {
    setInput(text);
    if (taRef.current) {
      taRef.current.style.height = "auto";
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 120) + "px";
    }
  };

  const { supported: micSupported, listening: micOn, error: micError, toggle: toggleMic } =
    useSpeechToText({ onTranscript: applyInputText });

  const effectiveTopic = topicTitle
    ? `${style.label} — ${topicTitle}`
    : style.generalTitle;

  // Only touches the transcript for the mode the message was sent in, so a
  // stream finishing after a mode switch can't append to the wrong history.
  const patchLast = (target: TutorMode, patch: (m: Message) => Message) => {
    setTranscripts(prev => {
      const list = prev[target];
      if (list.length === 0) return prev;
      const next = [...list];
      next[next.length - 1] = patch(next[next.length - 1]);
      return { ...prev, [target]: next };
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    const target = mode;
    const wire = MODES.find(m => m.id === target)!.wire;
    const history = transcripts[target].map(({ role, content }) => ({ role, content }));

    setTranscripts(prev => ({
      ...prev,
      [target]: [
        ...prev[target],
        { role: "user", content: text },
        { role: "assistant", content: "", streaming: true },
      ],
    }));
    setStreaming(true);

    try {
      for await (const event of streamTopicChat(text, wire, history, effectiveTopic, topicContent)) {
        if (event.type === "token" && event.text) {
          const tokenText = event.text;
          patchLast(target, m => ({ ...m, content: m.content + tokenText }));
        } else if (event.type === "error") {
          const message = event.message ?? "Something went wrong.";
          patchLast(target, m => ({ ...m, content: `⚠️ ${message}`, streaming: false }));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      patchLast(target, m => ({ ...m, content: `⚠️ ${message}`, streaming: false }));
    } finally {
      patchLast(target, m => ({ ...m, streaming: false }));
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

  const clearCurrent = () => setTranscripts(prev => ({ ...prev, [mode]: [] }));

  const SubjectIcon = style.Icon;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-border bg-card">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs border border-border hover:border-border/80 rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
        >
          <ArrowLeft size={12} /> {backLabel ?? "Theory"}
        </button>
        <div className="w-px h-4 bg-border shrink-0" />
        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center border shrink-0", style.chip)}>
          <SubjectIcon size={13} className={style.text} />
        </div>
        <span className="font-display font-semibold text-sm text-foreground truncate">{effectiveTopic}</span>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Interview / Ask */}
          <div className="flex items-center gap-0.5 bg-muted/60 border border-border rounded-xl p-1">
            {MODES.map(m => {
              const ModeIcon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  disabled={streaming}
                  title={
                    m.id === "interview"
                      ? "Socratic interview — one question at a time, no free answers"
                      : "Free-form Q&A about this topic — direct answers"
                  }
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 h-7 rounded-lg text-[11.5px] font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
                    active
                      ? "bg-primary/12 text-primary ring-1 ring-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <ModeIcon size={12} />
                  <span className="hidden sm:inline">{m.label}</span>
                  {transcripts[m.id].length > 0 && !active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  )}
                </button>
              );
            })}
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearCurrent}
              disabled={streaming}
              title="Clear this transcript and start over"
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
            <div
              className={cn(
                "w-8 h-8 rounded-full bg-gradient-to-br border-[1.5px] flex items-center justify-center shrink-0 ring-2",
                style.gradient, style.avatarRing
              )}
            >
              <SubjectIcon size={14} className={style.text} />
            </div>
            <div className="max-w-[min(85%,900px)]">
              <div className="rounded-xl rounded-tl-sm bg-card border border-border px-4 py-3 text-sm text-muted-foreground leading-relaxed">
                {mode === "interview" ? (
                  topicTitle ? (
                    <>
                      Ready to test your understanding of{" "}
                      <strong className="text-foreground font-semibold">{topicTitle}</strong>? I&apos;ll ask like a
                      real interviewer — one question at a time, no free answers, worked examples over definitions.
                      {oneLiner ? ` ${oneLiner}` : ""}
                    </>
                  ) : (
                    <>Ready for {style.generalBlurb}? I&apos;ll pick a question and go Socratic on it.</>
                  )
                ) : topicTitle ? (
                  <>
                    Ask me anything about{" "}
                    <strong className="text-foreground font-semibold">{topicTitle}</strong> — I&apos;ll answer
                    straight, with a concrete example rather than a restatement. Switch to{" "}
                    <strong className="text-foreground font-semibold">Interview</strong> above when you&apos;d
                    rather be tested than told.
                  </>
                ) : (
                  <>Ask me anything across the curriculum — I&apos;ll answer directly and keep it concrete.</>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {STARTERS[mode].map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full bg-muted border border-border text-muted-foreground transition-all",
                        style.pill
                      )}
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
          "flex items-end gap-2 bg-muted/60 border border-border rounded-xl px-3 py-2 transition-all focus-within:bg-background",
          style.focus
        )}>
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            onChange={e => applyInputText(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={
              micOn
                ? "Listening…"
                : mode === "interview"
                  ? "Answer, or ask for a hint…"
                  : "Ask anything about this topic…"
            }
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
            className={cn(
              "w-8 h-8 rounded-lg text-white flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed",
              style.send
            )}
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
