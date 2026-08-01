"use client";
import {
  Search, BookOpen, Target, Microscope, ChevronRight,
  LayoutDashboard, Building2, Code2, GitBranch,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AppSection, Mode, Topic } from "@/lib/types";
import { cn } from "@/lib/utils";

// Mode config — tabs only appear when section === "system-design"
const MODES: { id: Mode; label: string; Icon: LucideIcon }[] = [
  { id: "study",     label: "Study",     Icon: BookOpen    },
  { id: "quiz",      label: "Quiz",      Icon: Target      },
  { id: "deep_dive", label: "Deep Dive", Icon: Microscope  },
];

const MODE_ACTIVE: Record<Mode, string> = {
  study:     "bg-primary/12 text-primary ring-1 ring-primary/30",
  quiz:      "bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30",
  deep_dive: "bg-violet-500/12 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30",
};

// Single source of truth for "what page am I on" — icon, label, accent color
const SECTION_META: Record<AppSection, { label: string; Icon: LucideIcon; color: string }> = {
  "dashboard":     { label: "Dashboard",              Icon: LayoutDashboard, color: "text-foreground" },
  "system-design": { label: "System Design",          Icon: Building2,       color: "text-primary" },
  "ood":           { label: "Object Oriented Design", Icon: Code2,           color: "text-violet-500 dark:text-violet-400" },
  "dsa":           { label: "DS & Algorithms",        Icon: GitBranch,       color: "text-amber-500 dark:text-amber-400" },
  "practice":      { label: "Practice",               Icon: Target,          color: "text-muted-foreground" },
  "guides":        { label: "Study Guides",           Icon: BookOpen,        color: "text-muted-foreground" },
};

interface HeaderProps {
  section:        AppSection;
  mode:           Mode;
  onModeChange:   (m: Mode) => void;
  doneCount:      number;
  total:          number;
  activeTopic?:   Topic | null;
  search?:        string;
  onSearchChange?:(v: string) => void;
  showSearch?:    boolean;
}

export function Header({
  section, mode, onModeChange,
  doneCount, total, activeTopic,
  search, onSearchChange, showSearch,
}: HeaderProps) {
  const inSystemDesign = section === "system-design";
  const meta = SECTION_META[section];
  const SectionIcon = meta.Icon;

  return (
    <header className={cn(
      "h-14 shrink-0 flex items-center gap-3 px-4 sticky top-0 z-40",
      "bg-card/80 backdrop-blur-md border-b border-border",
    )}>

      {/* ── Page title / breadcrumb — the one place "where am I" lives ── */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        <SectionIcon size={15} className={cn("shrink-0", meta.color)} />
        <span className={cn("text-[13px] font-semibold truncate", meta.color)}>
          {meta.label}
        </span>
        {activeTopic && (
          <>
            <ChevronRight size={12} className="text-muted-foreground/40 shrink-0" />
            <span className="text-[13px] font-medium text-foreground/80 truncate max-w-[220px]">
              {activeTopic.label}
            </span>
          </>
        )}
      </div>

      {/* ── Search (System Design dashboard only) ─────────────────────── */}
      {showSearch && (
        <div className="relative hidden md:flex items-center flex-1 max-w-[260px]">
          <Search size={12} className="absolute left-3 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search topics…"
            value={search}
            onChange={e => onSearchChange?.(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-muted/60 border border-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none focus:bg-background focus:border-border/80 transition-all"
          />
        </div>
      )}

      {/* ── Spacer ────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── Mode tabs — ONLY in System Design ─────────────────────────── */}
      {inSystemDesign && (
        <div className="flex items-center gap-0.5 bg-muted/60 border border-border rounded-xl p-1">
          {MODES.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => onModeChange(id)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-7 rounded-lg text-[12px] font-medium transition-all duration-150",
                mode === id
                  ? MODE_ACTIVE[id]
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon size={11} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Progress chip — ONLY in System Design, where doneCount/total mean something ── */}
      {inSystemDesign && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border">
          <div className="relative w-5 h-5 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
              <circle cx="10" cy="10" r="7" fill="none" stroke="hsl(var(--muted-foreground)/0.2)" strokeWidth="2.5" />
              <circle
                cx="10" cy="10" r="7" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 7 * (total ? doneCount / total : 0)} ${2 * Math.PI * 7}`}
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className="font-mono text-[11px] text-foreground font-medium">{doneCount}</span>
          <span className="font-mono text-[11px] text-muted-foreground">/ {total}</span>
        </div>
      )}

      {/* ── Theme toggle ───────────────────────────────────────────────── */}
      <ThemeToggle />
    </header>
  );
}
