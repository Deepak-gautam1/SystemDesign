"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Check, Search, X, RotateCcw } from "lucide-react";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheoryProgress } from "@/hooks/use-theory-progress";
import type { TheoryCategory, TheoryTopic } from "@/lib/types";

// Shared browser for all three theory curricula (OOD, SQL, ML). Those three
// grids were byte-for-byte identical apart from their data source, and each new
// affordance — search, progress, filters — would otherwise have to be written
// (and kept in sync) three times.

function LucideIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const I = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  return I ? <I size={size} className={className} /> : null;
}

type Filter = "all" | "todo" | "done";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",  label: "All" },
  { id: "todo", label: "To do" },
  { id: "done", label: "Done" },
];

interface TheoryBrowserProps {
  /** localStorage scope for progress — "ml" | "sql" | "ood". Must stay stable. */
  namespace: string;
  categories: TheoryCategory[];
  /** Prefix for the per-category DOM ids the jump nav scrolls to. */
  idPrefix: string;
  intro: React.ReactNode;
  /** Jump-nav pills — worth it once a curriculum has enough categories to scroll. */
  jumpNav?: boolean;
  onSelectTopic: (topicId: string) => void;
  tourId?: string;
}

export function TheoryBrowser({
  namespace,
  categories,
  idPrefix,
  intro,
  jumpNav = false,
  onSelectTopic,
  tourId,
}: TheoryBrowserProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const searchRef = useRef<HTMLInputElement>(null);
  const { isDone, toggleDone, countDone, resetAll, doneCount } = useTheoryProgress(namespace);

  const total = useMemo(
    () => categories.reduce((sum, c) => sum + c.topics.length, 0),
    [categories]
  );

  // Pre-lowercased search text per topic. Body text is included so a search for
  // a term that only appears deep in a topic ("MNAR", "keyset") still finds it —
  // but building that string on every keystroke across ~150 topics would be
  // wasteful, so it's memoized against the (static) category data.
  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of categories) {
      for (const topic of cat.topics) {
        map.set(topic.id, `${topic.title}\n${topic.oneLiner}\n${topic.content}`.toLowerCase());
      }
    }
    return map;
  }, [categories]);

  const needle = query.trim().toLowerCase();

  const visible = useMemo(() => {
    return categories
      .map(cat => ({
        cat,
        topics: cat.topics.filter(topic => {
          if (needle && !haystacks.get(topic.id)?.includes(needle)) return false;
          if (filter === "done") return isDone(topic.id);
          if (filter === "todo") return !isDone(topic.id);
          return true;
        }),
      }))
      .filter(group => group.topics.length > 0);
    // doneCount is a dependency even though the filter callback doesn't name it:
    // isDone is a stable useCallback, so it can't signal that progress changed.
    // Without doneCount here, ticking a topic while the "To do" filter is active
    // leaves it sitting in the list — the memo has no reason to recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, needle, haystacks, filter, isDone, doneCount]);

  const shownCount = visible.reduce((sum, g) => sum + g.topics.length, 0);
  const filtering = needle.length > 0 || filter !== "all";
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  // "/" to focus search, Escape to clear it — the curricula are long enough that
  // reaching for the mouse to find one topic is the slow path.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === "Escape" && el === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div data-tour={tourId}>
      {/* Intro + credit line, supplied per curriculum */}
      <div className="mb-4 animate-fade-in">{intro}</div>

      {/* Toolbar — search, filter, progress */}
      <div className="flex flex-col gap-3 mb-5 animate-fade-in">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              ref={searchRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search topics — title or body text (press / to focus)"
              aria-label="Search theory topics"
              className="w-full h-9 pl-8 pr-8 rounded-xl bg-muted/60 border border-border text-[12.5px] text-foreground placeholder:text-muted-foreground outline-none transition-all focus:bg-background focus:border-primary/40"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); searchRef.current?.focus(); }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* All / To do / Done */}
          <div className="flex items-center gap-0.5 bg-muted/60 border border-border rounded-xl p-1 shrink-0">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-2.5 h-7 rounded-lg text-[11.5px] font-medium transition-all duration-150",
                  filter === f.id
                    ? "bg-primary/12 text-primary ring-1 ring-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-[10.5px] text-muted-foreground shrink-0 tabular-nums">
            {doneCount} / {total} done · {pct}%
          </span>
          {doneCount > 0 && (
            <button
              onClick={resetAll}
              title="Clear progress for this section"
              className="flex items-center gap-1 font-mono text-[10.5px] text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>

        {filtering && (
          <p className="text-[11px] text-muted-foreground font-mono">
            {shownCount} of {total} topics shown
          </p>
        )}
      </div>

      {/* Jump nav — only worth the vertical space on long curricula like ML's 15 categories */}
      {jumpNav && !filtering && (
        <div className="flex flex-wrap gap-1.5 mb-6 animate-fade-in">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() =>
                document.getElementById(`${idPrefix}-${cat.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all hover:-translate-y-px",
                cat.bg, cat.border, cat.color
              )}
            >
              <LucideIcon name={cat.icon} size={10} />
              {cat.label}
              <span className="font-mono opacity-60">
                {countDone(cat.topics.map(t => t.id))}/{cat.topics.length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Nothing matched */}
      {visible.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center animate-fade-in">
          <Search size={22} className="text-muted-foreground/40" />
          <p className="text-sm text-foreground font-medium">
            {filter === "done" && !needle ? "Nothing marked done yet" : "No topics match"}
          </p>
          <p className="text-[12px] text-muted-foreground max-w-sm">
            {filter === "done" && !needle
              ? "Open a topic and hit “Mark done” to start tracking what you've covered."
              : "Try a shorter search term, or switch the filter back to All."}
          </p>
          {filtering && (
            <button
              onClick={() => { setQuery(""); setFilter("all"); }}
              className="mt-1 text-[11.5px] px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Category sections */}
      <div className="flex flex-col gap-7 pb-4">
        {visible.map(({ cat, topics }, ci) => {
          const catDone = countDone(cat.topics.map(t => t.id));
          const catComplete = catDone === cat.topics.length;
          return (
            <section
              key={cat.id}
              id={`${idPrefix}-${cat.id}`}
              className="animate-fade-in scroll-mt-4"
              style={{ animationDelay: `${ci * 40}ms` }}
            >
              <div className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 border-l-[3px] bg-muted/40", cat.border)}>
                <span className={cat.color}>
                  <LucideIcon name={cat.icon} size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className={cn("font-display font-bold text-[13px] leading-none", cat.color)}>{cat.label}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{cat.sub}</p>
                </div>
                <span
                  className={cn(
                    "flex items-center gap-1 font-mono text-[10px] font-semibold shrink-0",
                    catComplete ? "text-emerald-500" : cat.color
                  )}
                >
                  {catComplete && <Check size={10} />}
                  {catDone}/{cat.topics.length}
                  {/* When a search is active the header still reports whole-category
                      progress; the grid below is what's filtered. */}
                  {topics.length !== cat.topics.length && (
                    <span className="text-muted-foreground font-normal"> · {topics.length} shown</span>
                  )}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {topics.map(topic => (
                  <TopicCard
                    key={topic.id}
                    topic={topic}
                    done={isDone(topic.id)}
                    onOpen={() => onSelectTopic(topic.id)}
                    onToggleDone={() => toggleDone(topic.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

// A div rather than a button: the card holds its own "mark done" button, and
// nesting a button inside a button is invalid HTML (browsers silently unnest it,
// which loses the inner click handler). role/tabIndex/onKeyDown restore the
// keyboard and screen-reader behaviour a real button would have given us.
function TopicCard({
  topic,
  done,
  onOpen,
  onToggleDone,
}: {
  topic: TheoryTopic;
  done: boolean;
  onOpen: () => void;
  onToggleDone: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "group cursor-pointer text-left flex flex-col gap-1 p-3.5 rounded-xl bg-card border hover:-translate-y-0.5 hover:shadow-elevated transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        done ? "border-emerald-500/30" : "border-border hover:border-border/70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h4
          className={cn(
            "font-display font-semibold text-[13px] transition-colors",
            done ? "text-muted-foreground" : "text-foreground group-hover:text-primary"
          )}
        >
          {topic.title}
        </h4>
        <button
          onClick={e => { e.stopPropagation(); onToggleDone(); }}
          title={done ? "Mark as not done" : "Mark as done"}
          aria-label={done ? `Mark ${topic.title} as not done` : `Mark ${topic.title} as done`}
          aria-pressed={done}
          className={cn(
            "w-[18px] h-[18px] rounded-md border flex items-center justify-center shrink-0 mt-px transition-all",
            done
              ? "bg-emerald-500 border-emerald-500 text-white"
              : "border-border text-transparent hover:border-emerald-500/60 hover:text-emerald-500/40"
          )}
        >
          <Check size={11} strokeWidth={3} />
        </button>
      </div>
      <p className="text-[11.5px] text-muted-foreground leading-relaxed line-clamp-2">{topic.oneLiner}</p>
      {done && (
        <span className="flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-wider text-emerald-500 mt-0.5">
          <BookOpen size={9} /> covered
        </span>
      )}
    </div>
  );
}
