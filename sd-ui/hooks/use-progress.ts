"use client";
import { useState, useCallback, useEffect } from "react";
import type { Progress, TopicProgress } from "@/lib/types";

const KEY = "sd_progress";

export function useProgress() {
  const [progress, setProgress] = useState<Progress>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setProgress(JSON.parse(stored));
    } catch {}
  }, []);

  const markDone = useCallback((topicId: string) => {
    setProgress(prev => {
      const next = { ...prev, [topicId]: { ...prev[topicId], done: true } as TopicProgress };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isDone = useCallback((topicId: string) => !!progress[topicId]?.done, [progress]);

  const doneCount = Object.values(progress).filter(p => p.done).length;

  return { progress, markDone, isDone, doneCount };
}
