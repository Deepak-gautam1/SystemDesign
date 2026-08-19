import type { TheoryTopic } from "./types";

export const ML_NEURAL_NETWORKS_TOPICS: TheoryTopic[] = [
  {
    id: "activation-functions",
    title: "Activation Functions — ReLU vs. Sigmoid",
    oneLiner: "Without a non-linear activation, stacking any number of layers still collapses into one single linear layer — depth would be pointless.",
    content: `Every hidden layer in a neural network applies an activation function right after its linear transformation, and which one gets chosen has a huge effect on whether a deep network trains well at all.

## Why Non-Linearity Is Required at All
A single neural network layer computes a linear transformation of its input (a weighted sum). If every layer only did that, stacking any number of layers together would still collapse mathematically into one single linear layer — depth would add zero extra representational power. A **non-linear activation function** applied after each layer is what allows a deep network to approximate complex, curved decision boundaries and relationships at all.

## Sigmoid
\`sigmoid(x) = 1 / (1 + e^-x)\` squashes any input into the range (0, 1), and was historically the default choice for hidden layers. Its major flaw is the **vanishing gradient problem**: for large positive or large negative inputs, the sigmoid curve is nearly flat, so its derivative is nearly zero there. Imagine a steering wheel that barely turns anymore once it's been turned partway — that's what a saturated sigmoid neuron feels like to the training process: large input changes produce almost no output change, so almost no gradient signal flows backward through it, a problem that compounds badly in deep networks where this happens layer after layer.

## ReLU
\`ReLU(x) = max(0, x)\` is simple, computationally cheap, and — critically — does not saturate for positive inputs, since its gradient is exactly 1 there. That property is why ReLU became the default activation for hidden layers in most modern networks. Its downside is the **dying ReLU problem**: a neuron that consistently receives negative input always outputs zero, and since ReLU's gradient is also zero for negative inputs, that neuron has no way to recover on its own — it's permanently stuck contributing nothing. The standard fix is **Leaky ReLU**, which allows a small non-zero slope (e.g. \`0.01x\`) for negative inputs instead of a hard zero, so a small gradient signal always survives.

## Where Sigmoid Still Belongs
Despite the vanishing-gradient issue in hidden layers, sigmoid is still commonly used at the **output layer** for binary classification — a single (0, 1) value is exactly the probability-like output that task needs, and saturation at the very last layer doesn't block gradient flow through the rest of the network the way it would in a hidden layer.

## Quick Comparison

| | Sigmoid | ReLU |
|---|---|---|
| Output range | (0, 1) | [0, ∞) |
| Saturates? | Yes, at both ends | Only for negative inputs |
| Main risk | Vanishing gradients | Dying neurons |
| Typical role today | Output layer (binary classification) | Hidden layers (default) |`,
  },

  {
    id: "gradient-descent-variants",
    title: "Gradient Descent — Batch, Stochastic & Mini-Batch",
    oneLiner: "The same downhill-step idea, computed over the whole dataset, one example, or a small batch — trading off speed, stability, and memory differently each way.",
    content: `Gradient descent trains a model by repeatedly moving its weights a small step in the direction that reduces the loss fastest — the negative gradient of the loss with respect to the weights. The three common variants differ only in **how much data** gets used to compute that gradient before each update.

## The Three Variants

| Variant | Data used per update | Pros | Cons |
|---|---|---|---|
| **Batch** | Entire training set | Accurate, stable gradient | Slow and memory-heavy; one update per full pass |
| **Stochastic (SGD)** | One random example | Very fast per step; noise can help escape shallow local minima | Jumpy, noisy convergence |
| **Mini-batch** | A small batch (e.g. \`32-256\` examples) | Balances speed and stability | An extra hyperparameter (batch size) to tune |

Mini-batch is what's actually used in practice almost universally — it gets most of SGD's speed while keeping most of batch gradient descent's stability.

## Learning Rate & Momentum
The **learning rate** controls the size of each update step. Too high, and updates overshoot the minimum and can diverge entirely; too low, and training converges painfully slowly or gets stuck on a plateau. **Momentum** accumulates a running average of past gradients so each update keeps moving in a consistent direction, smoothing out noisy steps and helping push through shallow local plateaus — the standard analogy is a ball rolling downhill that builds up speed and can roll straight through small bumps instead of stopping at every one.

## Epoch, Batch, and Iteration
- An **epoch** is one full pass through the entire training set.
- A **batch** is the subset of examples processed together in a single forward/backward pass.
- An **iteration** is one single weight update — i.e., one batch processed.

These relate directly: with 1,000 training examples and a batch size of 100, one epoch consists of 10 iterations, since it takes 10 batches to cover the full dataset once.`,
  },

  {
    id: "backpropagation-and-vanishing-gradients",
    title: "Backpropagation & the Vanishing Gradient Problem",
    oneLiner: "The chain rule run backward through the network — and, in deep nets, the same chain rule that can shrink early-layer gradients to nearly zero.",
    content: `Training a neural network means figuring out how to adjust millions of weights so the loss goes down — backpropagation is the algorithm that makes that computationally feasible, and its own weak point is exactly what causes very deep networks to sometimes fail to train at all.

## What Backpropagation Actually Does
After a forward pass produces a prediction and a loss, **backpropagation** uses the chain rule from calculus to work out exactly how much each individual weight in the network contributed to that loss — moving backward from the output layer to the input layer, one layer at a time. This is what makes training deep networks with millions of parameters computationally tractable at all: instead of estimating each weight's effect from scratch, backprop reuses shared intermediate calculations as it moves layer by layer.

## The Vanishing Gradient Problem
The gradient for an early layer is a **product** of many intermediate derivatives — one for each layer standing between it and the output, chained together by the chain rule. If those derivatives are consistently less than 1, which happens with sigmoid or tanh activations whenever they're operating in their saturated, flat regions, that product shrinks toward zero as it gets multiplied across many layers. The practical result: early layers in a deep network receive almost no usable learning signal and effectively stop training, even while later layers keep updating normally — a network can look deep on paper while only its last few layers are actually learning anything.

## A Concrete Picture
Think of the gradient as a message whispered backward through a long line of people, one person per layer. If each person only passes along half of what they heard, by the tenth person almost nothing of the original message survives. That's essentially what happens to a gradient passed backward through ten saturated sigmoid layers.

## The Standard Mitigations
- **ReLU-family activations** — don't saturate for positive inputs, so their gradient doesn't shrink to zero there.
- **Careful weight initialization** (e.g. Xavier/He initialization) — keeps activations and gradients in a reasonable range from the very first forward pass.
- **Batch normalization** — keeps layer inputs in a consistent, well-behaved range throughout training, which keeps gradients healthier too.
- **Residual/skip connections** — let gradients bypass layers directly through a shortcut path instead of having to survive being multiplied through every layer in the chain. This is a major reason very deep networks like ResNets became trainable at all.`,
  },

  {
    id: "cnn-basics",
    title: "CNN Basics — Convolution, Pooling & Receptive Fields",
    oneLiner: "A small learnable filter slides across the whole image, reused everywhere, so the network needs far fewer parameters and recognizes patterns regardless of position.",
    content: `Images are exactly the kind of input a plain fully-connected network handles badly — convolutional neural networks (CNNs) exist specifically to exploit the spatial structure that a flat vector of pixels throws away.

## The Convolution Operation
A convolutional layer slides a small learnable filter (a **kernel**, e.g. \`3x3\` pixels) across the input, computing a dot product between the filter and whatever patch of input it's currently sitting over. The result is a **feature map** — a grid of activations that lights up wherever the pattern the filter learned to detect (an edge, a corner, a color blob) actually appears in the image.

## Why This Is So Parameter-Efficient
A fully-connected layer would need a separate weight for every pixel — for a modestly sized image, that's millions of weights in a single layer. A convolutional layer instead reuses the **same small filter** at every spatial position (**parameter sharing**), so a \`3x3\` filter needs only 9 weights total, no matter how large the input image is.

## Translation Invariance
Because the identical filter scans the entire image rather than being tied to one fixed location, a feature it has learned to detect — say, a cat's ear — is recognized no matter where in the image it appears. A cat in the top-left corner and the same cat in the bottom-right corner activate the same filter equally well.

## Receptive Field
The **receptive field** of a neuron is how much of the original input image its activation is actually influenced by. A neuron in the very first convolutional layer only "sees" a small patch. Stacking more convolutional and pooling layers grows the receptive field of neurons deeper in the network, which is exactly why deeper layers respond to increasingly large and abstract patterns: edges in early layers, textures and simple shapes in middle layers, and whole objects — faces, cars — in the deepest layers.

## Pooling
**Max-pooling** downsamples a feature map by keeping only the strongest activation within each small region (e.g. each \`2x2\` block) and discarding the rest. This reduces the computation needed downstream, adds a small amount of additional translation invariance, and helps control overfitting by throwing away precise positional detail that usually isn't needed — knowing *that* a feature was detected somewhere in a region is often enough, without needing the exact pixel it came from.`,
  },

  {
    id: "rnn-and-lstm-basics",
    title: "RNNs, LSTMs & the Sequence Modeling Problem",
    oneLiner: "Plain RNNs carry a memory forward step by step but forget over long distances; LSTMs add a protected conveyor belt and gates to fix exactly that.",
    content: `Text, audio, and time series all share one property a plain feedforward network can't handle: order matters, and earlier elements affect how later ones should be interpreted.

## The Problem: Sequences Need Memory
A plain feedforward network has no memory of any previous input — each input is processed completely independently of every other. That makes it a poor fit for sequences like text, time series, or audio, where the meaning of the current element often depends heavily on what came before it. A **recurrent neural network (RNN)** processes a sequence one element at a time while maintaining a **hidden state** — a running summary that gets updated at every step and carries information forward to influence how the next element is processed.

## The Core Limitation of Plain RNNs
Plain RNNs suffer badly from vanishing (and occasionally exploding) gradients over long sequences. During backpropagation-through-time, the same weight matrix gets applied repeatedly, once per time step — and just like an extremely deep feedforward network, that repeated multiplication shrinks the gradient toward zero across many steps. In practice, this makes it very hard for a plain RNN to learn a dependency between elements that are far apart, e.g. connecting a pronoun near the end of a long paragraph back to the noun it refers to near the beginning.

## LSTMs: The Standard Fix
A **Long Short-Term Memory (LSTM)** network adds a separate **cell state** that acts like a conveyor belt running alongside the hidden state, carrying information across many time steps largely unchanged. Three learned **gates** control what happens to it at each step:
- **Forget gate** — decides what information to discard from the cell state.
- **Input gate** — decides what new information from the current step gets added to it.
- **Output gate** — decides what part of the cell state gets exposed as the new hidden state.

Deciding what to keep, add, and expose — rather than being forced to overwrite everything at every single step — is what lets LSTMs preserve long-range dependencies that plain RNNs lose.

## GRUs
**Gated Recurrent Units (GRUs)** are a simplified variant of the same gating idea, merging some of the LSTM's gates together to use fewer parameters while achieving broadly similar results in practice.`,
  },

  {
    id: "batch-normalization-and-dropout",
    title: "Batch Normalization & Dropout",
    oneLiner: "Two different regularization tools for two different failure modes: batch norm stabilizes training, dropout prevents overfitting.",
    content: `Batch normalization and dropout are both applied inside a network during training, and both improve generalization — but they target different failure modes.

## Batch Normalization
**Batch normalization** normalizes the inputs to a layer — subtracting the batch mean and dividing by the batch standard deviation — at every training step. Without it, small changes in early layers' weights can compound as they propagate forward, causing the distribution of inputs seen by later layers to keep shifting throughout training (sometimes called **internal covariate shift** — like trying to hit a target that keeps quietly moving every time you adjust your aim), which forces those later layers to constantly re-adapt instead of steadily learning. By keeping layer inputs in a consistent, well-behaved range, batch normalization stabilizes and noticeably speeds up training, often allowing higher learning rates than would otherwise be stable. As a side effect, it also has a mild regularizing benefit, since the mean and standard deviation used are computed per batch and so vary slightly from one batch to the next, injecting a small amount of useful noise.

## Dropout
**Dropout** randomly "turns off" (zeroes out) a fraction of neurons in a layer on every forward pass during training — a common rate is \`20-50%\`. This forces the network to avoid relying too heavily on any single neuron, or on a narrow group of neurons that have co-adapted to only work correctly together, since any of them might be missing on a given pass — much like a sports team practicing with a random subset of players sitting out each session, so no single player becomes the one indispensable piece the whole team quietly leans on. At inference/test time, dropout is turned off entirely — every neuron is used — typically with a scaling adjustment so the expected output magnitude stays consistent between training (where neurons are randomly dropped) and inference (where none are).

## Two Different Jobs

| | Batch Normalization | Dropout |
|---|---|---|
| Main target | Training stability & speed | Overfitting |
| Mechanism | Normalizes layer inputs per batch | Randomly zeroes neurons per pass |
| Active at inference? | Yes (using learned running statistics) | No |

A useful mental model: batch norm keeps the numbers flowing through the network well-behaved; dropout keeps the network from memorizing the training set by leaning on a small clique of neurons.`,
  },

  {
    id: "optimizers",
    title: "Optimizers — SGD, Momentum, RMSprop & Adam",
    oneLiner: "\"Adam is better\" is the answer that loses points — the real one is that Adam converges faster while well-tuned SGD often generalizes better.",
    content: `Plain gradient descent applies one global learning rate to every parameter and treats each step as independent of the last. Modern optimizers fix those two limitations separately, and **Adam** is essentially the combination of both fixes.

## The Two Fixes, and How They Compose

| Optimizer | What it adds | Mechanism |
|---|---|---|
| **SGD + momentum** | Memory of past direction | A running average of past gradients — the first moment |
| **RMSprop** | A per-parameter learning rate | Divides by a running average of squared gradients — the second moment |
| **Adam** | Both at once | First moment for direction, second for per-parameter scaling |

**Momentum** accumulates a running average of past gradients so updates keep moving in a consistent direction, damping the oscillation that plain SGD suffers in narrow ravines. **RMSprop** attacks a different problem: parameters whose gradients are consistently large get a smaller effective step, and rarely-updated parameters get a larger one, which is precisely why adaptive methods handle **sparse gradients** well. **Adam** maintains both running averages, plus a bias correction for the fact that both start at zero and are therefore biased toward zero in the first few steps.

## Why Adam Is Not Simply the Right Answer
Adam converges faster and requires far less learning-rate tuning, which makes it the sensible default. But **well-tuned SGD with momentum frequently generalizes better** — which is why a great deal of computer-vision research still trains with it — and the honest answer names that tradeoff rather than declaring a winner. The reasoning is that Adam's adaptive scaling can settle into sharp minima that fit the training set slightly too well.

## Why AdamW Exists
Adding an L2 penalty to the loss is **not** equivalent to weight decay once Adam rescales each update by its second-moment estimate: the penalty gets divided down for exactly those parameters with large gradients, so regularization is applied unevenly and weakly. **AdamW** decouples weight decay from the gradient update, applying it directly to the weights instead, which restores the intended behavior — and it is the standard choice for training transformers.

## The Practical Default
Adam or AdamW to get a model training quickly, with SGD plus momentum worth trying when squeezing out final generalization on a well-understood problem. The learning rate remains the most important hyperparameter regardless of which optimizer is chosen.`,
  },

  {
    id: "training-mechanics",
    title: "Training Mechanics — Epochs, Schedules, Initialization & Augmentation",
    oneLiner: "A cluster of small, near-guaranteed questions — including one whose answer is symmetry, not scale.",
    content: `Several short deep-learning questions recur constantly and are cheap to lock down. They share a theme: each concerns how training is *set up* rather than what the network computes.

## Epoch, Batch and Iteration
An **epoch** is one full pass over the training set; the **batch size** is how many examples are processed before the weights update once; an **iteration** is a single such update. With 10,000 training examples and a batch size of \`100\`, one epoch is \`100\` iterations, and 20 epochs is \`2,000\` iterations. The more interesting version of this question asks why training uses ordered epochs at all rather than sampling with replacement — the answer being that epochs guarantee every example is seen an equal number of times, which sampling only achieves in expectation.

## Why Weights Cannot Be Initialized to Zero
This question is asked far more often than any specific initialization scheme, and the answer is **symmetry**, not magnitude. If every weight in a layer starts identical, every neuron in that layer receives the same gradient and therefore applies the same update — they remain identical forever, and the layer has the representational capacity of a single neuron no matter how wide it is. Random initialization breaks that symmetry. **Xavier** initialization scales the initial variance for sigmoid and tanh layers, **He** initialization does the equivalent for ReLU, and both exist to keep activation variance stable across depth rather than to break symmetry.

## Learning Rate Schedules
A learning rate that is good early is usually too large late, once the optimizer is near a minimum and needs to stop overshooting it. **Decay schedules** — step, cosine, or exponential — shrink it over training. **Warmup** does the reverse at the very start, ramping up from near zero over the first few hundred steps, which stabilizes training for transformers and large batch sizes where an early large step can be catastrophic.

## Data Augmentation and Its One Rule
**Data augmentation** expands a limited training set by applying transformations that preserve the label — crops, rotations, and color shifts for images. The rule that gets tested is that augmentation must be **label-preserving and realistic for the actual data distribution**: horizontally flipping a photograph of a cat is fine, while horizontally flipping a handwritten digit or a line of text destroys the very thing being classified.`,
  },
];
