"use client";
import { Clock, CheckCircle2, Circle, ArrowRight } from "lucide-react";

interface Step { label: string; sub: string; done: boolean; active?: boolean; }

const STEPS: Step[] = [
  { label: "GitHub repos fetched",       sub: "443 docs — donnemartin + karanpratapsingh + ByteByteGo", done: true },
  { label: "993 / 2,052 chunks cached",  sub: "Progress saved to embedding_cache.json",                done: true },
  { label: "Resume after 11 AM Kuwait",  sub: "python ingest.py — picks up from chunk 993",            done: false, active: true },
  { label: "Launch",                     sub: "python server.py — chat goes live",                     done: false },
];

export function SetupBanner() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-6 animate-fade-in">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-500 shrink-0">
          <Clock size={18} />
        </div>
        <div>
          <p className="font-display font-semibold text-sm text-foreground">Knowledge base is building — chat arrives soon</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gemini embedding quota hit (1,000/day). Resets <strong className="text-foreground">11:00 AM Kuwait time</strong> tomorrow.
          </p>
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="flex flex-col sm:flex-row gap-2">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className={`flex-1 flex items-start gap-2.5 rounded-lg px-3 py-2.5 border text-xs transition-colors
              ${step.done   ? "bg-emerald-500/8 border-emerald-500/25"
              : step.active ? "bg-amber-500/8 border-amber-500/25"
              :               "bg-muted/40 border-border"}`}
          >
            <span className={`mt-0.5 shrink-0 ${step.done ? "text-emerald-500" : step.active ? "text-amber-500" : "text-muted-foreground"}`}>
              {step.done ? <CheckCircle2 size={13} /> : step.active ? <ArrowRight size={13} /> : <Circle size={13} />}
            </span>
            <div className="min-w-0">
              <p className={`font-medium leading-tight truncate ${step.done ? "text-emerald-600 dark:text-emerald-400" : step.active ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                {step.label}
              </p>
              <p className="text-muted-foreground text-[10px] mt-0.5 font-mono truncate">{step.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
