"use client";
import { useState, useEffect, useCallback } from "react";

const KEY = "sd_recent_topics";
const MAX = 6;

export function useRecentTopics() {
  const [recentIds, setRecentIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setRecentIds(JSON.parse(stored));
    } catch {}
  }, []);

  const addRecent = useCallback((topicId: string) => {
    setRecentIds(prev => {
      const next = [topicId, ...prev.filter(id => id !== topicId)].slice(0, MAX);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { recentIds, addRecent };
}
