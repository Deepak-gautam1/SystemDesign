"use client";
import * as Icons from "lucide-react";
import { Building2, Code2, GitBranch, Target, ArrowRight, Clock } from "lucide-react";
import type { LucideIcon as LucideIconType } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProgressRing } from "@/components/ui/progress-ring";
import type { Category, Topic, Mode, Progress, AppSection } from "@/lib/types";

function LucideIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const I = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  return I ? <I size={size} className={className} /> : <Icons.Box size={size} className={className} />;
}

interface DashboardHomeProps {
  doneCount: number;
  totalTopics: number;
  categories: Category[];
  topics: Topic[];
  progress: Progress;
  recentTopics: Topic[];
  onSelectTopic: (topic: Topic, mode?: Mode) => void;
  onNavigateSection: (s: AppSection) => void;
}

const EXPLORE_CARDS: {
  id: AppSection; label: string; sub: string;
  Icon: LucideIconType;
  color: string; bg: string; border: string; soon?: boolean;
}[] = [
  { id: "system-design", label: "System Design",          sub: "22 topics · interview prep",  Icon: Building2, color: "text-primary",          bg: "bg-primary/10",       border: "border-primary/25" },
  { id: "ood",           label: "Object Oriented Design",  sub: "Patterns & design problems",  Icon: Code2,     color: "text-violet-500 dark:text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25" },
  { id: "dsa",           label: "DS & Algorithms",         sub: "Coming soon",                 Icon: GitBranch, color: "text-amber-500 dark:text-amber-400",   bg: "bg-amber-500/10",  border: "border-amber-500/25", soon: true },
  { id: "practice",      label: "Practice",                sub: "Mock interviews — soon",       Icon: Target,    color: "text-muted-foreground", bg: "bg-muted",            border: "border-border", soon: true },
];

export function DashboardHome({
  doneCount, totalTopics, categories, topics, progress,
  recentTopics, onSelectTopic, onNavigateSection,
}: DashboardHomeProps) {
  const nextTopic = topics.find(t => !progress[t.id]?.done);
  const allDone = !nextTopic;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
      <div className="flex flex-col gap-8 max-w-6xl">

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border rounded-xl px-5 py-4 animate-fade-in">
          <div className="flex items-center gap-4 min-w-0">
            <ProgressRing done={doneCount} total={totalTopics} />
            <div className="min-w-0">
              <h1 className="font-display font-bold text-lg tracking-tight text-foreground mb-1">
                Welcome back
              </h1>
              <p className="text-sm text-muted-foreground">
                {doneCount} of {totalTopics} System Design topics done
                {allDone && " — you've cleared them all"}
              </p>
            </div>
          </div>
          <button
            onClick={() => (nextTopic ? onSelectTopic(nextTopic, "study") : onNavigateSection("system-design"))}
            className="flex items-center justify-center gap-1.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            {allDone ? "Review a topic" : "Continue studying"}
            <ArrowRight size={14} />
          </button>
        </section>

        {/* ── Jump back in ────────────────────────────────────────────── */}
        {recentTopics.length > 0 && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} className="text-muted-foreground" />
              <h2 className="font-display font-bold text-[12px] uppercase tracking-widest text-muted-foreground">
                Jump back in
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {recentTopics.map(t => {
                const cat = categories.find(c => c.id === t.cat);
                const isDone = !!progress[t.id]?.done;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTopic(t, "study")}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-border/80 hover:-translate-y-0.5 hover:shadow-elevated transition-all duration-200 text-left"
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", cat?.bg, cat?.border)}>
                      <LucideIcon name={t.icon} size={15} className={cat?.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-foreground truncate">{t.label}</p>
                      <p className="text-[10.5px] text-muted-foreground">{isDone ? "Done · revisit" : "Resume"}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Explore ──────────────────────────────────────────────────── */}
        <section className="animate-fade-in">
          <h2 className="font-display font-bold text-[12px] uppercase tracking-widest text-muted-foreground mb-3">
            Explore
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {EXPLORE_CARDS.map(card => {
              const Icon = card.Icon;
              return (
                <button
                  key={card.id}
                  onClick={() => !card.soon && onNavigateSection(card.id)}
                  disabled={card.soon}
                  className={cn(
                    "flex flex-col gap-3 p-4 rounded-xl border text-left transition-all duration-200",
                    card.soon
                      ? "bg-muted/30 border-border cursor-not-allowed opacity-60"
                      : "bg-card border-border hover:-translate-y-0.5 hover:shadow-elevated hover:border-border/80"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center border", card.bg, card.border)}>
                    <Icon size={17} className={card.color} />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-[13.5px] text-foreground">{card.label}</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">{card.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Category breakdown ──────────────────────────────────────── */}
        <section className="animate-fade-in pb-6">
          <h2 className="font-display font-bold text-[12px] uppercase tracking-widest text-muted-foreground mb-3">
            System Design by category
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(cat => {
              const catTopics = topics.filter(t => t.cat === cat.id);
              const done = catTopics.filter(t => progress[t.id]?.done).length;
              const pct = catTopics.length ? (done / catTopics.length) * 100 : 0;
              return (
                <button
                  key={cat.id}
                  onClick={() => onNavigateSection("system-design")}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-border/80 hover:-translate-y-0.5 hover:shadow-elevated transition-all duration-200 text-left"
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border", cat.bg, cat.border)}>
                    <LucideIcon name={cat.icon} size={15} className={cat.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-display font-semibold text-[12.5px]", cat.color)}>{cat.label}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%`, backgroundColor: cat.hex }}
                        />
                      </div>
                      <span className={cn("font-mono text-[10px] font-semibold shrink-0", cat.color)}>
                        {done}/{catTopics.length}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

      </div>
    </div>
  );
}
