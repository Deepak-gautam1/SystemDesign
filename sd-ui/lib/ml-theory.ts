import type { TheoryCategory } from "./types";
import { ML_EVALUATION_METRICS_TOPICS } from "./ml-theory-evaluation-metrics";
import { ML_BIAS_VARIANCE_TOPICS } from "./ml-theory-bias-variance";
import { ML_FEATURE_ENGINEERING_TOPICS } from "./ml-theory-feature-engineering";
import { ML_ENSEMBLES_TOPICS } from "./ml-theory-ensembles";
import { ML_DIMENSIONALITY_REDUCTION_TOPICS } from "./ml-theory-dimensionality-reduction";
import { ML_NEURAL_NETWORKS_TOPICS } from "./ml-theory-neural-networks";
import { ML_ADVANCED_ARCHITECTURES_TOPICS } from "./ml-theory-advanced-architectures";
import { ML_ANSWER_FRAMEWORKS_TOPICS } from "./ml-theory-answer-frameworks";

// ── Theory curriculum for the Machine Learning panel ────────────────────────
// Theory-only by design — no coding problems, no code panels. Scope combines
// a candidate's own ML interview prep notes (evaluation metrics, feature
// engineering, ensembles, answer frameworks) with the broader conceptual
// ground covered by github.com/andrewekhalel/MLQuestions (dimensionality
// reduction, deep learning fundamentals, generative vs discriminative,
// Bayesian vs frequentist) — used as a table-of-contents outline, not copied.
// All explanations below are written from scratch.

export const ML_THEORY_CATEGORIES: TheoryCategory[] = [
  {
    id: "ml-evaluation-metrics",
    label: "Evaluation Metrics & Model Diagnosis",
    icon: "Target",
    sub: "Accuracy pitfalls, precision/recall, ROC-AUC, cross-validation",
    color: "text-blue-500 dark:text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    hex: "#3b82f6",
    topics: ML_EVALUATION_METRICS_TOPICS,
  },
  {
    id: "ml-bias-variance",
    label: "Bias, Variance & Regularization",
    icon: "Scale",
    sub: "The bias-variance tradeoff, overfitting fixes, L1 vs L2",
    color: "text-teal-500 dark:text-teal-400",
    bg: "bg-teal-500/10",
    border: "border-teal-500/30",
    hex: "#14b8a6",
    topics: ML_BIAS_VARIANCE_TOPICS,
  },
  {
    id: "ml-feature-engineering",
    label: "Feature Engineering & Data Prep",
    icon: "SlidersHorizontal",
    sub: "Feature selection, scaling, class imbalance, encoding",
    color: "text-amber-500 dark:text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    hex: "#f59e0b",
    topics: ML_FEATURE_ENGINEERING_TOPICS,
  },
  {
    id: "ml-ensembles",
    label: "Ensemble Methods",
    icon: "Trees",
    sub: "Bagging vs boosting, gradient boosting, XGBoost",
    color: "text-emerald-500 dark:text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    hex: "#10b981",
    topics: ML_ENSEMBLES_TOPICS,
  },
  {
    id: "ml-dimensionality-reduction",
    label: "Dimensionality Reduction",
    icon: "Minimize2",
    sub: "PCA, LDA, t-SNE & UMAP",
    color: "text-cyan-500 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    hex: "#06b6d4",
    topics: ML_DIMENSIONALITY_REDUCTION_TOPICS,
  },
  {
    id: "ml-neural-networks",
    label: "Neural Network Fundamentals",
    icon: "Network",
    sub: "Activations, gradient descent, backprop, CNNs, RNNs/LSTMs",
    color: "text-violet-500 dark:text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    hex: "#8b5cf6",
    topics: ML_NEURAL_NETWORKS_TOPICS,
  },
  {
    id: "ml-advanced-architectures",
    label: "Advanced Architectures & Statistics",
    icon: "Sparkles",
    sub: "Autoencoders, GANs, Transformers, Bayesian vs frequentist",
    color: "text-fuchsia-500 dark:text-fuchsia-400",
    bg: "bg-fuchsia-500/10",
    border: "border-fuchsia-500/30",
    hex: "#d946ef",
    topics: ML_ADVANCED_ARCHITECTURES_TOPICS,
  },
  {
    id: "ml-answer-frameworks",
    label: "Interview Answer Frameworks",
    icon: "ClipboardCheck",
    sub: "Reusable answer shapes for open-ended ML questions",
    color: "text-pink-500 dark:text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/30",
    hex: "#ec4899",
    topics: ML_ANSWER_FRAMEWORKS_TOPICS,
  },
];

export const TOTAL_ML_THEORY_TOPICS = ML_THEORY_CATEGORIES.reduce((sum, c) => sum + c.topics.length, 0);

// Flattened, ordered list of every topic paired with its category — powers
// "next/previous" navigation across the whole curriculum in MlTheoryDetail.
export interface FlatMlTheoryTopic {
  category: TheoryCategory;
  topic: TheoryCategory["topics"][number];
}

export const FLAT_ML_THEORY_TOPICS: FlatMlTheoryTopic[] = ML_THEORY_CATEGORIES.flatMap(category =>
  category.topics.map(topic => ({ category, topic }))
);

export function getMlTheoryTopicIndex(topicId: string): number {
  return FLAT_ML_THEORY_TOPICS.findIndex(t => t.topic.id === topicId);
}

// Compact syllabus digest (category → topic titles) handed to the general,
// not-scoped-to-one-topic "Test Your Knowledge" interview so the model knows
// the full surface area it can draw questions from without embedding all
// 33 topics' full prose as context.
export const ML_SYLLABUS = ML_THEORY_CATEGORIES
  .map(c => `${c.label}: ${c.topics.map(t => t.title).join(", ")}`)
  .join("\n");
