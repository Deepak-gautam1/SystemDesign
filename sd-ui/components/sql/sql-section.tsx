"use client";
import { useState } from "react";
import { Database, BookOpen, Pencil, Library } from "lucide-react";
import { cn } from "@/lib/utils";
import { DifficultyBadge, TagBadge } from "@/components/ui/badge";
import { SqlProblemDetail } from "./sql-problem-detail";
import { SqlTheorySection } from "./sql-theory-section";
import { SqlTheoryDetail } from "./sql-theory-detail";
import { ALL_SQL_PROBLEMS } from "@/lib/sql-problems";
import { FLAT_SQL_THEORY_TOPICS, TOTAL_SQL_THEORY_TOPICS, getSqlTheoryTopicIndex } from "@/lib/sql-theory";
import type { SQLProblem } from "@/lib/sql-problems";

type SqlTab = "theory" | "problems";

function ProblemCard({ p, idx, onClick }: { p: SQLProblem; idx: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex items-start gap-4 p-4 rounded-xl bg-card border border-border hover:-translate-y-0.5 hover:shadow-elevated hover:border-border/70 transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${idx * 60}ms` }}
    >
      {/* Number */}
      <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0 font-mono font-bold text-sm text-sky-600 dark:text-sky-400">
        {String(idx + 1).padStart(2, "0")}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className="font-display font-semibold text-[14px] text-foreground leading-snug group-hover:text-primary transition-colors">
            {p.title}
          </h3>
          <DifficultyBadge difficulty={p.difficulty} />
        </div>

        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">
          {p.description.split("\n")[0]}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {p.tags.slice(0, 4).map(t => <TagBadge key={t} label={t} />)}
        </div>
      </div>

      {/* Actions hint */}
      <div className="flex flex-col gap-1.5 shrink-0 mt-0.5">
        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <BookOpen size={9} /> Learn
        </span>
        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <Pencil size={9} /> Practice
        </span>
      </div>
    </button>
  );
}

export function SQLSection() {
  const [tab, setTab] = useState<SqlTab>("theory");
  const [selectedProblem, setSelectedProblem] = useState<SQLProblem | null>(null);
  const [selectedTheoryId, setSelectedTheoryId] = useState<string | null>(null);

  // Full-bleed detail views take over the whole section, same as OOD's pattern.
  if (tab === "problems" && selectedProblem) {
    return <SqlProblemDetail problem={selectedProblem} onBack={() => setSelectedProblem(null)} />;
  }

  if (tab === "theory" && selectedTheoryId) {
    const idx = getSqlTheoryTopicIndex(selectedTheoryId);
    if (idx !== -1) {
      const { topic, category } = FLAT_SQL_THEORY_TOPICS[idx];
      const prev = idx > 0 ? FLAT_SQL_THEORY_TOPICS[idx - 1] : undefined;
      const next = idx < FLAT_SQL_THEORY_TOPICS.length - 1 ? FLAT_SQL_THEORY_TOPICS[idx + 1] : undefined;
      return (
        <SqlTheoryDetail
          topic={topic}
          category={category}
          onBack={() => setSelectedTheoryId(null)}
          prev={prev}
          next={next}
          onNavigate={setSelectedTheoryId}
        />
      );
    }
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 animate-fade-in flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-500 shrink-0">
            <Database size={20} />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight text-foreground">
              SQL Interview Prep
            </h1>
            <p className="text-sm text-muted-foreground">
              {TOTAL_SQL_THEORY_TOPICS} theory topics · {ALL_SQL_PROBLEMS.length} practice problems · PostgreSQL
            </p>
          </div>
        </div>

        {/* Theory / Problems tab switcher */}
        <div data-tour="sql-tabs" className="flex items-center gap-0.5 bg-muted/60 border border-border rounded-xl p-1 shrink-0">
          <button
            onClick={() => setTab("theory")}
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12.5px] font-medium transition-all duration-150",
              tab === "theory"
                ? "bg-primary/12 text-primary ring-1 ring-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Library size={13} /> Theory
          </button>
          <button
            onClick={() => setTab("problems")}
            className={cn(
              "flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12.5px] font-medium transition-all duration-150",
              tab === "problems"
                ? "bg-sky-500/12 text-sky-600 dark:text-sky-400 ring-1 ring-sky-500/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <Pencil size={13} /> Problems
          </button>
        </div>
      </div>

      {tab === "theory" ? (
        <SqlTheorySection onSelectTopic={setSelectedTheoryId} />
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-6 animate-slide-up">
            {[
              { label: "Problems", value: ALL_SQL_PROBLEMS.length,                                             color: "text-primary" },
              { label: "Easy",     value: ALL_SQL_PROBLEMS.filter(p => p.difficulty === "easy").length,   color: "text-emerald-500" },
              { label: "Medium",   value: ALL_SQL_PROBLEMS.filter(p => p.difficulty === "medium").length, color: "text-amber-500" },
              { label: "Hard",     value: ALL_SQL_PROBLEMS.filter(p => p.difficulty === "hard").length,   color: "text-rose-500" },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border rounded-xl px-4 py-3 text-center">
                <p className={cn("font-display font-bold text-xl", s.color)}>{s.value}</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Problem list */}
          <div className="flex flex-col gap-3">
            {ALL_SQL_PROBLEMS.map((p, i) => (
              <ProblemCard key={p.id} p={p} idx={i} onClick={() => setSelectedProblem(p)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
