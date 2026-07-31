"use client";
import * as Icons from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DifficultyBadge, TagBadge } from "@/components/ui/badge";
import type { Topic, Category, Mode } from "@/lib/types";

function LucideIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const I = (Icons as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  return I ? <I size={size} className={className} /> : <Icons.Box size={size} className={className} />;
}

interface TopicCardProps {
  topic: Topic;
  category: Category;
  done: boolean;
  mode: Mode;
  onSelect: (mode: Mode) => void;
}

const MODE_BUTTONS = [
  { id: "study"     as Mode, label: "Study",     variant: "primary" },
  { id: "quiz"      as Mode, label: "Quiz",       variant: "amber"   },
  { id: "deep_dive" as Mode, label: "Dive",       variant: "violet"  },
] as const;

export function TopicCard({ topic, category, done, mode, onSelect }: TopicCardProps) {
  return (
    <div className={cn(
      "group relative flex flex-col gap-3 p-4 rounded-xl bg-card border transition-all duration-200 cursor-default",
      "hover:-translate-y-0.5 hover:shadow-elevated",
      done ? "border-emerald-500/30 dark:border-emerald-500/20" : "border-border hover:border-border/80"
    )}>
      {/* Top row: icon + done check */}
      <div className="flex items-start justify-between">
        <div className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border",
          category.bg, category.border
        )}>
          <LucideIcon name={topic.icon} size={17} className={category.color} />
        </div>
        {done && (
          <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />
        )}
      </div>

      {/* Title + desc */}
      <div>
        <h3 className="font-display font-semibold text-[14px] text-foreground leading-snug mb-1">
          {topic.label}
        </h3>
        <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
          {topic.desc}
        </p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        <DifficultyBadge difficulty={topic.difficulty} />
        {topic.tags.slice(0, 2).map(tag => <TagBadge key={tag} label={tag} />)}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1.5 mt-auto pt-1">
        {MODE_BUTTONS.map(btn => (
          <button
            key={btn.id}
            onClick={() => onSelect(btn.id)}
            className={cn(
              "flex-1 h-8 rounded-lg text-[11.5px] font-medium transition-all duration-150 border",
              btn.variant === "primary"
                ? "bg-primary/10 text-primary border-primary/25 hover:bg-primary/20"
                : btn.variant === "amber"
                  ? "bg-transparent text-muted-foreground border-border hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 dark:hover:text-amber-400"
                  : "bg-transparent text-muted-foreground border-border hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/30 dark:hover:text-violet-400"
            )}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
