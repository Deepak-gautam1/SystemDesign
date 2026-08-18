import type { TheoryTopic } from "./types";

export const ML_ADVANCED_ARCHITECTURES_TOPICS: TheoryTopic[] = [
  {
    id: "autoencoders-and-gans",
    title: "Autoencoders & GANs",
    oneLiner: "One network learns to compress-and-rebuild its own input; two networks learn by trying to fool each other.",
    content: `Autoencoders and GANs are both unsupervised approaches built to learn rich representations of data without labels, but they go about it in almost opposite ways — one by compressing and reconstructing, the other by competing.

## Autoencoders
An **autoencoder** is an unsupervised network trained to reconstruct its own input. It's structured as an **encoder** that compresses the input down into a small **bottleneck** (a compact latent representation) — think of squeezing a detailed photo down into a single caption-length summary — followed by a **decoder** that reconstructs the original input back out of that compressed representation. Because the bottleneck is deliberately too small to just copy the input straight through, the network is forced to learn which features of the data actually matter in order to reconstruct it well.

**Common uses:**
- **Dimensionality reduction** — a non-linear alternative to PCA, since the encoder/decoder pair can learn curved, complex relationships that a purely linear projection can't.
- **Denoising** — train the network to reconstruct a clean input from a deliberately corrupted, noisy version of it, which teaches it to separate real signal from noise.
- **Anomaly detection** — an input very different from the training distribution reconstructs poorly, since the network never learned a good compressed representation for anything like it; that reconstruction error itself becomes the anomaly signal.

## GANs
A **Generative Adversarial Network (GAN)** trains two networks against each other: a **generator** that tries to produce fake data realistic enough to fool a **discriminator**, and a discriminator that tries to correctly tell real training data apart from the generator's fakes. The classic analogy is a counterfeiter (the generator) trying to print fake money convincing enough to fool a bank teller (the discriminator) trained to spot forgeries — as the counterfeiter improves, the teller has to get sharper too, and vice versa, each pushing the other to improve. Ideally, this back-and-forth converges to a generator capable of producing highly realistic, novel data — images, in the most famous examples — that never actually appeared in the training set.

## Why GANs Are Notoriously Hard to Train
This adversarial min-max setup is exactly what makes GANs so unstable to train — the two networks are chasing a moving target in each other, rather than each independently descending a fixed loss surface. A common specific failure mode is **mode collapse**, where the generator discovers a narrow handful of outputs that reliably fool the discriminator and starts producing only those, sacrificing the full diversity of the real data distribution in exchange for a few guaranteed wins.`,
  },

  {
    id: "transformers-vs-rnns",
    title: "Transformers vs. RNNs/LSTMs",
    oneLiner: "Self-attention lets every position look directly at every other position at once, trading the sequential bottleneck of RNNs for massive parallelism.",
    content: `Transformers displaced RNNs and LSTMs as the dominant sequence-modeling architecture almost entirely on the strength of one mechanism: self-attention.

## The Problem Transformers Solve
RNNs and LSTMs process a sequence strictly one step at a time — each step's computation depends on the hidden state produced by the step before it. That sequential dependency makes them slow to train, since computation across a whole sequence can't be parallelized along the sequence dimension, and even with gating mechanisms, they still struggle with very long-range dependencies.

## Self-Attention
**Self-attention** is the mechanism transformers use instead: every position in a sequence directly looks at, and weighs the relevance of, every other position, in a single step — regardless of how far apart they are. Take the sentence "The trophy didn't fit in the suitcase because it was too big" — figuring out what "it" refers to means connecting a word near the end directly back to one near the beginning. Self-attention resolves that link in a single step; a plain RNN instead has to relay the relevant information through every word in between, with a chance to lose or dilute it at each hop.

## Why This Enables Massive Parallelization
Because attention over a whole sequence can be computed as matrix operations across all positions simultaneously, rather than the strictly sequential, step-by-step processing an RNN requires, transformers can be trained far more efficiently on modern parallel hardware like GPUs and TPUs. This is the main practical reason transformers scale so much better to huge datasets and huge model sizes than RNNs ever could.

## Positional Encoding
Self-attention has no inherent sense of order — it looks at every position at once, so left unmodified it would treat a sequence as an unordered bag of elements. To fix that, transformers add explicit **positional encoding** information to each input, injecting a sense of sequence order that would otherwise come for free from an RNN's inherently sequential, step-by-step processing.

## The Practical Tradeoff

| | RNN / LSTM | Transformer |
|---|---|---|
| Processing | Strictly sequential | Parallel across the sequence |
| Long-range dependencies | Weak, even with gating | Strong — direct attention to any position |
| Data/compute needed to train well | Lower | Higher |
| Current dominance | Niche/legacy | Dominant for language, and increasingly vision and audio |

Transformers generally need more data and compute to train well from scratch than an equivalent-sized RNN, but they scale better with both — which is exactly why they now dominate most sequence-modeling tasks.`,
  },

  {
    id: "generative-vs-discriminative",
    title: "Generative vs. Discriminative Models",
    oneLiner: "One learns the decision boundary between classes; the other learns what the data actually looks like well enough to create new examples of it.",
    content: `Every model that produces a label or a probability can be sorted into one of two philosophical camps, based on what it actually bothers to learn about the data.

## The Core Distinction
A **discriminative model** learns the boundary between classes directly — it models \`P(label | features)\`, capturing only what's needed to answer "given this input, what's the most likely label." Logistic regression, standard neural network classifiers, and SVMs are all discriminative.

A **generative model** instead learns the full underlying distribution of the data itself — it models \`P(features, label)\` or \`P(features | label)\`. That's a strictly harder problem, but it's also enough to actually **generate** new, realistic examples resembling the training data, not merely classify existing ones. Naive Bayes, GANs, diffusion models, and — in a looser sense — autoencoders are all generative.

## Concrete Intuition
Given a pile of cat and dog photos: a discriminative model learns to draw the dividing line that separates "cat" photos from "dog" photos as accurately as possible — it never needs to understand what makes a cat look like a cat beyond whatever distinguishes it from a dog. A generative model learns what actually makes a photo look like a cat, and what makes one look like a dog, well enough that it could paint a brand-new, never-before-seen cat photo from scratch.

## The Tradeoff

| | Discriminative | Generative |
|---|---|---|
| What it learns | The boundary between classes | The full data distribution itself |
| Modeling problem | Usually simpler | Usually harder |
| Pure classification accuracy (enough labeled data) | Often better | Often worse |
| Can generate new data? | No | Yes |
| Handles missing features gracefully? | Not naturally | Yes |
| Useful for semi-supervised learning? | Not naturally | Yes |

Discriminative models are usually simpler and often perform better on pure classification tasks when there's enough labeled data, precisely because they don't spend modeling capacity on the harder problem of fully explaining how the data was generated. But generative models unlock capabilities discriminative models fundamentally can't reach: sampling entirely new data, handling missing features more gracefully, and learning usefully from unlabeled data in a semi-supervised setting.`,
  },

  {
    id: "bayesian-vs-frequentist",
    title: "Bayesian vs. Frequentist Statistics",
    oneLiner: "Frequentist stats treats the true answer as fixed and asks how surprising the data is; Bayesian stats treats the answer itself as uncertain and updates a belief about it.",
    content: `Frequentist and Bayesian statistics answer the same basic question — what can we responsibly conclude from data — using two fundamentally different notions of what probability even means.

## The Core Philosophical Difference
**Frequentist statistics** treats a parameter — say, the true click-through rate of an ad — as a single, fixed, unknown constant. It asks what the observed data implies about that fixed constant using tools like p-values and confidence intervals, both of which are defined in terms of long-run frequency: if this experiment were repeated infinitely many times, some fixed percentage of the resulting confidence intervals would contain the true value.

**Bayesian statistics** instead treats the parameter itself as uncertain, and represents that uncertainty directly as a probability distribution. It starts with a **prior** belief about the parameter — which can be very vague if little is known in advance — then updates it using observed data via **Bayes' theorem** to produce a **posterior distribution**. That posterior directly answers "given what I've seen, how likely is each possible value of this parameter," a question a frequentist confidence interval, strictly speaking, does not actually answer.

## Concrete Example: An A/B Test
A **frequentist** approach asks: "assuming there is truly no difference between version A and version B, how surprising is this observed data?" — producing a p-value. A **Bayesian** approach instead directly computes: "given this data, what's the probability that B is actually better than A?" — usually the more intuitive question stakeholders actually want answered, since most people instinctively, if incorrectly, interpret a p-value as though it already answered exactly that.

## Side-by-Side

| | Frequentist | Bayesian |
|---|---|---|
| Treats the parameter as | A fixed, unknown constant | A random variable with a distribution |
| Core tool | p-values, confidence intervals | Prior updated to a posterior via Bayes' theorem |
| Requires choosing a prior? | No | Yes |
| Typical output | "How surprising is this data, assuming no effect?" | "How likely is each possible value, given this data?" |

## The Practical Tradeoff
Bayesian methods allow prior knowledge to be incorporated directly and produce more directly interpretable probability statements, such as an 87% chance that B is better — but they require choosing a prior, which can be criticized as injecting subjectivity, and are often more computationally expensive, since computing a full posterior distribution is harder than computing a single test statistic. Frequentist methods are simpler, more standardized, and require no prior, but their outputs are frequently misinterpreted: a p-value is **not** "the probability that the null hypothesis is true," despite that being one of the most common misreadings in applied statistics.`,
  },
];
