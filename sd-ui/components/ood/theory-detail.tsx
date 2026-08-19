"use client";
import { TheoryDetailShell } from "@/components/theory/theory-detail-shell";
import { CppCodeBlock } from "./code-block";
import type { TheoryCategory, TheoryTopic } from "@/lib/types";

interface FlatRef {
  topic: TheoryTopic;
  category: TheoryCategory;
}

interface TheoryDetailProps {
  topic: TheoryTopic;
  category: TheoryCategory;
  onBack: () => void;
  prev?: FlatRef;
  next?: FlatRef;
  onNavigate: (topicId: string) => void;
}

export function TheoryDetail(props: TheoryDetailProps) {
  return (
    <TheoryDetailShell
      {...props}
      subject="ood"
      namespace="ood"
      defaultCodeLabel="example.cpp"
      tutorTourId="ood-tutor"
      renderCode={code => <CppCodeBlock code={code} />}
    />
  );
}
