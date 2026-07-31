"use client";
import { Building2, LayoutDashboard, Code2, GitBranch, Target, BookOpen, ChevronDown } from "lucide-react";
import * as Icons from "lucide-react";
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
}

function getIcon(name: string) {
  const I = (Icons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  return I ? <I size={12} /> : null;
}

export function Sidebar({ section, onSectionChange, activeTopic, progress, mode, onTopicSelect }: SidebarProps) {
  const isSdActive = section === "system-design";

  return (
    <aside className="w-52 shrink-0 bg-card border-r border-border flex flex-col overflow-hidden hidden md:flex">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shrink-0">
          <Building2 size={14} />
        </div>
        <span className="font-display font-bold text-sm text-foreground">
          SD Study Bot
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-2">
        <div className="px-2 py-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = section === item.id;
            return (
              <div key={item.id}>
                <button
                  onClick={() => !item.soon && onSectionChange(item.id)}
                  disabled={item.soon}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 mb-0.5",
                    isActive
                      ? "bg-secondary text-foreground"
                      : item.soon
                        ? "text-muted-foreground/50 cursor-not-allowed"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={15} className={isActive ? "text-primary" : ""} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.soon && (
                    <span className="text-[9px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                      soon
                    </span>
                  )}
                  {item.id === "system-design" && (
                    <ChevronDown
                      size={12}
                      className={cn("text-muted-foreground transition-transform", isSdActive && "rotate-180")}
                    />
                  )}
                </button>

                {/* System Design: topic sub-list */}
                {item.id === "system-design" && isSdActive && (
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
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  isTopicActive ? "bg-primary" : isDone ? "bg-emerald-500" : "bg-border"
                                )} />
                                <span className="truncate flex-1">{t.label}</span>
                                <span className={cn("font-mono text-[9px] font-bold shrink-0",
                                  t.difficulty === "easy" ? "text-emerald-500"
                                  : t.difficulty === "medium" ? "text-amber-500"
                                  : "text-rose-500"
                                )}>
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
              <button
                key={item.id}
                disabled={item.soon}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground/50 cursor-not-allowed mb-0.5"
              >
                <Icon size={15} />
                <span className="flex-1 text-left">{item.label}</span>
                <span className="text-[9px] font-mono bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                  soon
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
