"use client";
import { TheoryDetailShell } from "@/components/theory/theory-detail-shell";
import { PythonCodeBlock } from "@/components/agentic/python-code-block";
import type { TheoryCategory, TheoryTopic } from "@/lib/types";

interface FlatRef {
  topic: TheoryTopic;
  category: TheoryCategory;
}

interface AiTheoryDetailProps {
  topic: TheoryTopic;
  category: TheoryCategory;
  onBack: () => void;
  prev?: FlatRef;
  next?: FlatRef;
  onNavigate: (topicId: string) => void;
}

// Only the agent topics carry code (runnable Python). The model-level topics
// are prose-only, and the shell lays those out as a single centred column.
export function AiTheoryDetail(props: AiTheoryDetailProps) {
  return (
    <TheoryDetailShell
      {...props}
      subject="ai"
      namespace="ai"
      defaultCodeLabel="example.py"
      tutorTourId="ai-test-knowledge"
      renderCode={code => <PythonCodeBlock code={code} />}
    />
  );
}
