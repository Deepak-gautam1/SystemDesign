import type { TheoryTopic } from "./types";

export const ML_CLUSTERING_TOPICS: TheoryTopic[] = [
  {
    id: "kmeans-clustering",
    title: "k-Means Clustering — How It Actually Converges",
    oneLiner: "The entire algorithm is two alternating steps that provably lower one number — and almost everything that goes wrong with it traces back to where those steps started.",
    content: `**k-means** partitions a dataset into \`k\` clusters by alternating between two cheap steps until the assignments stop changing. It never sees labels; the only thing it optimizes is geometric — making the points inside each cluster as close as possible to their own cluster's center.

## The Two Steps That Repeat
After \`k\` centroids are initialized somewhere in feature space, the algorithm alternates:
1. **Assign** — every data point joins the cluster of whichever centroid is nearest, typically by Euclidean distance.
2. **Update** — each centroid moves to the mean of all points currently assigned to it, which is exactly where the name comes from.

Those two steps repeat until no point changes cluster membership between iterations, or a maximum-iteration cap is reached. That fixed point *is* convergence — not a tolerance on some loss curve, but assignments that have simply stopped moving.

## What It Is Actually Minimizing
Every pass lowers, or leaves unchanged, the **within-cluster sum of squares** — **inertia**: the total squared distance from each point to its assigned centroid. Both steps push inertia downward, which is why the loop terminates at all. That same monotone decrease is also what makes inertia useless for choosing \`k\` — the next topic's problem.

## Why Initialization Decides the Outcome
Because inertia only ever decreases, k-means converges to a **local optimum**, and which local optimum depends entirely on where the centroids began. Purely random seeding can drop two centroids inside one dense blob and none in another; no later iteration repairs that, since a monotone loop cannot climb back out. **k-means++** seeds greedily instead — the first centroid is random, and each subsequent one is drawn with probability proportional to its squared distance from the nearest already-chosen centroid, deliberately spreading the initial centers apart. Running the whole procedure from several different seeds and keeping the lowest-inertia result — scikit-learn's \`n_init\` parameter — is standard practice, not paranoia.

## The Preprocessing Step That Gets Skipped
k-means is distance-based, so unscaled features silently hijack it. **Concrete example:** clustering customers on annual spend (roughly 500 to 50,000) and visits per month (1 to 30) lets spend contribute distances thousands of times larger, so the "clusters" degenerate into spend brackets, with visit frequency contributing almost nothing. Scaling first is not hygiene here — it is what makes the distance mean what it is supposed to mean.`,
  },

  {
    id: "choosing-k",
    title: "Choosing k — Elbow Method vs. Silhouette Score",
    oneLiner: "Inertia can never choose k for itself because it falls forever — the silhouette score can actually be maximized, and domain context often settles the question before either plot is drawn.",
    content: `The obvious move — sweep every \`k\` and keep whichever minimizes inertia — cannot work, and knowing why is most of this topic. **Inertia** falls monotonically as \`k\` rises, so the winner is always the largest value tried; at \`k = n\` every point is its own cluster and inertia hits exactly zero — a perfect score for a useless model.

## The Elbow Method and Its Genuine Weakness
The **elbow method** plots inertia against \`k\` and looks for where a steep drop flattens into a shallow decline, on the reasoning that clusters added past the elbow split real groups rather than separate them. The honest weakness — the part interviews probe — is that on real data the elbow is frequently ambiguous or absent entirely: a smoothly bending curve has no distinguished point on it, and two analysts reading the same plot routinely defend different values. It is a visual heuristic, never a criterion.

## The Silhouette Score Can Actually Be Maximized
For each point, the **silhouette score** compares **cohesion** — mean distance to the other points in its own cluster — against **separation** — mean distance to the points of the nearest neighboring cluster. It ranges over \`[-1, 1]\`: near \`1\` means the point sits comfortably inside a well-separated cluster, near \`0\` means it straddles a boundary, and negative means it sits closer to a neighboring cluster than its own and was probably misassigned. Averaged over all points it yields one number that does *not* automatically improve as clusters multiply — so unlike inertia, it can be maximized directly.

## Worked Example
Clustering 5,000 customers on spend, visit frequency, and basket size, inertia falls from 8,200 at \`k = 2\` to 5,100 at \`k = 3\`, then 3,900, 3,500, and 3,200 at \`k = 4\`, \`5\`, and \`6\` — monotone, as promised, with the per-step gain collapsing from 3,100 to 300. Mean silhouette across that same sweep reads 0.41, 0.52, 0.58, 0.49, 0.44. It peaks unambiguously at \`k = 4\`; the inertia curve merely bends there, gently enough that \`k = 3\` or \`k = 5\` is equally defensible from the plot alone.

## The Answer That Sounds Less Clever and Is Usually Right
Domain context often overrides both diagnostics. If the business is funding exactly four campaigns, \`k = 4\` is the answer whether or not silhouette agrees — five segments cannot be acted on. The strongest response names that constraint first, then uses silhouette to measure what it costs in cluster quality.`,
  },

  {
    id: "hierarchical-and-dbscan",
    title: "Hierarchical Clustering & DBSCAN",
    oneLiner: "One of them lets k be chosen after fitting by cutting a tree; the other never asks for k at all and hands back the outliers as a labeled by-product.",
    content: `k-means demands \`k\` before it starts and quietly assumes clusters are round and comparably sized. **Agglomerative hierarchical clustering** and **DBSCAN** each abandon one of those assumptions — and each pays for it somewhere else.

## Hierarchical Clustering Postpones the Choice of k
Agglomerative clustering works bottom-up: every point starts as its own cluster, and the two closest clusters merge repeatedly until one remains. "Closest" is defined by the **linkage** criterion, which shifts the result more than most candidates expect — **single linkage** uses the two nearest members and tends to produce long straggly chains, **complete linkage** uses the two farthest and favors compact blobs, **average linkage** splits the difference, and **Ward linkage** merges whichever pair increases within-cluster variance least, the usual default. The output is not a labeling but a **dendrogram** — the full merge tree, with branch heights recording merge distances. That is the real payoff: \`k\` gets chosen *after* fitting, by cutting the tree at a height. **Concrete example:** cutting one fitted 5,000-customer dendrogram at height 12 yields 3 clusters; cutting that same tree at height 7 yields 6, with no refitting.

## DBSCAN Clusters by Density, Not Distance to a Center
**DBSCAN** grows clusters out of dense neighborhoods via two parameters: \`eps\`, the neighborhood radius, and \`min_samples\`, how many points must fall inside it for a point to qualify as a **core point**. Two genuine advantages over k-means follow. It recovers arbitrarily shaped, non-spherical clusters — two interleaved crescents, which k-means slices straight through — and it labels sparse points as **noise** instead of forcing every observation into some cluster.

## Side by Side
| | k-means | Hierarchical | DBSCAN |
|---|---|---|---|
| Needs \`k\` up front? | Yes | No — cut the tree after | No — density decides |
| Cluster shape | Spherical only | Depends on linkage | Arbitrary |
| Outliers | Absorbed | Absorbed | Labeled noise |
| Rough cost | \`O(n k)\` per pass | \`O(n^2)\` or worse | \`O(n log n)\` indexed |

## Where Each One Breaks
A single global \`eps\` assumes uniform density, so when one cluster is tight and another diffuse no radius fits both — one fragments while the other swallows its neighbors. And \`eps\` is a raw distance, which makes it harder to tune as dimensionality grows and pairwise distances concentrate. Hierarchical clustering's cost, meanwhile, rules it out well before a million rows.`,
  },

  {
    id: "anomaly-detection",
    title: "Anomaly Detection — When the Labels Barely Exist",
    oneLiner: "Once positives are a handful or entirely unlabeled, the job stops being classification and becomes modeling normality — and review capacity, not a validation curve, usually sets the threshold.",
    content: `A fraud dataset with 10,000 transactions and 100 genuinely fraudulent ones is still a supervised problem — 1% positives is imbalanced, not hopeless. **Anomaly detection** is the framing for what lies past that point: a dozen confirmed positives rather than a hundred, or none labeled at all, where the question shifts from "which class is this?" to "how unlike everything else is this?".

## Why the Framing Has to Change
A classifier needs enough positive examples to characterize the positive class, and it recognizes only the fraud patterns its labels already contain. Anomaly detection models what *normal* looks like and scores deviation from it — which is why it catches novel attack patterns no label anticipated, and equally why it flags a customer's first legitimate overseas trip. Imbalance tooling addresses a different problem and offers nothing here; there is essentially nothing to resample.

## Four Approaches Worth Naming
- **Statistical thresholds** — flag points past a **z-score** cutoff (commonly \`|z| > 3\`) or outside the **IQR** fences at \`Q1 - 1.5*IQR\` and \`Q3 + 1.5*IQR\`. Transparent and cheap, but one feature at a time — it misses the transaction that is unremarkable in every column yet bizarre in combination.
- **Isolation Forest** — builds trees by picking a random feature and a random split value, then records how many splits it takes to isolate each point. The logic inverts most methods: an outlier sits in a sparse region, so a random cut separates it early — a point isolated in 4 splits where the average is 12 scores as strongly anomalous. Normality itself is never modeled, only how easily a point can be cut away.
- **One-Class SVM** — fits a boundary around the region normal data occupies in a kernel-transformed space and calls everything outside it anomalous; sensitive to its kernel and \`nu\` settings, and poor at scale.
- **Reconstruction error** — an autoencoder trained only on normal traffic (its architecture has its own topic) rebuilds normal records faithfully and anomalies badly, making that error the score.

## The Evaluation Problem Nobody Escapes
With 12 confirmed frauds in a year, precision and recall estimates carry enormous uncertainty, and recall is unmeasurable in principle — undetected fraud never enters the denominator. So the threshold usually comes from **review capacity**: if analysts can investigate 50 cases a day, the cutoff sits wherever the top 50 scores fall, and precision among reviewed cases becomes the only honest metric. That is a staffing constraint wearing the costume of a modeling decision — worth naming out loud rather than pretending a validation curve chose it.`,
  },
];
