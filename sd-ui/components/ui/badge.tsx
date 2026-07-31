import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/types";

const diffMap: Record<Difficulty, string> = {
  easy:   "badge-easy",
  medium: "badge-medium",
  hard:   "badge-hard",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono uppercase tracking-wide", diffMap[difficulty])}>
      {difficulty}
    </span>
  );
}

export function TagBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-muted text-muted-foreground border border-border">
      {label}
    </span>
  );
}
