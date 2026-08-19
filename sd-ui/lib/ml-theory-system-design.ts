import type { TheoryTopic } from "./types";

export const ML_SYSTEM_DESIGN_TOPICS: TheoryTopic[] = [
  {
    id: "ml-system-design-framework",
    title: "The ML System Design Framework",
    oneLiner: "A whole interview round at most companies — and it is scored on the structure of the walkthrough far more than on the depth of the model architecture.",
    content: `An **ML system design** round is an entire interview at most companies — a 45-minute prompt as broad as "design a recommendation feed" — and the scoring is structural long before it is technical. The reliable move is to walk the same seven steps out loud, every time, in the same order.

## The Seven Steps, In Order
1. **Problem framing** — clarifying questions first: the business goal, how it translates into a concrete ML objective, and the scale, latency, and personalization constraints — plus an explicit check on whether ML is needed at all, since a recency sort solves a surprising share of these prompts.
2. **Metrics** — offline task-level numbers (precision/recall, AUC, nDCG, \`Recall@k\`), online business numbers (CTR, conversion, session engagement), and **counter-metrics** that catch the damage a winning model can do: negative feedback, unsubscribes, complaint rate.
3. **Data and labels** — sources and volume, and whether labels arrive as **natural (implicit) labels** from clicks and purchases or need human annotation, plus label scarcity and **label latency**, the delay between a prediction and the outcome confirming it.
4. **Features** — grouped per entity: user features, item features, context features, plus the **cross features** that encode interaction between them.
5. **Model** — **heuristic, then simple, then complex.** A baseline is not a warm-up act; it is the number every later model has to beat.
6. **Serving** — batch versus online inference, the latency budget, and the **two-stage retrieval-then-ranking** split that makes a large catalog tractable.
7. **Monitor and iterate** — drift, failure modes, feedback loops, and a stated retraining cadence.

## What Is Actually Being Scored
Systems thinking across the whole pipeline, not architectural depth at one point in it. **Quantification carries disproportionate weight** — 50,000 QPS at peak, a 2 million item catalog, 300 GB of daily event logs, a \`100 ms\` end-to-end budget. Tradeoffs count only when tied back to the constraints elicited in step 1.

## The Recurring Failure Modes
Opening with model architecture and skipping framing and metrics — the single most-cited failure, and a candidate who does it has already lost the round. Giving no numbers anywhere. Proposing no baseline, so no later number means anything. And listing only offline metrics — no online metric, no counter-metric — which concedes the design was never connected to the business.

## The Decision Rule
When the clock runs short, cut depth, not steps — a shallow pass across all seven beats a deep dive into two.`,
  },

  {
    id: "two-stage-retrieval-ranking",
    title: "Two-Stage Retrieval and Ranking",
    oneLiner: "Scoring millions of items per request is computationally impossible — so a cheap high-recall retrieval stage feeds an expensive high-precision ranker.",
    content: `Scoring every item in the catalog on every request is arithmetically impossible at production scale. With a catalog of 2 million items, a ranking model costing roughly 1 ms of feature lookup and scoring per item, and a \`100 ms\` end-to-end budget, the naive design misses its budget by four orders of magnitude. **Two-stage retrieval and ranking** is the standard escape — and it shows up in essentially every real large-scale design, which is exactly why candidates who never name it lose points.

## What Each Stage Is Actually For
The first stage — **candidate generation**, or **retrieval** — is deliberately cheap and deliberately coarse, narrowing 2 million items down to roughly \`top-500\` in a handful of milliseconds using lightweight signals. The second stage — **ranking** — is expensive and precise, computing rich cross features and running a heavy model over only those 500 survivors to produce the final order. The cost asymmetry is the entire point: the expensive model touches 0.025 percent of the catalog. Many systems add a third **re-ranking** pass on top — business rules, deduplication, freshness boosts, and diversity injection, which are policy decisions rather than relevance predictions.

## Why the Two Stages Optimize Different Metrics
Retrieval and ranking use different models trained on different objectives because they are being asked different questions. Retrieval optimizes **recall** — a candidate missed here can never be recovered downstream, since the ranker cannot order an item it never received — so it is measured with \`Recall@k\` and deliberately over-fetches. Ranking optimizes ordering quality among items already assumed relevant, so it is measured with nDCG or MRR. Applying ranking metrics to the retrieval stage is a common and revealing mistake.

## How Retrieval Gets Fast Enough
The standard mechanism is embedding-based: a **two-tower** model encodes users and items into the same vector space, and retrieval becomes a nearest-neighbour lookup. Exact search over 2 million vectors is still too slow, so production uses **approximate nearest neighbour (ANN) search** — index structures that return, say, 95 percent of the true neighbours in single-digit milliseconds.

## The Tradeoff Worth Naming
Every stage boundary is a recall sacrifice bought with latency, and the loss is permanent — so widening the candidate set is the first lever to pull when quality stalls, and the last one to trim when latency does.`,
  },

  {
    id: "recommender-systems",
    title: "Recommender Systems & the Cold-Start Problem",
    oneLiner: "Collaborative versus content-based filtering is only the setup — the cold-start follow-up, in its three distinct forms, is the question actually being asked.",
    content: `Recommender systems get asked of general candidates, not just at recommendation-heavy companies, because they compress data, modelling, and serving into one prompt. Two families answer the core question of what to show a user, and they fail in opposite ways.

## Collaborative Versus Content-Based, Side by Side
| Dimension | Collaborative Filtering | Content-Based Filtering |
|---|---|---|
| Signal used | Interaction patterns across users | Item attributes and a user's own history |
| Core claim | People similar to this one liked X | This item resembles what this user already liked |
| Mechanism | **Matrix factorization** of the user-item matrix into latent factors | Similarity between item feature vectors and a user profile |
| Main strength | Discovers surprising, non-obvious items | Works from the first interaction, no other users needed |

**Collaborative filtering** comes in **user-based** form (find similar users, recommend what they liked) and **item-based** form (recommend items co-consumed with ones already liked); item-based is usually preferred in production because item-item similarities are far more stable over time than user tastes. **Content-based filtering** instead matches item attributes — genre, brand, price band, text embeddings — against a profile built from that single user's behaviour.

## Where Each One Breaks
Collaborative filtering needs interaction density it does not always have, and it concentrates on popular items because that is where the signal lives. Content-based filtering is the opposite failure: it is safe and *narrow*, recommending endless near-duplicates of what a user already consumed, with no route to genuine discovery.

## Cold Start Is Three Problems, Not One
This is the scripted follow-up, and candidates routinely collapse three distinct cases into one. A **new user** has no history — mitigate with an onboarding preference survey, demographic priors, or a popularity fallback for the first few sessions. A **new item** has no interactions — mitigate with content features, so the item is recommendable on attributes from minute one, plus deliberate exploration traffic. A **new system** has neither — bootstrap from content similarity, an imported catalog, or external data until roughly 10,000 interactions accumulate and collaborative signal becomes usable.

## The Decision Rule
Production answers are always **hybrid**: collaborative filtering for warm users and warm items, content-based or popularity for cold ones, blended inside the two-stage retrieval architecture that has its own topic — and the interesting engineering is the switching rule, not either family alone.`,
  },

  {
    id: "feedback-loops-and-position-bias",
    title: "Feedback Loops & Position Bias",
    oneLiner: "A deployed model decides what users ever see, and those logged interactions become its next training set — which is a first-class failure mode, not a virtue.",
    content: `Almost no candidate raises this unprompted, which makes it a genuine differentiator in an ML design round. A **feedback loop** is not a monitoring concern bolted on at the end — it is a failure mode built into the structure of any deployed ranking or recommendation system.

## How a Model Ends Up Training on Its Own Output
A deployed model chooses what appears in the feed. Users can only click what appeared. Those clicks are logged, and the log becomes next week's training set. So the model is progressively trained on data it caused rather than on user preference — the training distribution is an artifact of last month's model weights. Items the model never surfaced accumulate no positive labels, which the next training run reads as evidence they are bad.

## Position Bias — A Click That Proves Nothing
The sharpest version of the problem. An item in slot 1 typically collects 3 to 5 times the clicks of the identical item in slot 5, purely from placement. The log records a click on a top-ranked item and cannot distinguish "this was better" from "this was shown first" — those two hypotheses produce byte-identical training data. **Position bias** therefore encodes the previous model's ordering directly into the labels.

## What This Does to the System
Rich-get-richer concentration, as already-popular items gather the impressions that justify more impressions. Collapsing diversity across the catalog, since the long tail is never sampled. Filter bubbles at the individual level. And, most deceptively, **offline metrics that look excellent precisely because they are broken** — a model scoring 0.85 nDCG on logged data may only be proving it agrees with its own past choices.

## The Mitigations, Named
**Exploration** — deliberately serving some non-greedy results, often via epsilon-greedy or bandit allocation, so items outside the model's current preference earn impressions. A **randomized holdout** — typically 1 to 5 percent of traffic, never personalized — providing an unbiased evaluation slice. And **propensity correction**, or **inverse propensity weighting**, which reweights each logged event by the inverse of the probability that item was shown in that position — downweighting easy slot-1 clicks and upweighting rare ones.

## One Caveat Worth Naming
This is the main reason offline and online metrics diverge: an offline win that fails its A/B test is often the loop being measured, not the model — and exploration costs real short-term engagement to buy unbiased data.`,
  },
];
