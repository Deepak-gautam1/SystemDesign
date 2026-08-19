import type { TheoryTopic } from "./types";

export const ML_EVALUATION_METRICS_TOPICS: TheoryTopic[] = [
  {
    id: "accuracy-and-class-imbalance",
    title: "Why Accuracy Can Lie — Check Class Balance First",
    oneLiner: "A high accuracy score can hide a model that never catches the thing it was built to catch — always check the class distribution before trusting it.",
    content: `When a model reports 98% accuracy, the right first reaction isn't celebration — it's a question: **what does the class distribution actually look like?** Accuracy treats every correct prediction as equally meaningful, and that assumption quietly breaks down the moment one class vastly outnumbers the other.

## Worked Example
Consider a fraud-detection dataset of 10,000 transactions, of which 9,900 (99%) are legitimate and 100 (1%) are fraudulent — a realistic split for real-world fraud data. A model that outputs "not fraud" for every single transaction, without inspecting a single feature, gets 9,900 of 10,000 predictions correct: \`9,900 / 10,000 = 99% accuracy\` — while catching exactly zero of the 100 fraud cases it exists to catch. A model reporting a slightly less extreme 98% accuracy could just as easily be a minor variation on that same do-nothing strategy.

## What to Check Instead of Trusting the Headline Number
- **Class distribution first** — what fraction of the data belongs to each class, before interpreting any accuracy figure.
- **The confusion matrix** — how many true positives, false positives, false negatives, and true negatives actually make up that number.
- **Precision and recall** — do they tell a story the accuracy number was hiding entirely?

## A Reusable Answer Shape
"Before celebrating, I'd check the class distribution — if this is something like fraud detection where maybe only 1-2% of cases are positive, 98% accuracy could be achieved by a model that barely does anything useful. I'd look at the confusion matrix, specifically precision and recall, rather than trusting accuracy alone."

## The Same Skepticism Applies to Model Comparisons
"Is 85% accuracy really better than 82%?" deserves the same scrutiny as a single suspiciously high number. A 3-point gap can easily be noise rather than a genuine improvement — check whether the difference is statistically significant given the sample size, and confirm both models were evaluated on data with the same class balance, before declaring either one meaningfully better.`,
  },

  {
    id: "precision-vs-recall",
    title: "Precision vs. Recall — Reasoning Through the Tradeoff",
    oneLiner: "There's no universally \"correct\" choice between precision and recall — the question tests whether the relative cost of two kinds of mistakes gets reasoned through out loud.",
    content: `Precision and recall each answer a different question about the same set of positive predictions:

| Metric | Formula | Prioritize when... |
|---|---|---|
| Precision | \`TP / (TP + FP)\` | False positives are expensive — e.g., wrongly blocking a legitimate customer |
| Recall | \`TP / (TP + FN)\` | False negatives are expensive — e.g., missing actual fraud or a real disease case |

## Worked Example
Return to the fraud-detection dataset from before: 10,000 transactions, 100 of them truly fraudulent. Suppose an actual model — not the do-nothing baseline — flags 120 transactions as suspicious, of which 90 are genuinely fraudulent (true positives) and 30 are legitimate transactions wrongly blocked (false positives): precision is \`90 / (90 + 30) = 75%\`. Of the 100 truly fraudulent transactions, this model caught 90 and missed 10 (false negatives): recall is \`90 / (90 + 10) = 90%\`. Loosening the model's decision threshold to flag even more transactions would likely catch some of those remaining 10 fraud cases, raising recall — at the cost of blocking more legitimate customers too, lowering precision. That trade is the entire tension these two metrics exist to expose.

## There Is No Universally "Right" Answer
A question like "which would you prefer, precision or recall?" tests reasoning about business context, not a search for one correct number. The reusable answer shape:
- State plainly that it depends on the relative cost of each error type.
- If missing a positive is very costly — fraud, disease, safety — lean toward **recall**, even at the cost of more false positives.
- If a false positive is very costly or disruptive — unnecessarily blocking a legitimate customer — lean toward **precision**.
- If forced to pick one balanced number with no further context, fall back to the **F1 score**.
- If a specific scenario is given, apply the reasoning to it directly instead of staying abstract.

This is the same tradeoff as **Type I error (false positive) vs. Type II error (false negative)** costs from classical statistics, wearing different vocabulary.`,
  },

  {
    id: "f1-score-and-pr-curves",
    title: "F1 Score & the Precision-Recall Curve",
    oneLiner: "F1 punishes a lopsided precision/recall split far more harshly than a plain average would — which is exactly why it's the standard single-number compromise.",
    content: `**F1 score** is the harmonic mean of precision and recall: \`F1 = 2 * (precision * recall) / (precision + recall)\`. It's the standard default when a single balanced number is needed and no business context points clearly toward precision or recall alone.

## Why Harmonic Mean, Specifically
A harmonic mean punishes a large gap between two numbers far more severely than an arithmetic mean would. Consider a model with 100% precision but only 1% recall — it almost never flags anything positive, but is always right the rare times it does. The arithmetic mean would report a misleadingly comfortable \`(100% + 1%) / 2 = 50.5%\`. The harmonic mean instead computes \`2 * (1.0 * 0.01) / (1.0 + 0.01)\`, which works out to roughly 2% — correctly reflecting that a model catching almost nothing is a bad model, no matter how trustworthy its rare positive calls are. F1 refuses to reward one strong number while ignoring a collapsed one.

## Weighting Recall or Precision More Heavily: F-beta
The general form, **F-beta**, adds a weighting factor: \`F_beta = (1 + beta^2) * (precision * recall) / (beta^2 * precision + recall)\`. F2 (beta = 2) weights recall twice as heavily as precision — suited to something like disease screening, where a missed case is far costlier than a false alarm. F0.5 weights precision more heavily — suited to something like a spam filter, where wrongly trashing a real email is worse than letting an occasional spam message through.

## The Precision-Recall Curve
Plotting precision against recall across every possible decision threshold produces the **PR curve**; the area beneath it (PR-AUC) summarizes performance the way ROC-AUC does, but is far more informative on heavily imbalanced data. Example: with 100 fraud cases among 10,000 transactions, a model producing 500 false positives still has a low false-positive *rate* (500 out of 9,900 legitimate transactions, about 5%) — which looks flattering on an ROC curve — but if only 80 of those 580 flagged transactions are real fraud, precision is a poor 13.8%, and the PR curve exposes that immediately where ROC does not.`,
  },

  {
    id: "roc-auc-vs-accuracy",
    title: "ROC-AUC vs. Accuracy",
    oneLiner: "AUC-ROC measures whether positives rank above negatives across every possible threshold — accuracy only ever judges one fixed cutoff.",
    content: `**Accuracy** evaluates a model at exactly one decision threshold (typically 0.5). **AUC-ROC** measures something broader: the model's ability to **rank** positive cases higher than negative cases, across every possible threshold at once. Concretely, AUC is the probability that a randomly chosen positive example receives a higher predicted score than a randomly chosen negative example — an AUC of 0.9 means a real fraud case outscores a legitimate transaction 90% of the time when the two are compared head-to-head.

## Why This Matters on Imbalanced Data
Return to the earlier fraud example: 9,900 legitimate transactions and 100 fraud cases. A model that predicts "not fraud" for everything scores 99% accuracy, but it has produced no meaningful ranking at all — every transaction receives an identical score, so nothing can outrank anything else. Its discriminative power, measured as AUC-ROC, collapses to exactly \`0.5\` — identical to random guessing — immediately revealing what the accuracy number was hiding. A perfect model, by contrast, achieves an AUC of \`1.0\`: every fraud case ranks above every legitimate transaction, at every threshold.

## A Reusable Answer Template
1. State which metric is preferred for this situation.
2. Explain precisely why the alternative — accuracy — fails here (typically: class imbalance lets a trivial majority-class prediction score deceptively high).
3. Explain the specific mechanism the preferred metric uses (ranking performance across all thresholds, not one fixed cutoff).
4. Close with the practical recommendation — e.g., use AUC-ROC for model comparison and threshold-free evaluation, then pick a final operating threshold separately, based on whatever precision/recall tradeoff actually fits the business need.

## One Caveat Worth Naming
On severely imbalanced data, ROC-AUC can still look flatteringly high even when precision at realistic thresholds is poor, because its false-positive-rate denominator (all true negatives) is huge. That's exactly why the precision-recall curve is often reported alongside it rather than instead of it.`,
  },

  {
    id: "cross-validation-and-splits",
    title: "Cross-Validation & Train/Validation/Test Splits",
    oneLiner: "A single train/test split is one noisy performance estimate — cross-validation trades extra compute for a far more trustworthy average.",
    content: `A single train/test split produces exactly one performance estimate, and that estimate carries real variance — a "lucky" or "unlucky" split can shift accuracy by several points purely based on which rows happened to land in the test set. **Cross-validation** fixes this by averaging performance across multiple splits instead of trusting just one.

## k-Fold Cross-Validation
Split the dataset into k equal folds (standard choice: k = 5 or k = 10). Train on k-1 folds, validate on the remaining fold, then rotate which fold is held out until every fold has served as the validation set exactly once, and average the k results together. Worked example: a 1,000-row dataset split into 5 folds of 200 rows each might produce per-fold accuracies of 82%, 85%, 79%, 88%, and 81% — averaging to **83%**, a far more stable estimate than any single one of those five numbers, and one that also reveals the model's performance swings by roughly 4 points either way depending on the split.

## Stratified k-Fold
Ordinary random folds can accidentally concentrate a rare class into just one or two folds. **Stratified k-fold** preserves the original class proportions within every fold — essential on imbalanced data, such as the 99%/1% fraud split discussed elsewhere in this curriculum, so no fold ends up with too few, or zero, positive examples to evaluate against.

## Time-Series Data Needs a Different Approach Entirely
Random k-fold must never be used on time-ordered data, because it can train on rows from *after* the point being predicted, leaking future information into training. Instead, use **rolling or expanding window splits**: train on days 1-100, validate on days 101-120; then train on days 1-120, validate on days 121-140; and so on — always validating on a slice that comes strictly after everything the model was trained on.

## Where the Held-Out Test Set Fits In
Cross-validation typically operates over a train/validation split, used for tuning; a final **test set** stays completely untouched until the very end, producing one honest, unbiased estimate of real-world performance rather than a number that's been quietly tuned toward.`,
  },

  {
    id: "regression-metrics",
    title: "Regression Metrics — RMSE, MAE & R-Squared",
    oneLiner: "Precision and recall have no meaning when the target is continuous — and the three standard regression metrics answer three genuinely different questions.",
    content: `Every classification metric assumes a discrete label, so predicting a house's sale price needs an entirely different toolkit. The three that matter measure error in the target's own units, error robust to outliers, and error relative to a do-nothing baseline.

## The Three Standard Metrics

| Metric | Formula | What it says |
|---|---|---|
| **MAE** | \`mean(abs(y - y_hat))\` | Average miss, in the target's units — outlier-robust |
| **RMSE** | \`sqrt(mean((y - y_hat)^2))\` | Average miss, in the target's units — punishes large errors |
| **R²** | \`1 - (SS_res / SS_tot)\` | Fraction of variance explained, relative to predicting the mean |

**RMSE** and **MAE** are both expressed in the units of the target, which makes them directly interpretable — an RMSE of \`$25,000\` on house prices means something concrete to a stakeholder in a way that R² does not. The difference is how they treat a big miss: because RMSE squares errors before averaging, one badly mispriced mansion moves it far more than it moves MAE. RMSE is therefore preferred when large errors are disproportionately costly, and MAE when every dollar of error counts equally.

## Worked Example
Predicting prices for four houses with errors of \`$10K\`, \`$10K\`, \`$10K\`, and \`$100K\`: MAE is \`(10 + 10 + 10 + 100) / 4 = $32.5K\`, while RMSE is \`sqrt((100 + 100 + 100 + 10000) / 4) = $50.7K\`. Both describe the same four predictions, but RMSE is substantially higher because that single \`$100K\` miss dominates once squared. A gap of that size between the two metrics is itself diagnostic — it says the error distribution has a heavy tail rather than being evenly spread.

## R² and the Adjusted Version
**R²** answers a different question entirely: how much better is this model than simply predicting the mean of the target every time. An R² of \`0.75\` means the model explains 75% of the variance. Its trap is that **R² never decreases when a feature is added** — even pure noise nudges it upward — which makes it useless for comparing models of differing complexity. **Adjusted R²** applies a penalty for the number of predictors and can decrease, which is why it is the honest choice for that comparison.

## One Caveat Worth Naming
R² is unitless and therefore tempting to read as a universal quality score, but what counts as good is entirely domain-dependent — an R² of \`0.3\` can be a strong result when predicting human behavior, and \`0.95\` can indicate leakage in a setting where that much predictability is implausible. **MAPE** (mean absolute percentage error) expresses error as a percentage, which travels better across differently-scaled targets, but it breaks down whenever actual values approach zero.`,
  },
];
