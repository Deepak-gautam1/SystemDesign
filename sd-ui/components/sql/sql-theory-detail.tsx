"use client";
import { TheoryDetailShell } from "@/components/theory/theory-detail-shell";
import { SqlCodeBlock } from "./sql-code-block";
import type { TheoryCategory, TheoryTopic } from "@/lib/types";

interface FlatRef {
  topic: TheoryTopic;
  category: TheoryCategory;
}

interface SqlTheoryDetailProps {
  topic: TheoryTopic;
  category: TheoryCategory;
  onBack: () => void;
  prev?: FlatRef;
  next?: FlatRef;
  onNavigate: (topicId: string) => void;
}

export function SqlTheoryDetail(props: SqlTheoryDetailProps) {
  return (
    <TheoryDetailShell
      {...props}
      subject="sql"
      namespace="sql"
      defaultCodeLabel="example.sql"
      tutorTourId="sql-tutor"
      renderCode={code => <SqlCodeBlock code={code} />}
    />
  );
}
