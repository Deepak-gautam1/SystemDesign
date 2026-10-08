import type { TheoryCategory } from "./types";
import { AI_LLM_INTERNALS_TOPICS } from "./ai-theory-llm-internals";
import { AI_LLM_TRAINING_TOPICS } from "./ai-theory-llm-training";
import { AI_LLM_ADAPTATION_TOPICS } from "./ai-theory-llm-adaptation";
import { AI_LLM_INFERENCE_TOPICS } from "./ai-theory-llm-inference";
import { AI_GENERATIVE_MULTIMODAL_TOPICS } from "./ai-theory-generative-multimodal";
import { AI_RETRIEVAL_GROUNDING_TOPICS } from "./ai-theory-retrieval-grounding";
import { AGENTIC_FOUNDATIONS_TOPICS } from "./agentic-theory-foundations";

// ── Theory curriculum for the Artificial Intelligence panel ─────────────────
// Kept apart from Machine Learning on purpose: ML holds the classical
// curriculum (algorithms, statistics, deep learning, NLP fundamentals), while
// this one follows a modern model from the inside out — internals, pretraining
// and post-training, fine-tuning and compression, inference, multimodal
// models — and then the systems built on top of it: retrieval and RAG, and
// agents.
//
// Unlike ML, a topic here may carry a code panel: the agent topics ship
// runnable Python. The model-level topics stay prose-only, with formulas as
// inline backtick spans, and the detail shell drops to a single column for them.

export const AI_THEORY_CATEGORIES: TheoryCategory[] = [
  {
    id: "ai-llm-internals",
    label: "LLM Architecture & Internals",
    icon: "Cpu",
    sub: "Tokenization, the decoder-only block, positional encoding, mixture of experts",
    color: "text-indigo-500 dark:text-indigo-400",
    bg: "bg-indigo-500/10",
    border: "border-indigo-500/30",
    hex: "#6366f1",
    topics: AI_LLM_INTERNALS_TOPICS,
  },
  {
    id: "ai-llm-training",
    label: "Pretraining & Post-Training",
    icon: "GraduationCap",
    sub: "Scaling laws, supervised fine-tuning, RLHF vs DPO, reasoning models",
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    hex: "#f59e0b",
    topics: AI_LLM_TRAINING_TOPICS,
  },
  {
    id: "ai-llm-adaptation",
    label: "Fine-Tuning & Model Compression",
    icon: "Shrink",
    sub: "LoRA & QLoRA, quantization, knowledge distillation",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    hex: "#10b981",
    topics: AI_LLM_ADAPTATION_TOPICS,
  },
  {
    id: "ai-llm-inference",
    label: "LLM Inference & Serving",
    icon: "Gauge",
    sub: "Decoding & sampling, the KV cache, continuous batching, speculative decoding",
    color: "text-sky-500 dark:text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    hex: "#0ea5e9",
    topics: AI_LLM_INFERENCE_TOPICS,
  },
  {
    id: "ai-generative-multimodal",
    label: "Generative & Multimodal Models",
    icon: "WandSparkles",
    sub: "Diffusion models, vision transformers, CLIP & vision-language models",
    color: "text-rose-500 dark:text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    hex: "#f43f5e",
    topics: AI_GENERATIVE_MULTIMODAL_TOPICS,
  },
  {
    id: "ai-retrieval-grounding",
    label: "Retrieval, RAG & Grounding",
    icon: "ScanSearch",
    sub: "Embedding models, vector indexes, RAG pipelines, hallucination",
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    hex: "#8b5cf6",
    topics: AI_RETRIEVAL_GROUNDING_TOPICS,
  },
  {
    id: "ai-agent-foundations",
    label: "AI Agent Foundations",
    icon: "Bot",
    sub: "Workflows vs agents, the agent loop from scratch, ReAct, planning, reflection",
    color: "text-teal-500 dark:text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    hex: "#14b8a6",
    topics: AGENTIC_FOUNDATIONS_TOPICS,
  },
];

export const TOTAL_AI_THEORY_TOPICS = AI_THEORY_CATEGORIES.reduce((sum, c) => sum + c.topics.length, 0);

// Flattened, ordered list of every topic paired with its category — powers
// "next/previous" navigation across the whole curriculum in AiTheoryDetail.
export interface FlatAiTheoryTopic {
  category: TheoryCategory;
  topic: TheoryCategory["topics"][number];
}

export const FLAT_AI_THEORY_TOPICS: FlatAiTheoryTopic[] = AI_THEORY_CATEGORIES.flatMap(category =>
  category.topics.map(topic => ({ category, topic }))
);

export function getAiTheoryTopicIndex(topicId: string): number {
  return FLAT_AI_THEORY_TOPICS.findIndex(t => t.topic.id === topicId);
}

// Compact syllabus digest for the general tutor — same role as ML_SYLLABUS in
// ml-theory.ts: the full surface area to draw questions from, without handing
// the model every topic's prose.
export const AI_SYLLABUS = AI_THEORY_CATEGORIES
  .map(c => `${c.label}: ${c.topics.map(t => t.title).join(", ")}`)
  .join("\n");
