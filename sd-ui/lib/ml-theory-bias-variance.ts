import type { TheoryTopic } from "./types";

export const ML_BIAS_VARIANCE_TOPICS: TheoryTopic[] = [
  {
    id: "bias-variance-tradeoff",
    title: "The Bias-Variance Tradeoff",
    oneLiner: "Every model sits somewhere between too simple to see the pattern and too complex to see past the noise — total error bottoms out somewhere in between, never at either extreme.",
    content: `**Bias** is error from a model being too simple to capture the real pattern in the data; **variance** is error from a model being so complex that it fits noise specific to the training set instead of the underlying signal. The two move in opposite directions as model complexity changes, which is what makes this a genuine *tradeoff* rather than something to simply minimize on both fronts at once.

- **High bias (underfitting):** the model is too simple, misses real relationships in the data, and performs poorly on **both** the training set and the test set — it never learned enough to do well anywhere.
- **High variance (overfitting):** the model is too complex, fits noise along with signal, and performs very well on the training set but poorly on the test set — it learned the training data too specifically to generalize.

## Worked Example: Fitting a Curve
| Model | Train fit | Test fit | Diagnosis |
|---|---|---|---|
| Degree-1 line | Poor — misses the curve | Equally poor | Underfitting — high bias |
| Degree-15 polynomial | Near-perfect | Poor — wild swings between points | Overfitting — high variance |
| Degree-3 polynomial | Good | Good, close to the training result | Near the bias-variance sweet spot |

The degree-1 line is too rigid to follow a curved relationship, producing the same mediocre error whether it's shown training data or brand-new data. The degree-15 polynomial threads through every training point, noise included, but oscillates wildly between them, producing predictions that fail to generalize. The degree-3 polynomial captures the real curve without chasing every noisy wiggle in it.

## The Shape of the Tradeoff
As model complexity increases, bias steadily decreases while variance steadily increases; total expected error — \`bias^2 + variance + irreducible error\` — traces a U-shape: high at both extremes, lowest somewhere in the middle. **Irreducible error** is the noise floor inherent to the problem itself (measurement noise, missing information the features simply don't capture) that no model, however well-tuned, can eliminate — it sets a floor beneath which no amount of tuning will push the total error.`,
  },

  {
    id: "overfitting-diagnosis-and-fixes",
    title: "Overfitting — Diagnosis and Three Distinct Fixes",
    oneLiner: "Overfitting has one clear diagnostic signature and three genuinely distinct fixes — not the same fix restated three different ways.",
    content: `## Diagnosis
The signature of overfitting is training accuracy that stays high, or keeps climbing, while test (or validation) accuracy **decreases**. That specific word matters — describing test performance as "increasing" under overfitting is a common and easy-to-make reversal to avoid. It's the growing gap between the two curves, not either number alone, that confirms overfitting is actually happening.

## Worked Example
Training a decision tree with no depth limit can push training accuracy to 99% — the tree has essentially memorized individual rows — while test accuracy sits at only 65%. Limiting \`max_depth\` to 5 lowers training accuracy to a more modest 90%, but raises test accuracy to 84%: a net improvement in what actually matters, despite looking "worse" on the number that's easiest to watch during training.

## Three Genuinely Distinct Fixes
1. **Regularization (L1/L2)** — adds a penalty for large weights directly into the loss function, discouraging the model from bending itself around training-specific noise just to shave off a little more training error.
2. **Early stopping** — track performance on a separate validation set throughout training, and stop the instant validation performance starts degrading, even if training performance is still improving. In a typical run, training loss and validation loss fall together for the first several epochs; the moment they diverge — training loss still falling, validation loss turning back upward — is the point to stop and keep that checkpoint's weights, not the final epoch's.
3. **Reduce model complexity** — for trees: limit \`max_depth\`, require a minimum number of samples per leaf, or prune after growing; for neural networks: use fewer layers or parameters, or apply **dropout**, which randomly disables a fraction of neurons on each training pass so the network can't over-rely on any single one.

These are three separate levers, not the same idea said three different ways. "Just get more data" helps too, but it's a fourth, different lever — not a substitute for understanding these three.`,
  },

  {
    id: "l1-vs-l2-regularization",
    title: "L1 vs. L2 Regularization",
    oneLiner: "L1 can delete a feature outright by zeroing its coefficient; L2 can only ever turn the volume down, never all the way to zero — and the reason is geometric.",
    content: `Both **L1 (Lasso)** and **L2 (Ridge)** regularization add a penalty term to the loss function to discourage overly large coefficients, but they penalize differently and produce noticeably different models:

| | L1 (Lasso) | L2 (Ridge) |
|---|---|---|
| Penalty | Sum of the absolute values of the weights | Sum of the squared values of the weights |
| Effect | Can shrink coefficients to **exactly zero** | Shrinks toward zero, rarely exactly zero |
| Use case | Automatic feature selection, sparse models | Many correlated predictors — keep all features, reduce influence |

As formulas, the two penalty terms added to the loss function are \`lambda * sum(abs(w_i))\` for L1 and \`lambda * sum(w_i^2)\` for L2, where \`w_i\` ranges over the model's weights and \`lambda\` controls how strongly the penalty is enforced. In plain language: **L1 deletes the useless stuff entirely; L2 calms everything down a little and keeps it all.**

## Worked Example
Suppose a linear regression predicts house price from 10 features, of which only 3 are genuinely predictive — square footage, location score, and age — and the other 7 are irrelevant noise columns. With enough regularization strength, **L1** drives all 7 irrelevant coefficients to precisely \`0.000\`, leaving a sparse 3-feature model as a natural side effect of fitting. **L2**, given the same 10 features, shrinks the 7 irrelevant coefficients toward small values like \`0.02\`, \`-0.01\`, and \`0.03\` — smaller and less influential, but never landing exactly on zero — while keeping all 10 features technically active in the model.

## Why L1 Can Hit Exactly Zero and L2 Can't
This comes down to the geometry of each penalty's constraint region. L1's constraint region is a diamond in two dimensions (a cross-polytope in higher dimensions) — a shape with sharp **corners** sitting exactly on the axes, where one coefficient equals zero. The loss function's optimum frequently lands right on one of those corners. L2's constraint region is a smooth circle or sphere, with no corners anywhere — the optimum can get arbitrarily close to an axis but has nothing sharp to land on exactly, so shrinkage approaches zero without ever quite reaching it.`,
  },

  {
    id: "curse-of-dimensionality",
    title: "The Curse of Dimensionality",
    oneLiner: "Adding features doesn't just add information — it exponentially dilutes the data density that distance-based methods depend on.",
    content: `As the number of features in a dataset grows, the volume of the space those features define grows **exponentially**, while the number of available data points typically does not. The practical effect: points that felt densely packed in low dimensions become sparse and isolated in high dimensions, and any method relying on "nearby" points — k-nearest-neighbors, clustering, similarity search — starts to break down, because distance itself stops being meaningful once every point ends up roughly equidistant from every other point.

## Worked Example: A Neighborhood That Isn't Local Anymore
To capture 10% of the data lying within a local neighborhood along a single feature, a sub-interval covering 10% of that feature's range is enough. To capture that same 10% of the data in a 10-dimensional feature space, a neighborhood must extend along **each** of the 10 dimensions to roughly \`0.1^(1/10)\` of that dimension's full range — which works out to about 79%. A neighborhood intended to stay small ends up spanning nearly the entire range of every feature; it is no longer "local" in any useful sense.

## Worked Example: Data Requirements Growing Exponentially
Covering a single feature's range with points spaced no more than 0.1 apart takes about 10 points. Achieving that same spacing along **every** axis of a 10-dimensional space takes roughly \`10^10\` — ten billion — points. The resolution along each individual feature never changed, yet the data required to maintain it exploded exponentially with every dimension added.

## Why This Matters Beyond the Math
This is exactly why **feature selection** and **dimensionality reduction** (e.g., PCA, or an L1 penalty driving irrelevant coefficients to zero) matter in practice: cutting irrelevant or redundant features isn't just about a tidier model, it's what keeps the effective dimensionality low enough for the available data to actually cover the space it needs to generalize over. Regularization serves a related purpose here — by shrinking or eliminating the influence of weakly informative features, it lowers the model's effective complexity even when every raw feature technically remains present in the dataset.`,
  },
];
