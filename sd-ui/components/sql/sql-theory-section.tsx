"use client";
import { ExternalLink } from "lucide-react";
import { TheoryBrowser } from "@/components/theory/theory-browser";
import { SQL_THEORY_CATEGORIES, TOTAL_SQL_THEORY_TOPICS } from "@/lib/sql-theory";

interface SqlTheorySectionProps {
  onSelectTopic: (topicId: string) => void;
}

export function SqlTheorySection({ onSelectTopic }: SqlTheorySectionProps) {
  return (
    <TheoryBrowser
      namespace="sql"
      categories={SQL_THEORY_CATEGORIES}
      idPrefix="sql-cat"
      tourId="sql-theory-grid"
      onSelectTopic={onSelectTopic}
      intro={
        <p className="text-[12.5px] text-muted-foreground leading-relaxed max-w-2xl">
          {TOTAL_SQL_THEORY_TOPICS} topics covering execution order, joins, window functions, subqueries,
          transactions, indexing, pagination, and database design — everything worth knowing before a SQL
          interview. Curriculum scope cross-referenced with{" "}
          <a
            href="https://github.com/xoraus/CrackingTheSQLInterview"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            xoraus/CrackingTheSQLInterview <ExternalLink size={10} />
          </a>
          .
        </p>
      }
    />
  );
}
