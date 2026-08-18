"use client";
import { useEffect, useRef } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { marked } from "marked";
import { cn } from "@/lib/utils";
import { SqlCodeBlock } from "./sql-code-block";
import type { TheoryCategory, TheoryTopic } from "@/lib/types";

marked.setOptions({ breaks: true, gfm: true });

interface FlatRef {
  topic: TheoryTopic;
  category: TheoryCategory;
}

interface SqlTheoryDetailProps {
  topic: TheoryTopic;
  category: TheoryCategory;
  onBack: () => void;
  prev?: FlatRef;
  next?: FlatRef;
  onNavigate: (topicId: string) => void;
}

export function SqlTheoryDetail({ topic, category, onBack, prev, next, onNavigate }: SqlTheoryDetailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const proseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (proseRef.current) {
      proseRef.current.innerHTML = marked.parse(topic.content) as string;
    }
    scrollRef.current?.scrollTo({ top: 0 });
  }, [topic.id, topic.content]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-border bg-card">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs border border-border rounded-lg px-2.5 py-1.5 transition-colors"
        >
          <ArrowLeft size={12} /> Theory
        </button>
        <div className="w-px h-4 bg-border" />
        <span className={cn("text-[11px] font-mono uppercase tracking-wider shrink-0", category.color)}>
          {category.label}
        </span>
        <span className="text-muted-foreground/40 shrink-0">/</span>
        <span className="font-display font-semibold text-sm text-foreground truncate">{topic.title}</span>
      </div>

      {/* Split layout — prose left, code panel right (mirrors OOD's TheoryDetail) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          className={cn(
            "overflow-y-auto scrollbar-thin p-6",
            topic.code ? "w-[45%] shrink-0 border-r border-border" : "flex-1"
          )}
        >
          <div className={cn(topic.code ? "" : "max-w-2xl mx-auto")}>
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

        {topic.code && (
          <div className="flex-1 min-w-0 flex flex-col bg-zinc-950 overflow-hidden">
            <div className="shrink-0 flex items-center px-4 py-2 bg-zinc-900 border-b border-zinc-800">
              <span className="font-mono text-[11px] text-zinc-400">{topic.codeLabel ?? "example.sql"}</span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <SqlCodeBlock code={topic.code} />
            </div>
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
