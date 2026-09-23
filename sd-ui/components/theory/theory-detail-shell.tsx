"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Brain, Check } from "lucide-react";
import { marked } from "marked";
import { cn } from "@/lib/utils";
import { useTheoryProgress } from "@/hooks/use-theory-progress";
import { TopicTutorChat, type TutorSubject } from "./topic-tutor-chat";
import type { TheoryCategory, TheoryTopic } from "@/lib/types";

marked.setOptions({ breaks: true, gfm: true });

// Shared reading view behind OOD's TheoryDetail, SQL's SqlTheoryDetail and ML's
// MlTheoryDetail. Those three were identical apart from which syntax highlighter
// rendered the optional code panel, so the per-topic tutor and the mark-done
// control live here once instead of in three places.

type PanelTab = "theory" | "tutor";

interface FlatRef {
  topic: TheoryTopic;
  category: TheoryCategory;
}

interface TheoryDetailShellProps {
  subject: TutorSubject;
  /** Progress namespace — must match the one the grid uses. */
  namespace: string;
  topic: TheoryTopic;
  category: TheoryCategory;
  onBack: () => void;
  prev?: FlatRef;
  next?: FlatRef;
  onNavigate: (topicId: string) => void;
  /** Renders the highlighted body of the code panel, when a topic has code. */
  renderCode?: (code: string) => React.ReactNode;
  /** Fallback label above the code panel when a topic omits codeLabel. */
  defaultCodeLabel?: string;
  /** data-tour hook on the tutor toggle. */
  tutorTourId?: string;
}

export function TheoryDetailShell({
  subject,
  namespace,
  topic,
  category,
  onBack,
  prev,
  next,
  onNavigate,
  renderCode,
  defaultCodeLabel = "example",
  tutorTourId,
}: TheoryDetailShellProps) {
  const scrollRef = useRef<HTMLDivElement>(null);   // prose scroller (md and up)
  const splitRef = useRef<HTMLDivElement>(null);    // whole-column scroller (phones)
  const proseRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<PanelTab>("theory");
  const { isDone, toggleDone } = useTheoryProgress(namespace);
  const done = isDone(topic.id);

  // `tab` is a dependency on purpose: switching to the tutor unmounts the prose
  // div entirely (early return below), so the fresh div that mounts on the way
  // back needs its innerHTML written again. topic.id/content alone don't change
  // across a tab toggle, so without `tab` the effect skips it and the reader
  // gets a permanently blank page.
  useEffect(() => {
    if (proseRef.current) {
      proseRef.current.innerHTML = marked.parse(topic.content) as string;
    }
    scrollRef.current?.scrollTo({ top: 0 });
    splitRef.current?.scrollTo({ top: 0 });
  }, [topic.id, topic.content, tab]);

  // Don't leave the tutor open under a topic it no longer applies to.
  useEffect(() => { setTab("theory"); }, [topic.id]);

  if (tab === "tutor") {
    return (
      <TopicTutorChat
        subject={subject}
        topicTitle={topic.title}
        topicContent={topic.content}
        oneLiner={topic.oneLiner}
        onBack={() => setTab("theory")}
      />
    );
  }

  const hasCode = Boolean(topic.code && renderCode);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-border bg-card">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs border border-border rounded-lg px-2.5 py-1.5 transition-colors shrink-0"
        >
          <ArrowLeft size={12} /> Theory
        </button>
        <div className="w-px h-4 bg-border shrink-0" />
        <span className={cn("text-[11px] font-mono uppercase tracking-wider shrink-0 hidden md:inline", category.color)}>
          {category.label}
        </span>
        <span className="text-muted-foreground/40 shrink-0 hidden md:inline">/</span>
        <span className="font-display font-semibold text-sm text-foreground truncate">{topic.title}</span>

        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => toggleDone(topic.id)}
            title={done ? "Mark as not done" : "Mark this topic as covered"}
            aria-pressed={done}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
              done
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                : "border-border text-muted-foreground hover:text-foreground hover:border-emerald-500/25 hover:bg-emerald-500/5"
            )}
          >
            <Check size={12} strokeWidth={done ? 3 : 2} />
            <span className="hidden sm:inline">{done ? "Done" : "Mark done"}</span>
          </button>
          <button
            data-tour={tutorTourId}
            onClick={() => setTab("tutor")}
            title="Quiz yourself on this topic, or ask questions about it"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-border text-muted-foreground hover:text-foreground hover:border-primary/25 hover:bg-primary/5"
          >
            <Brain size={12} />
            <span className="hidden sm:inline">Tutor</span>
          </button>
        </div>
      </div>

      {/* Split layout — prose left, code panel right when the topic has one.
          On phones the two stack and scroll together as a single column. */}
      <div ref={splitRef} className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
        <div
          ref={scrollRef}
          className={cn(
            "md:overflow-y-auto scrollbar-thin p-4 sm:p-6",
            hasCode ? "md:w-[45%] md:shrink-0 md:border-r border-border" : "flex-1"
          )}
        >
          <div className={cn(hasCode ? "" : "max-w-2xl mx-auto")}>
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium mb-4 border",
                category.bg, category.border, category.color
              )}
            >
              <BookOpen size={10} /> {category.label}
            </div>
            <h1 className="font-display font-bold text-xl text-foreground mb-1">{topic.title}</h1>
            <p className="text-sm text-muted-foreground mb-5">{topic.oneLiner}</p>
            <div ref={proseRef} className="prose-chat text-[13.5px] text-foreground leading-relaxed" />
          </div>
        </div>

        {hasCode && (
          <div className="shrink-0 md:flex-1 min-w-0 flex flex-col bg-slate-950 md:overflow-hidden">
            <div className="shrink-0 flex items-center px-4 py-2 bg-slate-900 border-b border-slate-800">
              <span className="font-mono text-[11px] text-slate-400">{topic.codeLabel ?? defaultCodeLabel}</span>
            </div>
            <div className="overflow-x-auto p-4 md:flex-1 md:overflow-auto">{renderCode!(topic.code!)}</div>
          </div>
        )}
      </div>

      {/* Prev / Next — lets the whole curriculum be read start to finish */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card">
        <button
          onClick={() => prev && onNavigate(prev.topic.id)}
          disabled={!prev}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors max-w-[45%]",
            prev
              ? "text-muted-foreground hover:text-foreground border-border hover:border-border/80"
              : "text-muted-foreground/30 border-border/50 cursor-not-allowed"
          )}
        >
          <ChevronLeft size={13} className="shrink-0" />
          <span className="truncate">{prev ? prev.topic.title : "Start of curriculum"}</span>
        </button>
        <button
          onClick={() => next && onNavigate(next.topic.id)}
          disabled={!next}
          className={cn(
            "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors max-w-[45%]",
            next
              ? "text-muted-foreground hover:text-foreground border-border hover:border-border/80"
              : "text-muted-foreground/30 border-border/50 cursor-not-allowed"
          )}
        >
          <span className="truncate">{next ? next.topic.title : "End of curriculum"}</span>
          <ChevronRight size={13} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}
