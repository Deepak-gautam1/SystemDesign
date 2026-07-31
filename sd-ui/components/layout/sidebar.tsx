"use client";
import {
  Building2, LayoutDashboard, Code2, GitBranch, Target, BookOpen,
  ChevronDown, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, TOPICS } from "@/lib/topics";
import type { AppSection } from "@/lib/types";
import type { Topic, Mode } from "@/lib/types";

const NAV_ITEMS = [
  { id: "dashboard"      as AppSection, label: "Dashboard",              icon: LayoutDashboard },
  { id: "system-design"  as AppSection, label: "System Design",          icon: Building2 },
  { id: "ood"            as AppSection, label: "Object Oriented Design",  icon: Code2 },
  { id: "dsa"            as AppSection, label: "DS & Algorithms",         icon: GitBranch, soon: true },
];

const SECONDARY_NAV = [
  { id: "practice" as AppSection, label: "Practice",    icon: Target,   soon: true },
  { id: "guides"   as AppSection, label: "Study Guides", icon: BookOpen, soon: true },
];

interface SidebarProps {
  section: AppSection;
  onSectionChange: (s: AppSection) => void;
  activeTopic?: string;
  progress: Record<string, { done: boolean }>;
  mode: Mode;
  onTopicSelect: (t: Topic) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Hover label shown only in icon-rail (collapsed) mode */
function RailTooltip({ label }: { label: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 z-50 whitespace-nowrap",
        "rounded-md border border-border bg-popover px-2 py-1 text-[11px] font-medium text-foreground shadow-elevated",
        "opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0"
      )}
    >
      {label}
    </span>
  );
}

export function Sidebar({
  section, onSectionChange, activeTopic, progress, mode, onTopicSelect,
  collapsed, onToggleCollapsed,
}: SidebarProps) {
  const isSdActive = section === "system-design";

  return (
    <aside
      className={cn(
        "shrink-0 bg-card border-r border-border flex-col overflow-hidden hidden md:flex",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[64px]" : "w-52"
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center border-b border-border shrink-0",
          collapsed ? "flex-col gap-2 py-3" : "gap-2.5 px-4 py-4"
        )}
      >
        <button
          onClick={() => onSectionChange("system-design")}
          className={cn("flex items-center gap-2 select-none group min-w-0", !collapsed && "flex-1")}
          aria-label="archprep — go to System Design"
        >
          <div className="w-7 h-7 rounded-[7px] bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-sm shrink-0 group-hover:shadow-md transition-shadow">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity=".9" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity=".6" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity=".6" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity=".9" />
            </svg>
          </div>
          {!collapsed && (
            <span className="font-display font-semibold text-[15px] tracking-tight truncate">
              <span className="text-foreground">arch</span>
              <span className="text-primary font-bold">prep</span>
            </span>
          )}
        </button>

        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin py-2">
        <div className="px-2 py-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = section === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => !item.soon && onSectionChange(item.id)}
                  disabled={item.soon}
                  aria-label={item.label}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 mb-0.5",
                    collapsed ? "justify-center h-9 px-0" : "px-3 py-2",
                    isActive
                      ? "bg-secondary text-foreground"
                      : item.soon
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={15} className={cn("shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                  {!collapsed && item.soon && (
                    <span className="text-[9px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                      soon
                    </span>
                  )}
                  {!collapsed && item.id === "system-design" && (
                    <ChevronDown
                      size={12}
                      className={cn("text-muted-foreground transition-transform shrink-0", isSdActive && "rotate-180")}
                    />
                  )}
                </button>

                {collapsed && <RailTooltip label={item.soon ? `${item.label} · soon` : item.label} />}

                {/* System Design: topic sub-list — only when expanded */}
                {!collapsed && item.id === "system-design" && isSdActive && (
                  <div className="ml-3 border-l border-border pl-3 mb-1">
                    {CATEGORIES.map(cat => {
                      const catTopics = TOPICS.filter(t => t.cat === cat.id);
                      return (
                        <div key={cat.id} className="mt-2">
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1 px-1", cat.color)}>
                            {cat.label}
                          </p>
                          {catTopics.map(t => {
                            const isTopicActive = activeTopic === t.id;
                            const isDone = !!progress[t.id]?.done;
                            return (
                              <button
                                key={t.id}
                                onClick={() => onTopicSelect(t)}
                                className={cn(
                                  "w-full flex items-center gap-2 px-2 py-1 rounded-md text-[11.5px] transition-colors text-left mb-0.5",
                                  isTopicActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                              >
                                <span
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0",
                                    isTopicActive ? "bg-primary" : isDone ? "bg-emerald-500" : "bg-border"
                                  )}
                                />
                                <span className="truncate flex-1">{t.label}</span>
                                <span
                                  className={cn(
                                    "font-mono text-[9px] font-bold shrink-0",
                                    t.difficulty === "easy"
                                      ? "text-emerald-500"
                                      : t.difficulty === "medium"
                                        ? "text-amber-500"
                                        : "text-rose-500"
                                  )}
                                >
                                  {t.difficulty[0].toUpperCase()}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Divider + secondary nav */}
        <div className="mx-3 my-2 border-t border-border" />
        <div className="px-2">
          {SECONDARY_NAV.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative group">
                <button
                  disabled={item.soon}
                  aria-label={item.label}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium text-muted-foreground/50 cursor-not-allowed mb-0.5",
                    collapsed ? "justify-center h-9 px-0" : "px-3 py-2"
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
                  {!collapsed && (
                    <span className="text-[9px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                      soon
                    </span>
                  )}
                </button>
                {collapsed && <RailTooltip label={`${item.label} · soon`} />}
              </div>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
