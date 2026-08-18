import type { TheoryTopic } from "./types";

export const ML_DIMENSIONALITY_REDUCTION_TOPICS: TheoryTopic[] = [
  {
    id: "pca-explained",
    title: "Principal Component Analysis (PCA)",
    oneLiner: "Finds the directions where data varies the most and projects onto just a few of them, keeping most of the signal while dropping the redundancy.",
    content: `**Principal Component Analysis (PCA)** finds the directions in the data along which it varies the most — its **principal components** — and projects the data onto a small number of these directions instead of using every original feature. The goal is to compress the data into far fewer dimensions while preserving as much of the original variance (information) as possible.

## Unsupervised and Linear
PCA is **unsupervised**: it never looks at labels, only at the variance and correlation structure of the features themselves. It is also **linear**: every principal component is just a weighted combination of the original features, not some arbitrary curved transformation of them.

## How It Works, Conceptually
1. Compute the **covariance matrix** of the features — how much each feature varies together with every other feature.
2. Find that matrix's **eigenvectors** (the principal components themselves — the actual directions in feature space) and **eigenvalues** (how much variance each of those directions explains).
3. Rank the components by eigenvalue and keep only the \`top-k\` — those that together explain most of the total variance, often enough to cross a threshold like 95%.

## Concrete Example
Picture a housing dataset with 50 features: square footage, bedroom count, bathroom count, lot size, garage size, and so on. Many of these move together — bigger houses tend to have more bedrooms, bigger garages, and bigger lots all at once. PCA can typically compress those 50 correlated features down to just 2-3 principal components that capture most of the meaningful variation, because all that redundant, co-moving information collapses into a couple of underlying dimensions.

## When to Use It
- Reducing the number of input features before a model that degrades or slows down when given too many of them.
- Visualizing high-dimensional data by plotting just its top 2 or 3 components.
- Removing multicollinearity among features that are highly correlated with each other.

## The Tradeoff: Lost Interpretability
Principal components are linear combinations of the original features, so they lose direct interpretability. "Principal component 2" doesn't mean anything as intuitive as "square footage" — it might be some blend of square footage, lot size, and garage size with no clean real-world name of its own.`,
  },

  {
    id: "pca-lda-tsne-umap",
    title: "PCA vs. LDA vs. t-SNE vs. UMAP",
    oneLiner: "Same job — squeeze many dimensions into few — but each one optimizes for something different: variance, class separation, or 2D visual structure.",
    content: `PCA, LDA, t-SNE, and UMAP are all dimensionality-reduction techniques, but they optimize for different things and are not interchangeable.

## Side-by-Side Comparison

| Method | Supervised? | Linear? | Typical Use Case |
|---|---|---|---|
| **PCA** | Unsupervised | Linear | General-purpose dimensionality reduction and preprocessing |
| **LDA** | Supervised | Linear | Reducing dimensions specifically to maximize class separability, e.g. before a classifier |
| **t-SNE** | Unsupervised | Non-linear | Visualizing high-dimensional clusters in 2D/3D |
| **UMAP** | Unsupervised | Non-linear | Same visualization use case as t-SNE, but faster and better at preserving global structure |

## Supervised vs. Unsupervised
PCA finds directions of maximum variance without ever looking at labels. **LDA (Linear Discriminant Analysis)** does look at labels — it finds the directions that best *separate* known classes from each other, rather than the directions that simply spread the data out the most. Those two goals can disagree: the direction of maximum variance isn't always the direction that best separates two classes.

## Linear vs. Non-Linear
PCA and LDA can only draw straight-line (linear) projections, so they miss curved or twisted structure in the data. **t-SNE** and **UMAP** are non-linear, and can unfold complex, curved structure that a linear method would flatten into an uninformative blob.

**A concrete picture:** plot 10,000 handwritten digit images (0 through 9) in 2D after each technique. PCA often smears the ten digits into overlapping blobs, since it only chases overall variance and has no notion of digit identity at all. t-SNE or UMAP, by contrast, typically reveal ten fairly distinct, well-separated clusters — one per digit — because both are built specifically to preserve neighborhood structure rather than raw variance.

## The Visualization Caveats
t-SNE is excellent at preserving **local** neighborhood structure — points that are genuinely close together in high-dimensional space stay close together in the 2D plot — but the distance *between* separate clusters, and the *size* of each cluster, are not meaningfully interpretable in a t-SNE plot. UMAP targets the same visualization use case but is typically faster and better at preserving more **global** structure between clusters, which is why it has increasingly replaced t-SNE as the default choice.

## The Decision Rule
Reach for **PCA** as the general-purpose default. Reach for **LDA** when labeled classes exist and the downstream goal is classification. Reach for **t-SNE or UMAP** specifically when the end goal is a 2D/3D plot for visual inspection — not feeding the reduced features into another model.`,
  },
];
