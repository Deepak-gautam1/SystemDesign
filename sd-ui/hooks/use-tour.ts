"use client";
import { useState, useCallback } from "react";

/**
 * One tour instance, keyed by `id` (its own localStorage "seen" flag) so
 * multiple contextual tours (dashboard, chat, OOD, ...) can each auto-run
 * once, independently, the first time their trigger condition is met.
 */
export function useTour(id: string, stepCount: number) {
  const key = `sd_tour_${id}_completed`;
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const hasSeen = useCallback(() => {
    try { return localStorage.getItem(key) === "true"; } catch { return false; }
  }, [key]);

  const markSeen = useCallback(() => {
    try { localStorage.setItem(key, "true"); } catch {}
  }, [key]);

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  // Call from a useEffect gated on the section/state that means "the user
  // just reached this part of the app for the first time." No-ops (and
  // returns no cleanup) if already seen — caller decides whether another
  // tour is already active and should take priority.
  const autoStart = useCallback((delayMs = 500) => {
    if (hasSeen()) return undefined;
    const t = setTimeout(() => setActive(true), delayMs);
    return () => clearTimeout(t);
  }, [hasSeen]);

  const next = useCallback(() => {
    setStepIndex(i => {
      if (i + 1 >= stepCount) {
        setActive(false);
        markSeen();
        return i;
      }
      return i + 1;
    });
  }, [stepCount, markSeen]);

  const prev = useCallback(() => {
    setStepIndex(i => Math.max(0, i - 1));
  }, []);

  const end = useCallback(() => {
    setActive(false);
    markSeen();
  }, [markSeen]);

  return { active, stepIndex, start, autoStart, next, prev, end };
}
