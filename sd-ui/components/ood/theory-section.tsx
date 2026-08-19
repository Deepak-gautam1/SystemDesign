"use client";
import { ExternalLink } from "lucide-react";
import { TheoryBrowser } from "@/components/theory/theory-browser";
import { THEORY_CATEGORIES, TOTAL_THEORY_TOPICS } from "@/lib/theory";

interface TheorySectionProps {
  onSelectTopic: (topicId: string) => void;
}

export function TheorySection({ onSelectTopic }: TheorySectionProps) {
  return (
    <TheoryBrowser
      namespace="ood"
      categories={THEORY_CATEGORIES}
      idPrefix="ood-cat"
      tourId="theory-grid"
      onSelectTopic={onSelectTopic}
      intro={
        <p className="text-[12.5px] text-muted-foreground leading-relaxed max-w-2xl">
          {TOTAL_THEORY_TOPICS} topics covering OOP fundamentals, class relationships, design principles,
          all the classic design patterns, UML, and concurrency — everything worth knowing before an LLD
          interview. Curriculum structure inspired by{" "}
          <a
            href="https://github.com/ashishps1/awesome-low-level-design"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            ashishps1/awesome-low-level-design <ExternalLink size={10} />
          </a>
          .
        </p>
      }
    />
  );
}
