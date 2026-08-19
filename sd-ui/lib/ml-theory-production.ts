import type { TheoryTopic } from "./types";

export const ML_PRODUCTION_TOPICS: TheoryTopic[] = [
  {
    id: "model-degradation-and-drift",
    title: "Why Models Degrade in Production",
    oneLiner: "Frozen weights do not decay — the world underneath them moves, and the correct first response to a degradation alert is not retraining.",
    content: `**Model degradation** is the decay of production performance after deployment, and the cause is almost never the weights — those are frozen. What moved is the data underneath them: accuracy is a property of the fit between a model and a world that refuses to hold still.

## Three Kinds of Drift, Not One Idea
**Covariate shift** means \`P(X)\` moved while the underlying relationship held — a fraud model now scores mobile traffic it barely saw in training. **Label shift** means \`P(Y)\` moved: the fraud base rate jumps from 1% to 4% during a coordinated attack. **Concept drift** means \`P(Y|X)\` moved — identical inputs now imply a different answer, because fraudsters adapted to the model. These are three separate levers, not the same idea said three different ways.

| Drift | What Moved | Retrain on History? |
|---|---|---|
| Covariate shift | Input distribution | Yes, with reweighting |
| Label shift | Class base rate | Yes, with recalibration |
| Concept drift | The rule itself | No — old labels are wrong |

## Detecting Drift When Labels Arrive Six Weeks Late
**The label-latency problem** makes this hard: a chargeback confirming fraud lands 60 days after the transaction, so the accuracy metric everyone asks for does not exist yet. Monitoring therefore watches what *is* available: a **KS test** flags a shifted continuous feature, **PSI** scores binned distributions — above \`0.25\` warrants investigation — and **KL divergence** compares categorical ones. The prediction distribution matters as much: a mean fraud score drifting from \`0.012\` to \`0.031\` overnight reports something real long before any label confirms it, with leading proxies like analyst-confirmation rate arriving sooner.

## Retraining Cadence Is a Calculation, Not a Calendar
"Retrain weekly" is a guess wearing a schedule. Cadence falls out of **drift rate**, **label latency** — retraining faster than labels arrive trains on nothing new — and **retraining cost**. The strong version is an automated trigger on a drift threshold plus a **validation gate**: the challenger must beat the incumbent on a recent held-out slice before promotion.

## Check the Pipeline Before Blaming the World
The correct first move on a degradation alert is not retraining — it is verifying the data. A broken upstream join, a renamed column, or a migration that turned nulls into zeros is likelier than genuine drift, and retraining on corrupted inputs bakes the bug into the weights.`,
  },

  {
    id: "train-serve-skew",
    title: "Train-Serve Skew",
    oneLiner: "The same feature computed by two different codepaths will eventually disagree — the fix is one definition, not more care.",
    content: `**Train-serve skew** is the gap between the feature values a model learned from and the values it actually receives at inference. The feature carries one name and one intended meaning but has two implementations — a batch SQL job over the warehouse for training, an online service computing it per request — and the two disagree in ways nobody notices until production metrics sag.

## The Four Places Two Codepaths Quietly Diverge
**Timestamp parsing** is the classic — the warehouse stores UTC, the serving path reads a local-time field, and every hour-of-day and recency feature is silently offset. **Null handling** is next: training SQL coalesces a missing \`txn_count_30d\` to \`0\`, while the online service leaves it null and a downstream imputer fills the column median. **Aggregation windows** drift apart when training uses 30 calendar days and serving uses a rolling 720 hours from request time. **Unit and scaling differences** round it out — amounts in cents on one side and dollars on the other.

## Freshness Skew Counts Too
A feature can be computed identically and still be skewed by *age*. Training reads a warehouse table with the day's events fully settled; serving reads a cache refreshed every 15 minutes, so a customer's transaction count runs systematically low on exactly the recent activity that matters most in fraud.

## Concrete Example: Finding It by Replay
On the fraud dataset of 10,000 transactions with 100 frauds, an offline model reports 91% precision and 88% recall; live, precision holds but recall collapses to 61%. The diagnostic is **log-and-replay** — persist the exact feature vector served at decision time, push those rows back through the training pipeline, and diff column by column. Here \`txn_count_30d\` disagrees on 12% of rows, the null-versus-zero mismatch, invisible to every unit test because both codepaths were individually correct.

## The Fix Is Architectural, Not Behavioral
"Be careful" is not an answer — two codepaths maintained by two teams will diverge eventually. The strong answer is **one definition of a feature with two materializations**: a single transformation expressed once and compiled into both a batch job and an online path, so divergence is structurally impossible rather than merely discouraged. A **feature store** is the standard productized form of that guarantee. Where a shared definition is genuinely impractical, the fallback is continuous automated diffing on live traffic — a monitor, not a promise.`,
  },

  {
    id: "batch-vs-online-inference",
    title: "Batch vs. Online Inference",
    oneLiner: "Latency and cost frame the choice, but the real deciding factor is whether the input space can be enumerated in advance.",
    content: `The choice between **batch inference** and **online inference** is usually framed as latency versus cost, and that framing is fine as far as it goes — batch precomputes predictions on a schedule and serves them from a lookup — online computes each prediction on demand. It simply is not the part that decides the architecture.

## Where Each One Genuinely Wins
| | Batch | Online |
|---|---|---|
| Latency at request time | A key-value lookup, single-digit milliseconds | Feature fetch plus a live forward pass |
| Cost per prediction | Amortized, hardware-efficient, off-peak | Provisioned for peak, mostly idle |
| Freshness | As stale as the last run | Uses the request's own context |
| Failure mode | Serves a confidently outdated answer | Times out or degrades under load |

## The Deciding Question Is Whether Inputs Can Be Enumerated
Precomputation requires knowing every possible input in advance. Ten million users scored nightly for recommendations is an enumerable input space — so batch works. A fraud decision is not precomputable, because the input includes a transaction that does not exist until it happens — amount, merchant, device, time since the last transaction. Session context, free-text queries, and anything conditioned on the live request cannot be enumerated — and no amount of compute changes that. **That constraint, not latency, is what actually forces online serving.**

## Worked Example: A Fraud Decision Inside 150 ms
A card authorization allows roughly \`150 ms\` end to end before the terminal times out. Network and orchestration consume \`40 ms\`, feature retrieval \`35 ms\`, model scoring \`20 ms\` — leaving about \`55 ms\` of headroom for retries and tail latency. That budget rules out an ensemble scoring in \`400 ms\` however much accuracy it buys, and it explains the standard escape hatch: precompute the expensive slow-moving parts, such as a customer's 90-day behavioral aggregates, and reserve live computation for the few features only the request can supply.

## Most Real Systems Are Neither, and That Is the Point
Treating this as binary is the mistake that costs points. The common production shape is hybrid — train in batch, precompute and cache whatever is enumerable, refresh on a cadence set by how fast those values go stale, and compute the request-dependent remainder online. The decision rule: enumerate everything that can be enumerated, and pay online latency only for what genuinely cannot.`,
  },

  {
    id: "explainability-and-feature-importance",
    title: "Feature Importance & Explainability",
    oneLiner: "Impurity-based importance flatters high-cardinality noise — permutation importance on held-out data is the correction worth naming.",
    content: `**Feature importance** answers two different questions that get conflated constantly: which features matter to the model overall, and why *this particular prediction* came out the way it did. The second question is the one regulators usually ask — and candidates rarely separate the two unprompted.

## Global Methods Describe the Model, Local Methods Explain a Row
**Permutation importance** shuffles one feature and measures how much a held-out metric degrades — global, model-agnostic, honest. **Partial dependence plots** show the average predicted response as one feature varies, also global. **SHAP** attributes a single prediction across features as additive contributions with a game-theoretic grounding, and **LIME** fits a simple local surrogate around one point to approximate the same thing more cheaply. "This application was declined because of X and Y" is a local question, and adverse-action notices demand exactly that.

## Impurity-Based Importance Is Biased Toward High-Cardinality Features
This is the highest-signal point on the topic. A tree's \`.feature_importances_\` sums the impurity reduction each feature achieved, and a high-cardinality feature offers vastly more candidate split points — more chances to carve the data favorably by luck alone. Worse, it is computed on *training* data — so nothing penalizes a split that merely memorizes. **Concrete example:** add a pure-noise column of 10,000 distinct random values to the fraud dataset of 10,000 transactions with 100 frauds, and it can rank among the top features by impurity while contributing nothing on held-out data. **Permutation importance on a held-out set fixes both defects at once** — measured out of sample, and shuffling destroys any luck-based advantage.

## Correlated Features Make Both Methods Lie
Permutation importance and SHAP both mislead when features are correlated. Permuting one of two near-duplicates leaves the model able to recover the signal from the other, so the metric barely moves and *both* features look unimportant — something can appear worthless precisely because it is well substituted. The fix is to permute or attribute correlated features as a **group** rather than one at a time.

## These Explain the Model, Not the World
Every method here describes what the fitted model leans on, never what causes the outcome — they are not causal. In credit, insurance, healthcare, and hiring, interpretability is a hard regulatory requirement rather than a diagnostic nicety, which is why a locally explainable model is sometimes shipped over a more accurate one.`,
  },

  {
    id: "fairness-and-bias",
    title: "Fairness & Bias in ML Systems",
    oneLiner: "Deleting the protected attribute removes the ability to measure fairness, not the bias — proxies survive it untouched.",
    content: `**Algorithmic bias** is systematically different treatment or error rates across groups, and the reflex answer — drop the protected attribute so the model cannot discriminate — is wrong twice over.

## Proxies Survive the Deletion
ZIP code encodes race in most historical US housing data. First names correlate with gender and ethnicity. Device type and shopping hour correlate with income. A model with enough features reconstructs the deleted attribute from what remains, so removal buys the appearance of neutrality, not the substance. The second problem is sharper: **measuring** fairness requires the attribute. A pipeline that never collects it cannot report error rates by group, and a system that cannot be audited is not fair — merely unexamined.

## The Bias Is in the Labels, Not the Loss Function
Bias almost always enters through the data pipeline and the **label-generating process** rather than the algorithm. Historical loan approvals are labeled by past human decisions; if those decisions were discriminatory, the labels encode discrimination and a perfectly trained model reproduces it faithfully. Sampling compounds it — a fraud model trained mostly on one region's transactions treats the rest as unusual. Hunting for this in the model class looks in the wrong place.

## The Metrics Cannot All Be Satisfied at Once
**Demographic parity** requires equal positive rates across groups. **Equalized odds** requires equal true-positive and false-positive rates. **Disparate impact** compares selection rates, conventionally flagging a ratio below \`0.8\`. The important result is that these criteria are **mutually incompatible** — except in degenerate cases such as equal base rates or a perfect classifier, no model satisfies them at once. That is a proven impossibility, not an engineering gap awaiting a better optimizer.

## Aggregate Numbers Hide Segment Failures
On the fraud dataset of 10,000 transactions with 100 frauds, a model can report 90% recall overall while catching 6 of 14 frauds in one merchant segment — a 43% recall the headline absorbs. **Subgroup performance auditing** means slicing every metric by group before shipping — averages are built to hide this.

## The Choice Has to Be Made Explicitly
Since the criteria conflict, selecting one is a value judgment about which harm weighs more — a false decline or a missed catch — and it belongs to product and legal, not to whoever writes the training script. The failure mode is not choosing badly; it is choosing implicitly and calling it a technical default.`,
  },
];
