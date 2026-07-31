"use client";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Only render theme-dependent classes after mount — prevents hydration mismatch
  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="flex items-center gap-1 bg-muted border border-border rounded-full p-1 transition-colors hover:border-border/80"
    >
      <span className={cn(
        "flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200",
        mounted && !isDark ? "bg-background shadow-sm text-amber-500" : "text-muted-foreground"
      )}>
        <Sun size={13} />
      </span>
      <span className={cn(
        "flex items-center justify-center w-6 h-6 rounded-full transition-all duration-200",
        mounted && isDark ? "bg-background shadow-sm text-violet-400" : "text-muted-foreground"
      )}>
        <Moon size={13} />
      </span>
    </button>
  );
}
