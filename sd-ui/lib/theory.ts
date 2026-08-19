import type { TheoryCategory } from "./types";
import { FUNDAMENTALS_TOPICS } from "./theory-fundamentals";
import { RELATIONSHIP_TOPICS } from "./theory-relationships";
import { PRINCIPLE_TOPICS } from "./theory-principles";
import { CREATIONAL_PATTERNS } from "./theory-patterns-creational";
import { STRUCTURAL_PATTERNS } from "./theory-patterns-structural";
import { BEHAVIORAL_PATTERNS } from "./theory-patterns-behavioral";
import { UML_TOPICS } from "./theory-uml";
import { CONCURRENCY_TOPICS } from "./theory-concurrency";

// ── Theory curriculum for the OOD "Theory" tab ──────────────────────────────
// Structure (not content) inspired by the awesome-low-level-design GitHub repo
// by ashishps1 — used purely as a table-of-contents outline. All explanations
// and code below are written from scratch.

export const THEORY_CATEGORIES: TheoryCategory[] = [
  {
    id: "fundamentals",
    label: "OOP Fundamentals",
    icon: "Blocks",
    sub: "Classes, encapsulation, abstraction & the rest",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    hex: "#3b82f6",
    topics: FUNDAMENTALS_TOPICS,
  },
  {
    id: "relationships",
    label: "Class Relationships",
    icon: "Link2",
    sub: "Association, aggregation, composition & dependency",
    color: "text-teal-500 dark:text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    hex: "#14b8a6",
    topics: RELATIONSHIP_TOPICS,
  },
  {
    id: "principles",
    label: "Design Principles",
    icon: "Compass",
    sub: "DRY, YAGNI, KISS & the five SOLID principles",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    hex: "#10b981",
    topics: PRINCIPLE_TOPICS,
  },
  {
    id: "patterns-creational",
    label: "Creational Patterns",
    icon: "Boxes",
    sub: "Singleton, Factory Method, Abstract Factory, Builder, Prototype",
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    hex: "#8b5cf6",
    topics: CREATIONAL_PATTERNS,
  },
  {
    id: "patterns-structural",
    label: "Structural Patterns",
    icon: "Puzzle",
    sub: "Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy",
    color: "text-fuchsia-500 dark:text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    hex: "#d946ef",
    topics: STRUCTURAL_PATTERNS,
  },
  {
    id: "patterns-behavioral",
    label: "Behavioral Patterns",
    icon: "Workflow",
    sub: "Observer, Strategy, Command, State, Visitor & more",
    color: "text-pink-500 dark:text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    hex: "#ec4899",
    topics: BEHAVIORAL_PATTERNS,
  },
  {
    id: "uml",
    label: "UML Diagrams",
    icon: "Waypoints",
    sub: "Class, use case, sequence, activity & state machine diagrams",
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    hex: "#f59e0b",
    topics: UML_TOPICS,
  },
  {
    id: "concurrency",
    label: "Concurrency & Multi-threading",
    icon: "Cpu",
    sub: "Threads, locks, deadlocks & concurrency patterns",
    color: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    hex: "#f43f5e",
    topics: CONCURRENCY_TOPICS,
  },
];

export const TOTAL_THEORY_TOPICS = THEORY_CATEGORIES.reduce((sum, c) => sum + c.topics.length, 0);

// Flattened, ordered list of every topic paired with its category — powers
// "next/previous" navigation across the whole curriculum in TheoryDetail.
export interface FlatTheoryTopic {
  category: TheoryCategory;
  topic: TheoryCategory["topics"][number];
}

export const FLAT_THEORY_TOPICS: FlatTheoryTopic[] = THEORY_CATEGORIES.flatMap(category =>
  category.topics.map(topic => ({ category, topic }))
);

export function getTheoryTopicIndex(topicId: string): number {
  return FLAT_THEORY_TOPICS.findIndex(t => t.topic.id === topicId);
}

// Compact syllabus digest (category → topic titles) for the general, not-scoped-
// to-one-topic tutor — same role as ML_SYLLABUS in ml-theory.ts.
export const OOD_SYLLABUS = THEORY_CATEGORIES
  .map(c => `${c.label}: ${c.topics.map(t => t.title).join(", ")}`)
  .join("\n");
