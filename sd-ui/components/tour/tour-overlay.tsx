"use client";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/lib/tour-steps";

interface TourOverlayProps {
  steps: TourStep[];
  active: boolean;
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onEnd: () => void;
}

interface Rect { top: number; left: number; width: number; height: number; }

const PAD = 6; // spotlight padding around the target element
const CARD_WIDTH = 300;

export function TourOverlay({ steps, active, stepIndex, onNext, onPrev, onEnd }: TourOverlayProps) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const measure = useCallback(() => {
    const step = steps[stepIndex];
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
    // offsetParent is null for display:none elements (e.g. the sidebar,
    // which is hidden below the md breakpoint) — treat that as "not found"
    // rather than spotlighting a collapsed zero-size box.
    if (!el || el.offsetParent === null) { setRect(null); return; }
    el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [steps, stepIndex]);

  useEffect(() => {
    if (!active) return;
    // Let scrollIntoView settle before the final measurement.
    measure();
    const t = setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, measure]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, onEnd, onNext, onPrev]);

  if (!mounted || !active) return null;
  const step = steps[stepIndex];
  if (!step) return null;

  const isLast = stepIndex === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100]" aria-live="polite">
      {/* Spotlight cutout — box-shadow covers the viewport except the target rect */}
      {rect ? (
        <div
          className="fixed rounded-xl transition-all duration-300 ease-out pointer-events-none ring-2 ring-primary"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}

      {/* Tooltip card — precisely placed next to its target, or centered as
          a fallback when the target isn't currently visible (e.g. sidebar
          steps on a narrow viewport where it's hidden). */}
      {(
        <div
          className="fixed z-[101] w-[300px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-elevated p-4 animate-fade-in"
          style={rect ? cardPosition(rect, step.placement) : centeredPosition()}
        >
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="font-display font-bold text-[13.5px] text-foreground leading-snug">
              {step.title}
            </p>
            <button
              onClick={onEnd}
              aria-label="Skip tour"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors -mt-0.5 -mr-0.5"
            >
              <X size={15} />
            </button>
          </div>
          <p className="text-[12.5px] text-muted-foreground leading-relaxed mb-3">
            {step.body}
          </p>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    i === stepIndex ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {stepIndex > 0 && (
                <button
                  onClick={onPrev}
                  aria-label="Previous step"
                  className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <ArrowLeft size={13} />
                </button>
              )}
              <button
                onClick={onNext}
                className="flex items-center gap-1 h-7 px-3 rounded-lg bg-primary text-primary-foreground text-[12px] font-medium hover:bg-primary/90 transition-colors"
              >
                {isLast ? "Done" : "Next"}
                {!isLast && <ArrowRight size={12} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function centeredPosition(): React.CSSProperties {
  return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
}

function cardPosition(rect: Rect, placement: "top" | "bottom" | "left" | "right"): React.CSSProperties {
  const gap = 14;
  const margin = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = CARD_WIDTH;
  const cardHeight = 230; // generous estimate (longest step body + title + footer), keeps every step on-screen

  // Compute each placement's box edges directly (no transform), so clamping
  // is just "keep this rectangle inside the viewport" — no anchor confusion.
  let x: number, y: number;

  if (placement === "right") {
    x = rect.left + rect.width + gap;
    y = rect.top + rect.height / 2 - cardHeight / 2;
  } else if (placement === "left") {
    x = rect.left - gap - cardWidth;
    y = rect.top + rect.height / 2 - cardHeight / 2;
  } else if (placement === "bottom") {
    x = rect.left + rect.width / 2 - cardWidth / 2;
    y = rect.top + rect.height + gap;
  } else {
    x = rect.left + rect.width / 2 - cardWidth / 2;
    y = rect.top - gap - cardHeight;
  }

  x = Math.min(Math.max(x, margin), vw - cardWidth - margin);
  y = Math.min(Math.max(y, margin), vh - cardHeight - margin);

  return { top: y, left: x };
}
