"use client";
import { ExternalLink } from "lucide-react";
import { TheoryBrowser } from "@/components/theory/theory-browser";
import { ML_THEORY_CATEGORIES, TOTAL_ML_THEORY_TOPICS } from "@/lib/ml-theory";

interface MlTheorySectionProps {
  onSelectTopic: (topicId: string) => void;
}

export function MlTheorySection({ onSelectTopic }: MlTheorySectionProps) {
  return (
    <TheoryBrowser
      namespace="ml"
      categories={ML_THEORY_CATEGORIES}
      idPrefix="ml-cat"
      jumpNav
      tourId="ml-theory-grid"
      onSelectTopic={onSelectTopic}
      intro={
        <p className="text-[12.5px] text-muted-foreground leading-relaxed max-w-3xl">
          {TOTAL_ML_THEORY_TOPICS} topics spanning the classical algorithms, evaluation and diagnosis,
          feature engineering, statistics, deep learning, NLP and LLMs, ML system design, and production
          concerns — plus reusable answer frameworks for open-ended questions. Everything worth knowing
          before an ML interview, theory only, no coding required. Curriculum scope cross-referenced with{" "}
          <a
            href="https://github.com/andrewekhalel/MLQuestions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            andrewekhalel/MLQuestions <ExternalLink size={10} />
          </a>
          {" "}and widely-used interview question banks.
        </p>
      }
    />
  );
}
