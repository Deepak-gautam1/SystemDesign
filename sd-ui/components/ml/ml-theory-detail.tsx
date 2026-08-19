"use client";
import { TheoryDetailShell } from "@/components/theory/theory-detail-shell";
import type { TheoryCategory, TheoryTopic } from "@/lib/types";

interface FlatRef {
  topic: TheoryTopic;
  category: TheoryCategory;
}

interface MlTheoryDetailProps {
  topic: TheoryTopic;
  category: TheoryCategory;
  onBack: () => void;
  prev?: FlatRef;
  next?: FlatRef;
  onNavigate: (topicId: string) => void;
}

// No renderCode: ML theory is prose-only, with formulas and identifiers as
// inline backtick spans inside content rather than a side panel. The shell
// falls back to a single centred column when no code renderer is supplied.
export function MlTheoryDetail(props: MlTheoryDetailProps) {
  return (
    <TheoryDetailShell
      {...props}
      subject="ml"
      namespace="ml"
      tutorTourId="ml-test-knowledge"
    />
  );
}
