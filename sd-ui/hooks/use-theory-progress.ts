"use client";
import { useCallback, useEffect, useState } from "react";

// ── Theory-topic progress ────────────────────────────────────────────────────
// Separate from use-progress.ts (which tracks system-design *chat* topics under
// "sd_progress" and stores a richer TopicProgress record). Theory topics only
// ever need a boolean, and there are ~150 of them across three curricula, so
// this keeps a flat "namespace:topicId" -> true map.
//
// The namespace matters: SQL, OOD and ML topic ids are only unique within their
// own curriculum, so an unnamespaced key would let e.g. a shared slug in two
// sections tick each other off.
//
// Why a module-level store instead of plain useState: the topic grid and the
// topic detail view are sibling branches of the tree, and both need to read and
// write this. Per-hook state would let the detail view mark a topic done while
// the grid behind it kept showing it as unread until a remount. One shared map
// plus a subscriber set keeps every mounted consumer in step.

const KEY = "theory_progress_v1";

type DoneMap = Record<string, true>;

let cache: DoneMap = {};
let hydrated = false;
const listeners = new Set<() => void>();

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = JSON.parse(raw) as DoneMap;
  } catch {
    // Corrupt JSON, or storage blocked entirely (private mode / disabled
    // cookies). Progress is a convenience, never a correctness requirement —
    // start empty rather than taking the section down.
  }
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Quota exceeded or storage unavailable — in-memory state stays correct for
    // this session, it just won't survive a reload.
  }
}

function emit(): void {
  listeners.forEach(listener => listener());
}

const storageKey = (namespace: string, topicId: string) => `${namespace}:${topicId}`;

export interface TheoryProgress {
  isDone: (topicId: string) => boolean;
  toggleDone: (topicId: string) => void;
  markDone: (topicId: string) => void;
  /** How many of the given ids are done — used for per-category counts. */
  countDone: (topicIds: string[]) => number;
  /** Clears every topic in this namespace only, leaving other sections alone. */
  resetAll: () => void;
  /** Total done in this namespace, across all categories. */
  doneCount: number;
}

export function useTheoryProgress(namespace: string): TheoryProgress {
  const [, bump] = useState(0);

  useEffect(() => {
    const rerender = () => bump(n => n + 1);
    listeners.add(rerender);

    // Hydration is deliberately deferred to this effect rather than done at
    // module scope: reading localStorage during the server render (or the first
    // client render) would either throw or produce markup that disagrees with
    // the server's, and Next would flag the hydration mismatch.
    const wasHydrated = hydrated;
    hydrate();
    if (!wasHydrated) rerender();

    // Keep two tabs of the same curriculum from clobbering each other's counts.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== KEY) return;
      hydrated = false;
      hydrate();
      emit();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(rerender);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const isDone = useCallback(
    (topicId: string) => cache[storageKey(namespace, topicId)] === true,
    [namespace]
  );

  const toggleDone = useCallback(
    (topicId: string) => {
      const k = storageKey(namespace, topicId);
      if (cache[k]) delete cache[k];
      else cache[k] = true;
      persist();
      emit();
    },
    [namespace]
  );

  const markDone = useCallback(
    (topicId: string) => {
      const k = storageKey(namespace, topicId);
      if (cache[k]) return;
      cache[k] = true;
      persist();
      emit();
    },
    [namespace]
  );

  const countDone = useCallback(
    (topicIds: string[]) => topicIds.reduce((n, id) => n + (isDone(id) ? 1 : 0), 0),
    [isDone]
  );

  const resetAll = useCallback(() => {
    const prefix = `${namespace}:`;
    for (const k of Object.keys(cache)) {
      if (k.startsWith(prefix)) delete cache[k];
    }
    persist();
    emit();
  }, [namespace]);

  const prefix = `${namespace}:`;
  const doneCount = Object.keys(cache).filter(k => k.startsWith(prefix)).length;

  return { isDone, toggleDone, markDone, countDone, resetAll, doneCount };
}
