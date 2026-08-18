import type { TheoryCategory } from "./types";
import { SQL_FUNDAMENTALS_TOPICS } from "./sql-theory-fundamentals";
import { SQL_JOINS_TOPICS } from "./sql-theory-joins";
import { SQL_WINDOW_FUNCTIONS_TOPICS } from "./sql-theory-window-functions";
import { SQL_SUBQUERIES_TOPICS } from "./sql-theory-subqueries";
import { SQL_TRANSACTIONS_TOPICS } from "./sql-theory-transactions";
import { SQL_INDEXING_TOPICS } from "./sql-theory-indexing";
import { SQL_DESIGN_TOPICS } from "./sql-theory-design";
import { SQL_MISTAKES_TOPICS } from "./sql-theory-mistakes";

// ── Theory curriculum for the SQL "Theory" tab ──────────────────────────────
// Structure (not content) cross-referenced against xoraus/CrackingTheSQLInterview
// on GitHub, plus the standard "top interview SQL" topic set — used purely as
// a table-of-contents outline. All explanations and code below are written
// from scratch, targeting PostgreSQL-flavored ANSI SQL.

export const SQL_THEORY_CATEGORIES: TheoryCategory[] = [
  {
    id: "sql-fundamentals",
    label: "Query Fundamentals",
    icon: "Play",
    sub: "Execution order, WHERE vs HAVING, GROUP BY, CASE, NULLs",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    hex: "#3b82f6",
    topics: SQL_FUNDAMENTALS_TOPICS,
  },
  {
    id: "sql-joins",
    label: "Joins & Set Operations",
    icon: "GitMerge",
    sub: "Inner/outer/self joins, UNION vs UNION ALL",
    color: "text-teal-500 dark:text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    hex: "#14b8a6",
    topics: SQL_JOINS_TOPICS,
  },
  {
    id: "sql-window-functions",
    label: "Window Functions",
    icon: "LineChart",
    sub: "PARTITION BY, RANK/DENSE_RANK, LAG/LEAD, running totals",
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    hex: "#8b5cf6",
    topics: SQL_WINDOW_FUNCTIONS_TOPICS,
  },
  {
    id: "sql-subqueries",
    label: "Subqueries & CTEs",
    icon: "Layers3",
    sub: "Correlated subqueries, WITH, recursive CTEs, pivoting",
    color: "text-fuchsia-500 dark:text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    hex: "#d946ef",
    topics: SQL_SUBQUERIES_TOPICS,
  },
  {
    id: "sql-transactions",
    label: "Transactions & Concurrency",
    icon: "Lock",
    sub: "ACID, isolation levels, locking & deadlocks",
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    hex: "#f59e0b",
    topics: SQL_TRANSACTIONS_TOPICS,
  },
  {
    id: "sql-indexing",
    label: "Indexes & Query Optimization",
    icon: "Gauge",
    sub: "Clustered vs non-clustered, EXPLAIN, anti-patterns",
    color: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    hex: "#f43f5e",
    topics: SQL_INDEXING_TOPICS,
  },
  {
    id: "sql-design",
    label: "Database Design & Constraints",
    icon: "Boxes",
    sub: "Normalization, denormalization, keys & constraints",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    hex: "#10b981",
    topics: SQL_DESIGN_TOPICS,
  },
  {
    id: "sql-mistakes",
    label: "Interview Patterns & Cheat Sheet",
    icon: "AlertTriangle",
    sub: "Command families, plus the mistakes that sneak in under pressure",
    color: "text-sky-500 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    hex: "#0ea5e9",
    topics: SQL_MISTAKES_TOPICS,
  },
];

export const TOTAL_SQL_THEORY_TOPICS = SQL_THEORY_CATEGORIES.reduce((sum, c) => sum + c.topics.length, 0);

// Flattened, ordered list of every topic paired with its category — powers
// "next/previous" navigation across the whole curriculum in SqlTheoryDetail.
export interface FlatSqlTheoryTopic {
  category: TheoryCategory;
  topic: TheoryCategory["topics"][number];
}

export const FLAT_SQL_THEORY_TOPICS: FlatSqlTheoryTopic[] = SQL_THEORY_CATEGORIES.flatMap(category =>
  category.topics.map(topic => ({ category, topic }))
);

export function getSqlTheoryTopicIndex(topicId: string): number {
  return FLAT_SQL_THEORY_TOPICS.findIndex(t => t.topic.id === topicId);
}
