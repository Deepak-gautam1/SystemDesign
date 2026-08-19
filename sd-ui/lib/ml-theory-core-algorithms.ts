import type { TheoryTopic } from "./types";

export const ML_CORE_ALGORITHMS_TOPICS: TheoryTopic[] = [
  {
    id: "linear-regression",
    title: "Linear Regression & Its Assumptions",
    oneLiner: "The baseline worth naming before anything fancier — and the one model where the interview question is almost always about its assumptions rather than its math.",
    content: `**Linear regression** models a continuous target as a weighted sum of the features — \`price = b0 + b1*sqft + b2*location_score + b3*age\` — and picks those weights by **least squares**, minimizing the sum of squared residuals between predicted and actual values. Squaring isn't arbitrary — it punishes large misses far harder than small ones and yields a smooth objective with a closed-form solution.

## Reading a Coefficient Without Getting It Wrong
Each coefficient is the expected change in the target for a one-unit increase in that feature, **holding every other feature fixed**. That last clause is the half that gets dropped, and dropping it turns a correct interpretation into a false claim about the world.

**Concrete example:** a fit on 5,000 house sales returns \`b1 = 120\` for square footage and \`b3 = -1500\` for age. The honest reading — among houses sharing the same location score and age, each extra square foot is associated with roughly $120 more in price, each extra year of age with roughly $1,500 less. It is not a promise that adding 200 square feet to one house lifts its value by $24,000.

## The Five Assumptions and What Each Violation Costs

| Assumption | What breaks when it's violated |
|---|---|
| **Linearity** — the relationship is genuinely additive | Predictions are biased everywhere; residuals show a visible curve |
| **Independence of errors** | Standard errors are understated, so p-values look better than they are |
| **Homoscedasticity** — constant residual variance | Coefficients stay unbiased, but their standard errors are wrong |
| **Normality of residuals** | Point predictions survive; inference becomes unreliable |
| **No severe multicollinearity** | Coefficients turn unstable and individual interpretation collapses |

## The Distinction That Earns Points
Only two of those five genuinely threaten the predictions — linearity, and multicollinearity by way of unstable weights. The other three mostly damage *inference*: the standard errors and p-values around the estimates. A candidate who calls a model useless because residuals aren't normal has conflated predicting with inferring, and an interviewer walking the assumption list is usually probing exactly that seam.

## Why It Still Deserves to Be Named First
Linear regression trains in seconds, its coefficients are auditable, and it sets the error number a boosted tree has to beat to justify its own opacity. Reaching for XGBoost on 400 rows without knowing what a straight line already achieves is a decision made in the dark.`,
  },

  {
    id: "logistic-regression",
    title: "Logistic Regression — Why It's Called Regression",
    oneLiner: "It's a classifier that really is a regression — just a regression on the log-odds rather than on the probability.",
    content: `**Logistic regression** takes the same linear combination of features that linear regression produces, \`z = b0 + b1*x1 + b2*x2\`, and pushes it through the **sigmoid** function \`p = 1 / (1 + e^-z)\`. That squashes any real number, however extreme, into the interval \`[0, 1]\` — which is what makes the output usable as a probability instead of an unbounded score.

## Why a Classifier Carries the Word Regression
The name isn't a historical accident to shrug off. Logistic regression performs a genuine linear regression — just not on the probability. It regresses the **log-odds**, or **logit**: \`log(p / (1 - p)) = b0 + b1*x1 + b2*x2\`. On that scale the model is exactly, literally linear, and the sigmoid is only the inverse link mapping log-odds back into probability space. So the answer to "why is a classifier called regression?" is that it *is* a linear model — on the log-odds scale — and the classification step isn't part of the model at all.

## The Threshold Is a Separate Choice From the Model
The model outputs a probability; a class label appears only once that probability is compared against a threshold — conventionally \`0.5\`, never obligatorily. Take the fraud dataset of 10,000 transactions with 100 genuine frauds: at \`0.5\` the model might flag 40 transactions and catch 35 frauds, while at \`0.15\` it flags 300 and catches 85. Same coefficients, no retraining — only the threshold moved. A candidate who reports "the model catches 35% of fraud" without naming the threshold has described a property of a choice, not of the model.

## Log Loss, Not Squared Error
Training minimizes **log loss** — \`-[y*log(p) + (1-y)*log(1-p)]\` — because squared error on a sigmoid output is non-convex in the weights and littered with local minima. Log loss also punishes confident wrongness without mercy: predicting \`0.01\` for a transaction that turns out fraudulent incurs a penalty diverging toward infinity, where squared error caps the same catastrophe at a bounded miss of 1.

## Coefficients Are Odds Ratios, Not Probabilities
Exponentiating a coefficient gives an **odds ratio**: \`b = 0.7\` means \`exp(0.7) = 2.01\`, so a one-unit increase roughly *doubles the odds* of the positive class — the odds, not the probability. The rigidity that buys that interpretability also caps the model: linear in log-odds means a straight decision boundary in feature space, so curvature and interactions have to be engineered in by hand.`,
  },

  {
    id: "decision-trees",
    title: "Decision Trees — How a Split Is Actually Chosen",
    oneLiner: "Anyone can describe a tree as a sequence of yes/no questions — the interview separator is explaining how the algorithm picks which question to ask.",
    content: `A **decision tree** predicts by asking a sequence of threshold questions about single features and following the answers to a leaf. Building one is **recursive partitioning**: at each node, examine every feature and every candidate threshold, score each resulting split by how much it reduces **impurity**, keep the best, and recurse on both children until a stopping rule fires. What "best" means is the step most explanations skip.

## Gini and Entropy Measure How Mixed a Node Is
**Gini impurity** is \`Gini = 1 - sum(p_i^2)\` — the chance two samples drawn at random from the node carry different labels. **Entropy** is \`Entropy = -sum(p_i * log2(p_i))\`, the average bits needed to encode a label. Both read \`0\` on a pure node and peak on a 50/50 node — \`0.5\` for Gini, \`1.0\` for entropy. They rank splits almost identically, so picking between them is a detail.

## Worked Example: Scoring One Candidate Split
Start with a node of 100 transactions, 50 fraudulent and 50 legitimate, so parent impurity is \`1 - (0.5^2 + 0.5^2) = 0.5\`. Split on \`amount > 500\`, sending 40 rows left (10 fraud, 30 legitimate) and 60 rows right (40 fraud, 20 legitimate).

1. Left child: \`1 - (0.25^2 + 0.75^2) = 0.375\`
2. Right child: \`1 - (0.667^2 + 0.333^2) = 0.444\`
3. Weighted child impurity: \`(40/100)*0.375 + (60/100)*0.444 = 0.417\`

**Information gain** is the reduction — \`0.5 - 0.417 = 0.083\`. Every other threshold on every other feature is scored the same way, and the largest gain wins the node.

## Greedy Means Locally Optimal, Nothing More
That search is **greedy** — the best split available now, no lookahead, never revisited. Two splits that separate the classes beautifully in combination can both be passed over because neither wins alone. The globally optimal tree is NP-hard to find, so greedy is the accepted compromise, and part of why a single tree is weak enough to be worth ensembling.

## Unpruned Trees Memorize, and Scaling Is Beside the Point
Left unconstrained, splitting continues until every leaf is pure — one leaf per training row in the limit, a lookup table dressed as a model. \`max_depth\` caps how deep questions stack, \`min_samples_leaf\` forbids leaves built from a handful of rows, and cost-complexity pruning via \`ccp_alpha\` cuts branches back *after* growing. Note what's absent from that list: scaling. A split compares one feature against a threshold within itself and never measures distance across features, so multiplying square footage by 1,000 changes the printed threshold and nothing else. The flip side: a tree draws only axis-parallel boundaries, approximating a diagonal relationship with a staircase.`,
  },

  {
    id: "random-forest",
    title: "Random Forest — Bagging Plus Feature Subsetting",
    oneLiner: "Calling it \"bagged decision trees\" is incomplete in the one place that matters — the feature subsetting is what makes it a forest.",
    content: `A **Random Forest** is routinely described as bagged decision trees, and that description omits the ingredient the algorithm is named for. Bootstrap row sampling and the variance reduction it buys are covered separately under bagging vs. boosting — bagging alone isn't the whole story. The distinguishing piece is a second, independent source of randomness layered on top.

## Random Feature Subsetting at Every Split
At each node — not once per tree, but at every node — the tree may consider only a random subset of features when hunting for the best split. The conventional size is \`sqrt(n_features)\` for classification, about \`n_features / 3\` for regression. With 25 features, roughly 5 candidates get evaluated per split and the other 20 are invisible there.

## Decorrelation Is the Actual Source of the Gain
Averaging \`n\` models each with variance \`v\` and pairwise correlation \`rho\` yields \`rho*v + (1-rho)*v/n\`. The second term shrinks toward zero as trees are added; the first doesn't budge. Correlation between trees is a hard floor on how much averaging can help — which is why decorrelating them, not merely multiplying them, is the whole game.

**Concrete example:** house price from 25 features where square footage dominates every other predictor. Under bootstrap sampling alone, nearly all 500 trees pick square footage as their root split and come out near-copies, so averaging buys almost nothing. Restrict each node to 5 random candidates and square footage is even eligible only about 20% of the time — the rest of the trees lead with location score, age, or lot size, learn different structure, and stop erring in unison.

## Out-of-Bag Error Is Free Validation
Each bootstrap sample omits about 37% of the rows, since \`(1 - 1/n)^n\` converges to \`1/e ≈ 0.368\`. Every row can therefore be scored by only the trees that never saw it, and aggregating those predictions gives the **out-of-bag error** — an estimate comparable to k-fold cross-validation, with no held-out set and no refitting.

## Where the Forest Stops Being the Answer
Built-in **feature importance** sums the impurity reduction each feature contributed across all splits — convenient, and quietly biased toward high-cardinality continuous features while splitting credit arbitrarily among correlated ones. Beyond that, 500 trees aren't interpretable individually, inference cost scales with the tree count, and boosting usually edges the forest out on accuracy. The forest's real claim is being nearly impossible to misconfigure badly.`,
  },

  {
    id: "svm-and-kernel-trick",
    title: "SVMs & the Kernel Trick",
    oneLiner: "The margin explains why an SVM picks one boundary out of infinitely many — the kernel trick explains how it draws curved ones without ever visiting the higher-dimensional space.",
    content: `A **support vector machine** doesn't merely find *a* boundary between two classes — it finds the one sitting as far as possible from both, the **maximum-margin hyperplane**. Infinitely many lines separate a separable training set, and most graze some point closely; the SVM picks the one with the widest empty corridor around it, on the reasoning that the widest corridor is least disturbed by the next unseen point.

## Only the Support Vectors Matter
The points on the margin's edges are the **support vectors**, and they alone determine the boundary — every other training point could be deleted and the fitted model would come out identical. On the fraud dataset of 10,000 transactions, perhaps 200 points end up as support vectors: nudging one of those rotates the whole boundary, while shoving a point deep inside its own class does nothing at all. Logistic regression, by contrast, lets every row contribute to the loss.

## Soft Margin: \`C\` as the Regularization Dial
Real data isn't cleanly separable, so the **soft margin** lets points sit inside the margin or on the wrong side, penalized by \`C\`. A large \`C\` such as \`1000\` tolerates almost no violation, producing a narrow, contorted boundary that chases individual points — low bias, high variance. A small \`C\` such as \`0.01\` accepts more misclassified training points for a wider, smoother margin. \`C\` is a regularization strength, and cranking it upward as an accuracy knob is the standard mistake.

## The Kernel Trick Computes Similarity Without Coordinates
The optimization only ever needs **dot products** between pairs of points, never the coordinates themselves. A **kernel** computes what that dot product *would be* in a higher-dimensional space, directly from the original features, without constructing a single coordinate there. A **polynomial kernel** \`(x·y + 1)^2\` on two features corresponds to a six-dimensional space of squares and cross-terms, reached by one dot product and one squaring. The **RBF kernel** \`exp(-gamma * ||x - y||^2)\` corresponds to an infinite-dimensional space — which is why "trick" is precise rather than casual: materializing those coordinates isn't slow, it's impossible.

## Where SVMs Actually Sit Today
Because kernels measure distance, unscaled features wreck them — a dollar amount spanning 0 to 500,000 drowns an age spanning 0 to 50, so standardization is mandatory here. Training cost lands between quadratic and cubic in sample count, which makes six-figure row counts painful. The honest placement: strong on small-to-medium, high-dimensional, reasonably clean data — thousands of TF-IDF text features being the classic fit — and rarely the choice at scale, where boosted trees and neural networks took the ground.`,
  },

  {
    id: "knn",
    title: "k-Nearest Neighbors — Lazy Learning",
    oneLiner: "The only common algorithm with no training phase at all — which is exactly why every cost it skips up front comes back at inference time.",
    content: `**k-nearest neighbors** has no training phase. Fitting a kNN model means storing the training set; every prediction then locates the \`k\` closest stored points to the query and takes their majority vote for classification or their mean for regression. That inversion — nothing spent up front, everything spent at prediction time — is what earns the label **lazy learning**.

## No Model Object, Which Cuts Both Ways
kNN never condenses the data into a compact representation, so there are no coefficients to inspect: the training data *is* the model. The bill arrives at inference, where one prediction requires a distance to every stored point — \`O(n*d)\` per query. Scoring one transaction against 10,000 stored transactions of 20 features means 10,000 distance computations, where trained logistic regression answers with 20 multiplications and a sum.

## Scaling Isn't Optional Here, It's Correctness
The default metric is **Euclidean distance**, \`sqrt(sum((x_i - y_i)^2))\`; **Manhattan distance**, \`sum(abs(x_i - y_i))\`, sums per-axis differences instead and holds up better on sparse data.

**Concrete example:** predicting house price from square footage, ranging 600 to 6,000, and bedroom count, ranging 1 to 6. Unscaled, a 400-square-foot difference contributes 400 to the distance while a three-bedroom difference contributes 3 — the bedroom feature is present in the data and absent from the answer, since square footage alone decides who counts as a neighbor.

## How \`k\` Trades Bias Against Variance
At \`k = 1\` the boundary contorts around every point, and one mislabeled row creates its own island of wrong predictions — **high variance**. As \`k\` grows the vote averages over a wider neighborhood, until at \`k = n\` every prediction is the global majority class — maximal **bias**. Practical values land around \`5-20\`, chosen by cross-validation, odd to avoid ties in binary problems. In high dimensions the premise weakens as distances converge and "nearest" stops implying "similar" — the curse of dimensionality, covered separately.

## Why a Simple Baseline Still Earns Its Slot
kNN assumes no functional form, so its boundaries take arbitrary shapes, and it stands up in minutes. If kNN on scaled features reaches 88% and a tuned boosted model reaches 89%, the interesting question has moved from models to features. One caveat worth naming: with 100 frauds among 10,000 transactions, the five nearest neighbors of a fraud are usually legitimate, so kNN votes majority and recall collapses.`,
  },

  {
    id: "naive-bayes",
    title: "Naive Bayes & the Independence Assumption",
    oneLiner: "It rests on an assumption that is obviously false and still classifies well — because classification needs only the ranking of posteriors, not the numbers.",
    content: `**Naive Bayes** applies Bayes' theorem to classification, then adopts one deliberately false simplification to keep the arithmetic tractable: it scores each class as \`P(class) * product(P(feature_i | class))\` and picks the winner. It is a **generative** model — it describes how each class produces features rather than drawing a boundary between them, a distinction covered separately under generative vs. discriminative.

## The Naive Assumption, Stated Honestly
The assumption is **conditional independence**: given the class, every feature carries information independent of every other. In a spam classifier that asserts the word "free" appearing tells nothing about whether "money" also appears — plainly untrue of real language. The payoff is what makes it worth swallowing: estimating a joint distribution over every feature combination would demand exponentially many examples, while the naive version estimates each feature's conditional probability from its own simple counts.

## Worked Example: Scoring One Email
Take 1,000 training emails, 300 spam and 700 legitimate, so \`P(spam) = 0.3\`. Among spam, "free" appears in 150 emails and "money" in 120 — \`0.5\` and \`0.4\`. Among legitimate mail, "free" appears in 35 and "money" in 21 — \`0.05\` and \`0.03\`. For an email containing both words:

- Spam score: \`0.3 * 0.5 * 0.4 = 0.06\`
- Legitimate score: \`0.7 * 0.05 * 0.03 = 0.00105\`

Spam wins by a factor of roughly 57. Normalizing turns that into \`0.06 / 0.06105 = 0.983\`, and that 98.3% is exactly the number not to trust.

## Why an Obviously False Assumption Still Works
Classification needs only the **argmax** — which posterior is largest — not a calibrated posterior. Correlated features double-count the same evidence and drive scores toward the extremes, which is why the 98.3% above is almost certainly overconfident. But that double-counting usually pushes in the direction the true posterior already favored, so the *ranking* survives. The result is a poor probability estimator and a genuinely good classifier, and dismissing the model because its assumption is false misses precisely that gap.

## Laplace Smoothing Closes the Zero-Count Trap
If "lottery" never appeared in a legitimate training email, \`P(lottery | legitimate) = 0\` and the whole product collapses to zero — one unseen word vetoes an entire class. **Laplace (additive) smoothing** adds \`alpha\`, usually \`1\`, to every count: \`(count + alpha) / (total + alpha * vocabulary_size)\`. The decision rule that follows: reach for Naive Bayes as the first baseline on text, where features are numerous and sparse and training is a single counting pass, but never lean on its probabilities where calibration matters.`,
  },
];
