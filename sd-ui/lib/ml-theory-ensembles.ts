import type { TheoryTopic } from "./types";

export const ML_ENSEMBLES_TOPICS: TheoryTopic[] = [
  {
    id: "bagging-vs-boosting",
    title: "Bagging vs. Boosting",
    oneLiner: "Two different ways to combine many weak models into one strong model — one trains them in parallel to fight variance, the other trains them in sequence to fight bias.",
    content: `**Bagging** and **boosting** are both *ensemble* techniques — they combine many individual models into one stronger prediction — but they combine them in fundamentally different ways, and each one fixes a different problem.

| | Bagging | Boosting |
|---|---|---|
| Training | Parallel, independent models | Sequential — each model corrects the previous one's errors |
| Reduces | Variance | Bias |
| Example algorithm | Random Forest | XGBoost, Gradient Boosting |

## Bagging (Bootstrap Aggregating)
Bagging trains many copies of the same base model **independently and in parallel**, each on a different random bootstrap sample (sampling with replacement) of the training data, then averages their predictions for regression or takes a majority vote for classification. Because the models are trained independently, their individual errors tend to be somewhat uncorrelated and partially cancel out when combined — which is precisely why bagging reduces **variance**: a single deep, unpruned decision tree tends to overfit and swing wildly with small changes in training data, but averaging hundreds of such trees, as a Random Forest does, smooths that swing out substantially, without necessarily changing the ensemble's underlying bias.

## Boosting
Boosting trains models **sequentially**, where each new model is deliberately built to fix the mistakes the ensemble has made so far — rather than being an independent, parallel attempt at the whole problem. This directly attacks **bias**: a single weak model, such as a shallow decision "stump," systematically underfits, and each subsequent model chips away specifically at the errors the ensemble is still making, gradually reducing that systematic underfitting round by round.

## A Concrete Contrast
Imagine predicting house prices with a single, deep, unpruned decision tree: it likely overfits, since small changes to the training set produce very different trees — high variance. Training 200 such trees on different bootstrap samples and averaging them (bagging, as in a Random Forest) smooths that instability out. Now contrast that with starting from one shallow tree that consistently underpredicts high-value houses — high bias. Boosting fixes this by adding new shallow trees one at a time, each one specifically trained to predict the previous ensemble's remaining error, gradually correcting that systematic underprediction rather than reducing variance.`,
  },

  {
    id: "gradient-boosting-mechanics",
    title: "Gradient Boosting Mechanics",
    oneLiner: "An ensemble built one weak model at a time, where every new model's only job is to predict what the current ensemble is still getting wrong.",
    content: `Gradient boosting's core idea: build many weak models — almost always shallow decision trees — **sequentially**, where each new tree's entire job is to predict the **residual errors** left over by the combined ensemble built so far. The final prediction is simply the sum of every tree's contribution: \`Final = Model1 + Model2 + Model3 + ... + ModelN\`.

## Worked Example
Suppose the true house price is \`$300K\`. Model1, trained directly on the raw data, predicts \`$250K\` — a residual (error) of \`$50K\` remains. Model2 is trained not on the original target, but on that \`$50K\` residual, and predicts \`$30K\`; the running combined prediction is now \`$250K + $30K = $280K\`, leaving a residual of only \`$20K\`. Model3 is trained on that \`$20K\` residual, predicts \`$15K\`, pushing the combined prediction to \`$295K\`. Each subsequent tree chips away at whatever error is still left, and the ensemble's prediction converges toward the true value one small correction at a time.

## Why "Negative Gradient" Is the General Version of "Residual"
The formal description is that each new tree is trained on the **negative gradient of the loss function with respect to the current predictions** — the direction that would most reduce the loss if the ensemble moved a small step that way. That sounds more abstract than "predict the residual," but for the common case of **squared error loss**, the negative gradient works out to be mathematically identical to the leftover residual. That's why "fit the next tree to the residual" is the standard shorthand for gradient boosting in general, even though other loss functions — log loss for classification, for example — technically fit something slightly different at each step.

## Key Hyperparameters
- **\`n_estimators\`** — the number of trees, or boosting rounds. More trees keep reducing training error but eventually risk overfitting.
- **\`learning_rate\`** — how much each tree's prediction is allowed to contribute to the running total. A lower learning rate is more robust against overfitting but needs more trees (a higher \`n_estimators\`) to reach the same accuracy.
- **\`max_depth\`** — controls the complexity of each individual tree; boosting typically uses shallow trees (depth 3–6) since it relies on *many* weak learners rather than a few strong, deep ones.
- **\`subsample\`** — the fraction of rows randomly used to train each tree, which injects randomness similar to bagging and helps reduce overfitting.`,
  },

  {
    id: "xgboost-improvements",
    title: "XGBoost — What It Adds Over Vanilla Gradient Boosting",
    oneLiner: "The same sequential boosting idea as Gradient Boosting, with concrete engineering upgrades that make it faster and harder to overfit.",
    content: `XGBoost (eXtreme Gradient Boosting) is not a different algorithm from vanilla gradient boosting — it's the same sequential, residual-correcting boosting idea, with a specific set of engineering and mathematical improvements layered on top.

| Improvement | What It Does |
|---|---|
| Built-in regularization | An L1/L2 penalty is baked directly into the training objective, resisting overfitting more effectively than vanilla gradient boosting |
| Second-order gradients | Uses both the gradient *and* the Hessian (second derivative) of the loss to choose splits, giving more accurate splits than gradient-only approaches |
| Handles missing values | Learns the best default direction — left or right — to send missing values at each split, automatically, during training |
| Parallelized tree building | Searches for the best split across features in parallel — but only *within* building a single tree |
| Built-in early stopping | Can automatically halt training once validation performance stops improving, without a separate manual loop |

## Concrete Example: Missing-Value Handling
Suppose an \`income\` feature is missing for 15% of rows. Instead of requiring a separate imputation step — filling gaps with a mean or median before training even starts — XGBoost tries, at every candidate split on \`income\`, sending all the missing-value rows to the left child and, separately, to the right child, measures which direction produces a better reduction in loss, and keeps that direction as the learned default for missing data at that split. This is learned per split, directly from the data, rather than decided once upfront for the whole column.

## The Nuance Worth Stating Explicitly
"Parallelized" is easy to overstate. XGBoost is still **fundamentally sequential across trees** — tree 5 cannot be built until tree 4 exists, because tree 5 is trained on the residual errors tree 4, and everything before it, left behind. What XGBoost actually parallelizes is the **work done to build a single tree**: evaluating many candidate features and split points simultaneously across CPU cores. So within one tree, split-finding is parallel; across the boosting sequence of trees, the process remains strictly one-after-another, exactly like vanilla gradient boosting.`,
  },
];
