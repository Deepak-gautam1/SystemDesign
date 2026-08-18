import type { TheoryTopic } from "./types";

export const ML_ANSWER_FRAMEWORKS_TOPICS: TheoryTopic[] = [
  {
    id: "name-the-mechanism",
    title: "Name the Mechanism, Not Just the Stage",
    oneLiner: "A general strategy name loses points — the specific, named technique that implements it is what's actually being listened for.",
    content: `Every ML interview question about "how would you handle X" rewards the same underlying move: **state the general approach, then immediately name the specific, concrete technique that actually implements it.** Stopping at the general strategy sounds like a vague gesture toward knowledge rather than command of the material — an interviewer can't tell "understands this deeply" from "has heard this phrase before" until a specific mechanism gets named.

## The Pattern, With Corrections
- Weak: "I'd do feature selection." Strong: "I'd use correlation filtering, Lasso regularization, or tree-based feature importance — depending on whether the goal is automatic sparsity or just a quick importance ranking."
- Weak: "I'd handle the imbalance with a good model." Strong: "I'd use SMOTE oversampling or class weights — model choice and imbalance-handling are two separate decisions, and a strong model trained naively on imbalanced data still mostly predicts the majority class, since that minimizes training error."
- Weak: "I'd fix overfitting with more data." Strong: "Regularization, early stopping, and reducing model complexity are three genuinely distinct mechanisms — more data helps too, but it's a fourth lever, not a substitute for understanding the other three."

## Why This Specific Gap Costs Points
"More data" as a catch-all answer to overfitting is a common trap: it isn't wrong, but repeating a single idea three times in different words signals that only one lever is actually understood. A question like "how would you address this" is usually listening for **breadth of distinct mechanisms**, not conviction about one.

## The Drill
After stating any general ML strategy out loud, force the sentence to continue: "…specifically using X." If no specific X comes to mind, that's the exact gap worth closing before the next practice round — not the general concept, but the concrete technique underneath it.`,
  },

  {
    id: "model-improvement-template",
    title: "The Five-Step Model-Improvement Template",
    oneLiner: "A structured answer shape for any 'how would you improve this model' question, in the order it's expected to be heard.",
    content: `"How would you improve this model" is one of the most common open-ended ML interview questions, and it rewards a **structured five-step answer** far more than a scattered list of things that might help.

## The Five Steps, In Order
1. **Diagnose first** — is this a bias problem or a variance problem? Check the gap between training and validation/test performance before proposing any fix; a fix aimed at the wrong problem (e.g. adding regularization to a model that's underfitting) makes things worse, not better.
2. **If underfitting (high bias):** add features, increase model complexity, or reduce regularization strength — the model isn't capturing enough signal yet.
3. **If overfitting (high variance):** apply regularization, gather more training data, use bagging/ensembling, or reduce model complexity — the model is capturing noise along with signal.
4. **Tune everything via cross-validation** — and never touch the test set until the very last step; the test set exists to estimate real-world performance exactly once, not to guide iteration along the way.
5. **Match the metric to the actual business problem** before declaring anything "improved" — a model that raises accuracy while making recall worse on a fraud-detection task hasn't actually improved, even though one popular number went up.

## Why the Order Matters
Steps 2 and 3 are opposites — proposing both at once, or skipping the diagnosis in step 1 entirely, signals that the bias/variance framework isn't actually connected to the specific fixes being listed. Naming the diagnosis explicitly, out loud, before naming any fix, is what separates a structured answer from a grab-bag of buzzwords recited in no particular order.`,
  },

  {
    id: "cost-sensitive-framing",
    title: "Cost-Sensitive Framing — Metrics Meet Business Risk",
    oneLiner: "Every metric-tradeoff question is secretly asking about the asymmetric real-world cost of two different kinds of mistakes.",
    content: `Precision/recall tradeoffs, Type I vs. Type II error framing, and "which error is worse" business-context questions are all the **same underlying question wearing different vocabulary**: which of the two ways a model can be wrong costs more in this specific situation?

## The Two Kinds of Wrong
- A **false positive (Type I error)** — the model flags something that wasn't actually true. In fraud detection: a legitimate transaction gets declined.
- A **false negative (Type II error)** — the model misses something that was actually true. In fraud detection: an actual fraudulent transaction goes through untouched.

## Worked Example: Fraud Detection
High recall paired with low precision means catching almost all real fraud, at the cost of also flagging many legitimate transactions. The reasoning worth stating explicitly: a missed fraud case (direct financial loss, potential reputational damage) is usually more expensive than a false alarm (a declined transaction the customer can resolve with one phone call) — so many fraud systems deliberately lean toward recall. **This isn't unconditional** — enough false positives cause real customer friction and churn, so the right balance point is set by the actual relative costs in that specific business, not by "maximize recall no matter what."

## The Answer Shape to Reuse
When asked "which would you prioritize, precision or recall" with no scenario given: state plainly that it depends on the relative cost of each error type, give one example of when precision matters more and one of when recall matters more, then offer the F1 score as a reasonable default if a single number is truly required. When a scenario *is* given, apply the reasoning to it directly rather than staying abstract — the interviewer has already handed over the exact information the general answer was trying to ask for.

## If the Framing Is Genuinely Unclear
Asking a direct clarifying question — "is this reasoning about a specific scenario like fraud detection, or in general?" — is always a stronger move than guessing silently or freezing. Asking a good question out loud demonstrates the same reasoning process an open-ended question is trying to evaluate in the first place.`,
  },

  {
    id: "ml-interview-checklist",
    title: "Pre-Interview Quick-Recall Checklist",
    oneLiner: "The exact things worth being able to say out loud, from memory, right before an ML interview.",
    content: `Read through this once before walking into an interview — everything on it should be explainable **out loud, from memory, in under thirty seconds each.**

## The Checklist
- **Why accuracy can be misleading, and what to check instead** — class distribution first, then the confusion matrix, then precision/recall or ROC-AUC.
- **The precision/recall tradeoff, as a reasoning shape** — not a memorized number, but the "it depends on relative error cost" answer structure, ready to apply to whatever scenario gets described.
- **Bagging vs. boosting, with one named example of each** — Random Forest for bagging, XGBoost or Gradient Boosting for boosting.
- **Why L1 can zero out a coefficient but L2 can't** — the absolute-value penalty has a sharp corner at zero that the squared penalty doesn't, so gradient-based shrinkage can land exactly on it.
- **Why tree-based models need no feature scaling** — they split on thresholds within one feature at a time, never comparing magnitude across features.
- **Two specific, named techniques each for:** feature selection (e.g. Lasso, tree-based importance), handling class imbalance (e.g. SMOTE, class weights), and fixing overfitting (e.g. regularization, early stopping).
- **What ROC-AUC measures that accuracy doesn't** — ranking positive cases above negative cases across every possible threshold, not performance at one fixed cutoff.
- **The five-step "how would you improve this model" answer shape** — diagnose bias vs. variance first, apply the matching fix, tune via cross-validation, hold the test set back until the end, match the metric to the business problem.

## How to Use This List
Say each item out loud, unscripted, before checking it against the description above. A concept that's only recognizable when read, but can't be reproduced from a blank prompt, isn't actually ready yet — and that exact gap is what a live interview will expose.`,
  },
];
