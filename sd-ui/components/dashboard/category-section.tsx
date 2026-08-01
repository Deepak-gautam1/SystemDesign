"use client";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";
import { TopicCard } from "./topic-card";
import type { Category, Topic, Mode, Progress } from "@/lib/types";

function LucideIcon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  const I = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[name];
  return I ? <I size={size} className={className} /> : null;
}

interface CategorySectionProps {
  category: Category;
  topics: Topic[];
  progress: Progress;
  mode: Mode;
  onSelect: (topic: Topic, mode: Mode) => void;
}

export function CategorySection({ category, topics, progress, mode, onSelect }: CategorySectionProps) {
  if (!topics.length) return null;
  const doneCnt = topics.filter(t => progress[t.id]?.done).length;
  const pct = topics.length ? (doneCnt / topics.length) * 100 : 0;

  return (
    <section className="animate-fade-in">
      {/* Section header */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-xl mb-3 border-l-[3px] bg-muted/40",
        category.border
      )}>
        <span className={cn("text-base", category.color)}>
          <LucideIcon name={category.icon} size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className={cn("font-display font-bold text-[13px] leading-none", category.color)}>
            {category.label}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{category.sub}</p>
        </div>
        {/* Progress */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${pct}%`, backgroundColor: category.hex }}
            />
          </div>
          <span className={cn("font-mono text-[10px] font-semibold", category.color)}>
            {doneCnt}/{topics.length}
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {topics.map(topic => (
          <TopicCard
            key={topic.id}
            topic={topic}
            category={category}
            done={!!progress[topic.id]?.done}
            mode={mode}
            onSelect={m => onSelect(topic, m)}
          />
        ))}
      </div>
    </section>
  );
}
