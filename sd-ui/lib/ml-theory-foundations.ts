import type { TheoryTopic } from "./types";

export const ML_FOUNDATIONS_TOPICS: TheoryTopic[] = [
  {
    id: "learning-paradigms",
    title: "Supervised, Unsupervised & Reinforcement Learning",
    oneLiner: "Three words are easy to recite — the points come from naming what actually supplies the learning signal in each case.",
    content: `This is often the opening question, and reciting three labels earns very little. What distinguishes the paradigms is **what supplies the learning signal**: a labelled right answer, the structure of the data itself, or a delayed reward from an environment.

## What Actually Separates Them

| Paradigm | Learning signal | Representative task |
|---|---|---|
| **Supervised** | Labelled target for every training example | Predicting which of 10,000 transactions are fraudulent from 100 known-fraud labels |
| **Unsupervised** | No labels — only the structure and variance of the features | Segmenting customers into groups nobody defined in advance |
| **Reinforcement** | A delayed, sparse reward earned by acting | Learning to play a game, or to route deliveries |

## Supervised Learning Splits Two Ways
Supervised problems divide by the type of the target, and getting this wrong in an interview is a genuine stumble: **classification** predicts a discrete label (fraud or not fraud), while **regression** predicts a continuous quantity (a house's sale price). The same features can serve either — predicting a house's exact price is regression, predicting whether it sells above asking is classification.

## Where Reinforcement Learning Genuinely Differs
Reinforcement learning is not simply "supervised learning without labels." An **agent** takes actions in an **environment**, receives a **reward**, and learns a **policy** mapping states to actions. Two properties make it a different problem entirely: the reward is often **delayed**, so credit for a win must be assigned back across many earlier moves, and the agent's own actions determine what data it ever sees — creating the **exploration versus exploitation** tension that has no analogue in supervised learning.

## The Two Middle Cases Worth Naming
**Semi-supervised learning** uses a small labelled set alongside a large unlabelled one — the realistic situation whenever labelling is expensive, as with medical images. **Self-supervised learning** manufactures labels from the data itself, such as masking a word and training the model to predict it. Naming self-supervision specifically is worth doing, since it is the mechanism behind how modern language models are pretrained.

## The Answer Shape
State the signal, name the sub-type, then give one concrete task per paradigm. A candidate who adds that most production systems are supervised — because labels, however costly, are what make evaluation possible at all — is answering the question behind the question.`,
  },

  {
    id: "loss-functions",
    title: "Loss Functions — What the Model Actually Minimizes",
    oneLiner: "The loss is what training optimizes; the metric is what humans judge the result by — conflating the two is a common and costly slip.",
    content: `A **loss function** is the quantity that optimization actually minimizes during training. It is not the same thing as an evaluation metric, and treating the two as interchangeable is one of the easier ways to sound imprecise.

## Loss Versus Metric — A Distinction Worth Stating
A loss must be differentiable so gradients can flow through it; a metric only has to be meaningful to a human. Accuracy, for instance, is a perfectly good metric and a useless loss — it is a step function with a gradient of zero almost everywhere, so it offers no direction to move in. That is precisely why a classifier trains on **cross-entropy** while being reported on accuracy, precision, or recall. Note also that regularization penalties are *added to* a loss rather than being losses themselves.

## Regression Losses

| Loss | Formula | Behavior on outliers |
|---|---|---|
| **MSE** (L2 loss) | \`mean((y - y_hat)^2)\` | Squaring makes one large error dominate — sensitive |
| **MAE** (L1 loss) | \`mean(abs(y - y_hat))\` | Errors scale linearly — robust |
| **Huber** | Squared below a threshold \`delta\`, linear above | Deliberately in between |

**Concrete example:** on house-price prediction, a single mansion mispriced by \`$2M\` contributes \`4,000,000\` squared units to MSE while a hundred homes each off by \`$20K\` contribute only \`40,000\` between them. MSE will happily distort the whole fit to chase that one house; MAE will not. Huber exists because MSE's smooth gradients are convenient near the optimum while MAE's robustness is wanted in the tails.

## Classification Losses
**Cross-entropy** (log loss) penalizes confident wrong answers savagely — the penalty grows without bound as the predicted probability for the true class approaches zero. **Hinge loss** is the SVM's loss, and differs in kind: it goes to exactly zero once a point sits beyond the margin, so correctly classified points stop contributing at all.

## Why Cross-Entropy Beats MSE for Classification
Pairing MSE with a sigmoid output produces a non-convex surface with near-flat regions where the sigmoid saturates, and gradients there vanish. Cross-entropy is constructed so that the saturating term cancels, leaving a gradient proportional to the raw prediction error. A badly wrong, confidently wrong prediction therefore produces a large corrective step rather than a vanishingly small one.`,
  },

  {
    id: "hyperparameter-tuning",
    title: "Hyperparameter Tuning — Grid, Random & Bayesian Search",
    oneLiner: "\"Tune it with cross-validation\" states the discipline; the interview is listening for the named search strategy underneath it.",
    content: `A **parameter** is learned from data during training — the coefficients of a regression, the weights of a network. A **hyperparameter** is set before training begins and governs how learning happens: a tree's \`max_depth\`, a forest's \`n_estimators\`, a learning rate, a regularization strength. Saying only "tune the hyperparameters with cross-validation" describes the discipline without naming the mechanism, which is exactly the gap that costs points.

## Grid Versus Random Search

| Strategy | How it explores | Where it wins |
|---|---|---|
| **Grid search** | Every combination on a predefined lattice | Few hyperparameters, and each value genuinely matters |
| **Random search** | Samples combinations from distributions | Many hyperparameters where only a couple actually matter |

Grid search suffers combinatorially: four hyperparameters at five values each is already \`625\` fits, multiplied again by the number of cross-validation folds. Random search's advantage is subtler than a mere budget cap. In most real problems only two or three hyperparameters meaningfully affect the score, and a grid wastes its budget re-testing values of the irrelevant ones — a \`5x5\` grid tries only 5 distinct learning rates in 25 fits, whereas 25 random draws try 25 distinct values of every hyperparameter at once.

## Bayesian Optimization
**Bayesian optimization** treats the validation score as an expensive unknown function, fits a cheap surrogate model to the results observed so far, and chooses the next configuration where the expected improvement is highest. Unlike grid and random search it *learns from its own history*, which is what makes it worth the overhead when a single fit is expensive — a large network, for instance, rather than a shallow tree. Libraries such as Optuna and Hyperopt implement this.

## Why Tuning Needs Its Own Split
Selecting hyperparameters by cross-validation score means the validation folds have influenced the model, so that score is no longer an unbiased estimate of generalization. With a single held-out test set the discipline is simply to never touch it until the end. When the entire dataset is too small to spare one, **nested cross-validation** is the named answer: an inner loop tunes, and an outer loop scores the whole tune-and-fit procedure on data the inner loop never saw.

## The Caveat
Search is the last resort, not the first move. A better feature, a corrected label, or a metric that matches the business will almost always beat a wider grid over the same model.`,
  },

  {
    id: "data-leakage",
    title: "Data Leakage — The Bug That Looks Like Success",
    oneLiner: "Leakage is uniquely dangerous because it announces itself as a great result — suspiciously strong validation scores that evaporate in production.",
    content: `**Data leakage** is any situation where information unavailable at prediction time influences training. Its defining hazard is the direction of the symptom: leakage makes validation scores go *up*. A model reporting 99% cross-validated accuracy that collapses on live traffic is the canonical signature, and an unexplained jump in performance deserves suspicion rather than celebration.

## The Classic Form: Preprocessing Before the Split
Fitting a scaler, imputer, or encoder on the full dataset and splitting afterwards leaks the test set's distribution into training. The mean and standard deviation used to standardize training data were computed partly *from* the rows later used to evaluate it. The effect is usually small but it is real, and it is the single most common leak in practice — which is why scikit-learn's \`Pipeline\` exists: it forces every transform to be fitted inside each cross-validation fold rather than once, up front.

## Target Leakage
A feature that is a consequence of the target rather than a cause of it produces spectacular offline results and zero production value. Predicting fraud with a \`chargeback_filed\` column is the textbook case — chargebacks only exist *because* the fraud already happened and was caught, so the column will not be populated at the moment a prediction is actually needed. The diagnostic question is simple: would this value genuinely be known, populated, and trustworthy at the instant the model has to score a row?

## Temporal and Group Leakage
**Temporal leakage** comes from randomly shuffling time-ordered data, which lets the model train on rows from after the point it is predicting. **Group leakage** comes from splitting rows when the true unit of independence is something larger — several visits from the same patient, or several photographs of the same object, scattered across train and test. The model then recognizes the individual rather than the pattern, and grouped splitting is the fix.

## Why It Deserves Its Own Answer
Leakage is worth raising unprompted when an interviewer describes an implausibly strong result, because it reframes the candidate from someone who reports numbers to someone who audits them. The habit that prevents it is architectural rather than vigilant: preprocessing inside the fold, splitting by the correct unit, and asking of every feature whether it is knowable at prediction time.`,
  },
];
