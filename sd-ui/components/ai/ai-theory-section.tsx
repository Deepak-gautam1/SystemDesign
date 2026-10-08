"use client";
import { TheoryBrowser } from "@/components/theory/theory-browser";
import { AI_THEORY_CATEGORIES, TOTAL_AI_THEORY_TOPICS } from "@/lib/ai-theory";

interface AiTheorySectionProps {
  onSelectTopic: (topicId: string) => void;
}

export function AiTheorySection({ onSelectTopic }: AiTheorySectionProps) {
  return (
    <TheoryBrowser
      namespace="ai"
      categories={AI_THEORY_CATEGORIES}
      idPrefix="ai-cat"
      tourId="ai-theory-grid"
      onSelectTopic={onSelectTopic}
      intro={
        <p className="text-[12.5px] text-muted-foreground leading-relaxed max-w-3xl">
          {TOTAL_AI_THEORY_TOPICS} topics that follow a modern model from the inside out — how LLMs are built,
          pretrained and post-trained, fine-tuned, compressed and served, plus diffusion and multimodal
          models — and then the systems built on top of them: retrieval, RAG and grounding, and AI agents,
          with runnable Python beside the agent topics. Classical ML, deep learning and NLP fundamentals
          live in the Machine Learning section.
        </p>
      }
    />
  );
}
