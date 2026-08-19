import type { TheoryTopic } from "./types";

export const ML_FEATURE_ENGINEERING_TOPICS: TheoryTopic[] = [
  {
    id: "dependent-vs-independent-variables",
    title: "Dependent vs. Independent Variables",
    oneLiner: "The target being predicted versus the inputs used to predict it — and not every remaining column automatically qualifies as an input.",
    content: `In any supervised learning setup, the **dependent variable** (also called the target or label) is the thing being predicted — the output the model produces. The **independent variables** (features) are the inputs the model is given in order to produce that prediction. The relationship runs in one direction: the independent variables are assumed to inform or influence the dependent variable's value, not the other way around.

The part that trips people up in interviews isn't the definition itself — it's realizing that **not every column in a dataset is automatically a candidate independent variable.** Consider a credit-scoring dataset with columns \`name\`, \`year\`, and \`credit_score\`, where the task is to predict \`credit_score\`. It's tempting to treat every other column as a feature, but \`name\` doesn't belong on that list: it's an **identifier**, not a feature. A person's name has no genuine predictive or causal relationship to their creditworthiness — any correlation a model finds between specific names and credit scores would be spurious or coincidental, and could even act as a proxy for a protected attribute. Feeding it into the model doesn't just waste a column; it actively risks introducing **bias** into the predictions.

## How to Answer This Type of Question
1. Ask **"what specifically are we trying to predict?"** first — that answer is the dependent variable, full stop.
2. Look at everything else and separate genuine, informative features from identifiers, keys, or free-text labels that merely name a row rather than describe it.
3. Only the second group are real candidate independent variables.

\`year\` is a legitimate feature if it plausibly correlates with \`credit_score\` (for example, as a proxy for account age or credit history length); \`name\` never is. The general rule: an identifier uniquely labels *which row* this is, while a feature describes *something about* the row that could plausibly explain the target.`,
  },

  {
    id: "feature-selection-techniques",
    title: "Feature Selection — Named Techniques",
    oneLiner: "Four concrete, nameable techniques to reach for instead of the vague phrase 'do feature selection.'",
    content: `Feature selection means reducing a feature set down to the inputs that actually carry predictive signal — dropping the rest lowers overfitting risk, training time, and multicollinearity. Interviewers listen specifically for **named techniques**, not a general gesture at the idea of "selecting good features."

## The Four Techniques
| Technique | How It Works | Best For |
|---|---|---|
| Correlation filtering | Drop features with near-zero correlation to the target, or that are highly correlated with each other | A quick first pass; catching redundant features |
| Lasso (L1) regularization | Shrinks some model coefficients to exactly zero during training | Automatic, data-driven selection built into model fitting |
| Tree-based feature importance | Train a quick Random Forest or XGBoost, then read off its built-in importance scores | A fast ranking with no separate selection step |
| VIF (Variance Inflation Factor) | Quantifies how much a feature's variance is inflated by its correlation with other features | Pinpointing multicollinearity specifically |

**Correlation filtering** is the cheapest starting point: a feature with near-zero correlation to the target is unlikely to help, and two features correlated with each other above roughly 0.8–0.9 are largely carrying the same information, so dropping one loses little.

**Lasso (L1) regularization** goes a step further than merely shrinking coefficients toward zero, which is what L2/Ridge does — its penalty term can drive a coefficient to *exactly* zero. That functions as automatic feature selection built directly into the model-fitting process, rather than a separate preprocessing step.

**Tree-based feature importance** means training a fast Random Forest or XGBoost model purely to inspect its importance scores (such as mean decrease in impurity, or how often a feature is chosen for a split), then using that ranking to decide what to keep — even when the final production model isn't tree-based at all.

**VIF** is the tool that names multicollinearity specifically, rather than general irrelevance to the target: a VIF above \`5-10\` on a feature signals it's substantially explainable by a linear combination of the other features, and is a strong candidate to drop or combine with a related feature.`,
  },

  {
    id: "standardization-vs-normalization",
    title: "Standardization vs. Normalization",
    oneLiner: "Two rescaling formulas with very different outlier behavior — and a reminder that plenty of models need neither.",
    content: `**Standardization** and **normalization** both rescale numeric features so they're more comparable to one another, but they use different formulas, produce different ranges, and react very differently to outliers.

| | Standardization | Normalization (Min-Max) |
|---|---|---|
| Formula | \`z = (x - mean) / std_dev\` | \`x_scaled = (x - min) / (max - min)\` |
| Range | No fixed range | Fixed \`[0, 1]\` |
| Outlier sensitivity | More robust | Highly fragile |

## Why Normalization Breaks Down on Outliers
The fragility isn't just a fact to memorize — it follows directly from the formula. Min-max normalization anchors its entire scale to the dataset's \`min\` and \`max\`. A single extreme outlier *becomes* the new max, and every other, genuinely typical value gets compressed into a tiny sliver near the bottom of the \`[0, 1]\` range — destroying those values' distinguishability from one another.

**Concrete example:** take salaries \`[40K, 45K, 50K, 55K, 5000K]\`, where the last entry is a senior executive's genuinely much larger salary. After min-max normalization, that highest earner becomes exactly \`1.0\`, while the other four — despite being meaningfully different from each other before scaling (40K through 55K) — all get squeezed into roughly \`0.0\` to \`0.003\`. They become nearly indistinguishable to any downstream model, even though the real-world gap between a 40K and a 55K salary is substantial.

Standardization handles the same scenario far better, because the mean and standard deviation shift much less violently in response to one outlier than a raw min or max does — the four ordinary salaries would still land at meaningfully different, spread-out z-scores.

## The Exception: Tree-Based Models Need No Scaling At All
Decision trees, Random Forests, and gradient-boosted trees split on a threshold within *one* feature at a time (for example, "is \`income\` greater than 52,000?") — they never compare magnitudes *across* different features the way distance-based or gradient-based linear models do. Rescaling a feature doesn't change which split points a tree would choose, only the numbers labeling them, so standardizing or normalizing before feeding data into a tree-based model is simply unnecessary work.`,
  },

  {
    id: "handling-class-imbalance",
    title: "Handling Class Imbalance",
    oneLiner: "A powerful algorithm does not fix imbalance by itself — the data or the loss function has to be addressed directly, and the evaluation metric has to change too.",
    content: `The single most important thing to say first when asked about class imbalance: **choosing a stronger algorithm does not solve the problem by itself.** Even a powerful model like XGBoost, trained naively on a dataset that's 98% majority class and 2% minority class, will learn to mostly predict the majority class — because that strategy already minimizes overall training error. A model can reach 98% accuracy while never once correctly predicting the minority class, which is exactly why this is a data-and-training problem, not purely a model-choice problem.

## Two Independent Levers

**1. Resampling** — change the training data itself:
- **SMOTE (oversampling)** generates *synthetic* new minority-class examples by interpolating between existing minority-class points, rather than simply duplicating rows that already exist. This gives the model genuinely new — if artificial — minority examples to learn from, instead of repeating the same handful of points and overfitting to them specifically.
- **Undersampling** randomly removes majority-class examples until the classes are more balanced. It's simpler, but carries a real risk: discarding majority-class data can throw away genuinely useful signal, especially when there isn't an enormous surplus of it to spare.

**2. Class weights** — leave the data untouched and instead tell the model's loss function to penalize misclassifying the minority class more heavily than the majority class. This produces a similar rebalancing effect to resampling, but purely through training, with no synthetic data and no discarded rows.

## The Metric Has to Change Too
Fixing the training process is only half the job — **accuracy stops being a meaningful metric once classes are imbalanced**, since the trivial "always predict majority" model already scores well on it. The right metrics instead are **precision, recall, F1, or AUC-PR** (area under the precision-recall curve), because each of these is sensitive to how the model performs specifically on the minority class, rather than being dominated by how large that class is.

**Worked example:** in a fraud dataset that's 98% legitimate and 2% fraudulent, a model that predicts "legitimate" for every single transaction scores 98% accuracy while catching zero fraud. Recall on the fraud class would correctly reveal this as \`0%\`, exposing exactly what accuracy hid.`,
  },

  {
    id: "encoding-categorical-variables",
    title: "Encoding Categorical Variables",
    oneLiner: "The right encoding depends entirely on whether the categories have a genuine order — using the wrong one teaches the model a relationship that doesn't exist.",
    content: `Machine learning models expect numbers, not text, so categorical columns need to be converted into a numeric form before training. The choice of *how* to encode them isn't cosmetic — the wrong choice can quietly teach the model a false relationship that was never in the data.

## Label Encoding
Label encoding assigns each category an arbitrary integer. A \`color\` column with values \`{red, blue, green}\` might become \`{red: 0, blue: 1, green: 2}\`. That's fine for a computer to consume, but it silently implies an **ordinal relationship** — the model can now interpret \`green (2) > blue (1) > red (0)\`, as if green were somehow "more" than blue, or three times "more" than red. For a genuinely **nominal** (unordered) category like color, that implied relationship is meaningless and can actively mislead a model that's sensitive to magnitude, such as a linear or distance-based model.

## One-Hot Encoding
One-hot encoding avoids the false-ordering problem entirely by creating a **separate binary column per category** — \`is_red\`, \`is_blue\`, \`is_green\` — each holding \`0\` or \`1\`, with no implied ranking between them. The tradeoff is dimensionality: a column with 3 categories becomes 3 columns, but a column with 500 categories becomes 500 columns, which quickly becomes impractical for both memory and model performance. This is commonly called the **high-cardinality problem**.

## When Label Encoding Is Actually Correct
Label encoding isn't wrong in general — it's wrong specifically for *nominal* data. For a genuinely **ordinal** category where the order is real and meaningful, such as \`{low: 0, medium: 1, high: 2}\` for a risk or satisfaction rating, label encoding is not only acceptable but arguably preferable: the numeric order \`low < medium < high\` reflects a real relationship the model should be allowed to use directly.

## High-Cardinality Alternatives
When a nominal column has too many categories for one-hot encoding to be practical (zip codes, product IDs, user IDs), two common alternatives are:
- **Target encoding** — replace each category with a statistic of the target variable computed for that category (commonly its mean target value), compressing high cardinality into a single informative numeric column, with care taken to avoid leakage from the target into the encoding.
- **Learned embeddings** — represent each category as a small dense vector learned during training, popular in deep learning pipelines, which can capture similarity between categories that one-hot encoding would otherwise treat as entirely unrelated.`,
  },

  {
    id: "missing-data-and-imputation",
    title: "Missing Data — Why It's Missing Decides the Fix",
    oneLiner: "Reaching straight for the mean skips the only question that matters: whether the missingness itself carries information.",
    content: `Filling gaps with a column mean is the reflex answer and a weak one. The stronger move is to ask *why* the values are absent first, because the mechanism behind the missingness determines whether any imputation can be safe.

## The Three Mechanisms
- **MCAR** (missing completely at random) — the absence is unrelated to anything, as with a sensor that drops readings at random. Imputation is safe, and dropping rows is unbiased if there are few.
- **MAR** (missing at random) — the absence depends on *other observed* features, as when older customers skip an optional web form. Imputation conditioned on those other features is the right tool.
- **MNAR** (missing not at random) — the absence depends on the missing value itself, as when high earners decline to state income. **No imputation strategy recovers this**, because the data needed to model the gap is exactly the data that is absent. The honest answer is to encode the missingness as a signal rather than to fake a value.

## The Named Techniques

| Technique | How it fills | When it fits |
|---|---|---|
| **Mean / median / mode** | A single column-level statistic | Fast baseline; median for skewed columns |
| **KNN imputation** | Average of the k most similar rows | Correlated features, moderate dataset size |
| **Iterative / MICE** | Models each column from the others, repeatedly | Strong feature relationships, MAR |
| **Missingness indicator** | Adds a boolean \`income_is_missing\` column | Whenever absence may itself be predictive |

The **missingness indicator** deserves particular attention because it directly addresses the MNAR case: rather than inventing a value, it lets the model learn that the absence itself predicts the target. Pairing a simple median fill with an indicator column is often stronger than an elaborate imputation alone.

## The Leakage Trap
An imputer is a fitted model — a mean computed from data — so fitting it on the full dataset before splitting leaks test-set information into training, exactly as fitting a scaler too early does. It belongs inside the cross-validation fold.

## The Decision Rule
Drop a column when the vast majority of it is absent and no indicator would help; drop rows only when they are few and plausibly MCAR. Otherwise impute — median plus an indicator as the default, something conditional when features are strongly related. Some models sidestep the question entirely: gradient-boosted trees learn a default direction for missing values at each split, which is why they often need no imputation step at all.`,
  },
];
