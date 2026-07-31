"use client";
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { Source } from "@/lib/types";

export function SourcePanel({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (!sources.length) return null;

  return (
    <div className="mt-2 ml-10">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        {sources.length} source{sources.length > 1 ? "s" : ""} referenced
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-2">
          {sources.map((s, i) => (
            <div key={i} className="rounded-lg border border-border overflow-hidden text-xs">
              <div className="flex items-center justify-between px-3 py-1.5 bg-muted/60 border-b border-border">
                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[280px]">
                  {s.source} · pg {s.page}
                </span>
                <span className="font-mono text-[9px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full shrink-0 ml-2">
                  {Math.round(s.similarity * 100)}%
                </span>
              </div>
              <p className="px-3 py-2 font-mono text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                {s.text.slice(0, 300)}{s.text.length > 300 ? "…" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
