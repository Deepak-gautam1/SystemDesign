"use client";
import { useState, useEffect, useCallback } from "react";

const KEY = "sd_sidebar_collapsed";

export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (stored) setCollapsed(stored === "true");
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem(KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  return { collapsed, toggle };
}
