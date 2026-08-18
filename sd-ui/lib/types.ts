export type Difficulty = "easy" | "medium" | "hard";
export type Mode = "study" | "quiz" | "deep_dive";
export type CategoryId = "fund" | "stor" | "core" | "infra" | "adv";
export type AppSection = "dashboard" | "system-design" | "ood" | "sql" | "ml" | "dsa" | "practice" | "guides";

export interface Topic {
  id: string;
  label: string;
  cat: CategoryId;
  difficulty: Difficulty;
  desc: string;
  icon: string;          // Lucide icon name
  tags: string[];
  prompt: string;
}

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  sub: string;
  color: string;         // Tailwind text class e.g. "text-blue-500"
  bg: string;            // Tailwind bg  class e.g. "bg-blue-500/10"
  border: string;        // Tailwind ring class
  hex: string;           // Raw CSS color for SVG/inline use
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  streaming?: boolean;
}

export interface Source {
  text: string;
  source: string;
  page: number;
  similarity: number;
}

export interface ChatEvent {
  type: "token" | "sources" | "done" | "error";
  text?: string;
  data?: Source[];
  message?: string;
}

export interface TopicProgress {
  done: boolean;
  sessions?: number;
}

export type Progress = Record<string, TopicProgress>;

export interface ApiStatus {
  status: "ok" | "not_ready";
  chunks: number;
  message?: string;
}

// ── LLD / OOP theory reference (Theory tab inside Object Oriented Design) ──
// Reused as-is for the SQL Theory tab — the shape (title/oneLiner/prose
// content + an optional code panel) is language-agnostic.

export interface TheoryTopic {
  id: string;
  title: string;
  oneLiner: string;
  content: string;      // markdown prose — headers, bold, lists, tables. No backtick code spans/fences.
  code?: string;        // optional C++ snippet or plain-text/ASCII diagram, rendered in a code panel
  codeLabel?: string;   // small filename/label shown above the code panel, e.g. "singleton.cpp"
}

export interface TheoryCategory {
  id: string;
  label: string;
  icon: string;          // Lucide icon name
  sub: string;
  color: string;
  bg: string;
  border: string;
  hex: string;
  topics: TheoryTopic[];
}
