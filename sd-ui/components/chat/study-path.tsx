"use client";
import { Check, ArrowRight, Route } from "lucide-react";
import { cn } from "@/lib/utils";
import { STUDY_STEPS, doneStepIds, nextStep } from "@/lib/study-path";
import type { Message, Topic } from "@/lib/types";

interface StudyPathProps {
  topic:    Topic;
  messages: Message[];
  disabled: boolean;
  onPick:   (question: string) => void;
}

/**
 * The guided Study-mode ladder. Shows the whole path so the route is visible
 * up front, checks off what's been covered, and highlights what's next —
 * while leaving the text input free for questions in between.
 */
export function StudyPath({ topic, messages, disabled, onPick }: StudyPathProps) {
  const done = doneStepIds(messages, topic.label);
  const next = nextStep(messages, topic.label);
  const complete = done.size === STUDY_STEPS.length;

  return (
    <div
      data-tour="chat-quick-starters"
      className="rounded-xl border border-border bg-card/60 px-3.5 py-3 animate-slide-up"
    >
      {/* Header: what this is + how far along */}
      <div className="flex items-center gap-2 mb-2.5">
        <Route size={13} className="text-primary shrink-0" />
        <span className="text-[11px] font-display font-semibold text-foreground">
          Study path
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {done.size} / {STUDY_STEPS.length}
        </span>
        {complete && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            all covered
          </span>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground hidden sm:inline">
          or just ask your own question below
        </span>
      </div>

      {/* The ladder — click any step, not just the next one */}
      <div className="flex flex-wrap gap-1.5">
        {STUDY_STEPS.map((step, i) => {
          const isDone = done.has(step.id);
          const isNext = next?.id === step.id;
          return (
            <button
              key={step.id}
              onClick={() => onPick(step.ask(topic.label))}
              disabled={disabled}
              title={step.ask(topic.label)}
              className={cn(
                "flex items-center gap-1.5 text-xs pl-2 pr-3 py-1.5 rounded-full border transition-all",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                isNext
                  ? "bg-primary/10 border-primary/30 text-primary font-medium ring-1 ring-primary/20"
                  : isDone
                    ? "bg-muted/50 border-border/70 text-muted-foreground hover:text-foreground"
                    : "bg-muted border-border text-muted-foreground hover:bg-primary/8 hover:border-primary/25 hover:text-primary"
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center font-mono text-[9px] shrink-0",
                  isDone
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : isNext
                      ? "bg-primary/20 text-primary"
                      : "bg-border/60 text-muted-foreground"
                )}
              >
                {isDone ? <Check size={9} strokeWidth={3} /> : i + 1}
              </span>
              {step.label}
              {isNext && <ArrowRight size={11} className="shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
