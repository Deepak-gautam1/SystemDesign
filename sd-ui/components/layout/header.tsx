"use client";
import Link from "next/link";
import { Search, BookOpen, Target, Microscope, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { AppSection, Mode, Topic } from "@/lib/types";
import { cn } from "@/lib/utils";

// Mode config — tabs only appear when section === "system-design"
const MODES: { id: Mode; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "study",     label: "Study",     Icon: BookOpen    },
  { id: "quiz",      label: "Quiz",      Icon: Target      },
  { id: "deep_dive", label: "Deep Dive", Icon: Microscope  },
];

const MODE_ACTIVE: Record<Mode, string> = {
  study:     "bg-primary/12 text-primary ring-1 ring-primary/30",
  quiz:      "bg-amber-500/12 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30",
  deep_dive: "bg-violet-500/12 text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/30",
};

const SECTION_LABELS: Partial<Record<AppSection, string>> = {
  "system-design": "System Design",
  "ood":           "Object Oriented Design",
  "dashboard":     "Dashboard",
  "dsa":           "DS & Algorithms",
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

  return (
    <header className={cn(
      "h-14 shrink-0 flex items-center gap-3 px-4 sticky top-0 z-40",
      "bg-card/80 backdrop-blur-md border-b border-border",
    )}>

      {/* ── Brand ─────────────────────────────────────────────────────── */}
      <Link href="/" className="flex items-center gap-2 shrink-0 select-none group">
        {/* Gradient icon mark */}
        <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity=".9"/>
            <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity=".6"/>
            <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity=".6"/>
            <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity=".9"/>
          </svg>
        </div>

        {/* Wordmark */}
        <span className="font-display font-semibold text-[15px] tracking-tight">
          <span className="text-foreground">arch</span>
          <span className="text-primary font-bold">prep</span>
        </span>
      </Link>

      {/* ── Breadcrumb (when in System Design or viewing a topic) ──────── */}
      {(inSystemDesign || activeTopic) && (
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          <div className="w-px h-3.5 bg-border mx-0.5" />
          <span className="text-muted-foreground/70">System Design</span>
          {activeTopic && (
            <>
              <ChevronRight size={11} className="text-muted-foreground/50 shrink-0" />
              <span className="text-foreground/80 font-medium truncate max-w-[180px]">
                {activeTopic.label}
              </span>
            </>
          )}
        </div>
      )}

      {section === "ood" && (
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
          <div className="w-px h-3.5 bg-border mx-0.5" />
          <span className="text-violet-500 font-medium">Object Oriented Design</span>
        </div>
      )}

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

      {/* ── Progress chip ──────────────────────────────────────────────── */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border">
        {/* Mini arc progress */}
        <div className="relative w-5 h-5 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" className="-rotate-90">
            <circle cx="10" cy="10" r="7" fill="none" stroke="hsl(var(--muted-foreground)/0.2)" strokeWidth="2.5" />
            <circle
              cx="10" cy="10" r="7" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="2.5"
              strokeDasharray={`${2 * Math.PI * 7 * (doneCount / total)} ${2 * Math.PI * 7}`}
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span className="font-mono text-[11px] text-foreground font-medium">{doneCount}</span>
        <span className="font-mono text-[11px] text-muted-foreground">/ {total}</span>
      </div>

      {/* ── Theme toggle ───────────────────────────────────────────────── */}
      <ThemeToggle />
    </header>
  );
}
