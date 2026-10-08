import type { TheoryTopic } from "./types";

export const AI_LLM_INTERNALS_TOPICS: TheoryTopic[] = [
  {
    id: "tokenization-bpe",
    title: "Tokenization — Why the Model Never Sees Words",
    oneLiner: "An LLM reads IDs for subword chunks learned by byte-pair encoding — and many of its odd failures, from spelling to arithmetic to cost, trace back to that one step.",
    content: `Before a transformer sees anything, a **tokenizer** has already decided what the units of language are — and that decision is frozen into the model for its whole life.

## How Byte-Pair Encoding Builds a Vocabulary
**BPE** starts from individual bytes and repeatedly **merges the most frequent adjacent pair** in a training corpus into a new token, recording each merge, until the vocabulary reaches a target size. Common words end up as single tokens, rare words split into several pieces, and nothing is ever out of vocabulary, because the byte alphabet underneath can spell any string. **WordPiece** picks merges by a likelihood score instead of raw frequency, and the **unigram** model behind many SentencePiece tokenizers works in reverse — start large and prune — but all three end in the same place: a fixed inventory of subword pieces.

## Vocabulary Size Is a Real Tradeoff
A bigger vocabulary means **shorter sequences** — more text per context window, fewer decoding steps, lower cost per document — at the price of larger embedding and output matrices, and rare tokens that each get few training updates. Vocabularies have grown accordingly: GPT-2 used about 50K tokens, Llama 2 used 32K, and Llama 3 moved to 128K, encoding the same text in noticeably fewer tokens.

## Failures That Are Really Tokenizer Artifacts
- **Spelling and letter counting** — "strawberry" arrives as a few opaque chunks, not ten letters, so the question asks about information the input never exposes.
- **Arithmetic** — digit strings chunk unevenly depending on length, which is why LLaMA split every number into single digits and GPT-4's tokenizer caps number chunks at three digits.
- **Non-English cost** — tokenizers trained mostly on English fragment other scripts, so the same sentence can take several times as many tokens: higher cost, less usable context, slower generation.
- **Glitch tokens** — strings like \`SolidGoldMagikarp\` that won a vocabulary slot from the tokenizer's corpus but barely appeared in the model's training data, leaving their embeddings essentially untrained.

## Tokens Are the Unit of Everything Downstream
Context limits, pricing, rate limits and latency are all counted in tokens — roughly three-quarters of an English word each, and far less for unusual code identifiers or non-Latin scripts. Whitespace and case matter too: \`" Hello"\` and \`"Hello"\` are different tokens.

## The Decision Rule
When a model fails at something character-level or numeric, suspect the tokenization before the model; when estimating cost or context for a new language or domain, count tokens on real samples instead of assuming English ratios.`,
  },

  {
    id: "decoder-only-transformer",
    title: "Inside a Decoder-Only Transformer",
    oneLiner: "An LLM is one block repeated dozens of times — attention moves information between positions, an MLP transforms it in place, both writing into a residual stream.",
    content: `Strip away the scale and every GPT-style model is the same short recipe: embed the tokens, pass them through a stack of identical blocks, and predict the next token at every position.

## The Residual Stream Is the Backbone
Each token starts as an embedding of width \`d_model\` that flows up through every layer. Blocks never overwrite it — each one **reads** the stream, computes something, and **adds** its output back. That residual structure is why very deep stacks train at all: gradients reach every layer directly, and a block with nothing useful to contribute can simply add close to zero.

## Two Sublayers, Two Jobs
- **Causal self-attention** is the only place information moves *between* positions — each token gathers what it needs from earlier tokens.
- The **MLP** works on each position independently, expanding to about four times the width and projecting back. It holds most of the parameters, and much of the model's factual association appears to live there.

Modern blocks normalize *before* each sublayer (**pre-norm**) rather than after, which keeps deep training stable, and most open models use **RMSNorm** and a gated **SwiGLU** MLP in place of LayerNorm and ReLU.

## Where the Parameters Go
Per layer, attention's four projections hold about \`4·d²\` weights and a 4×-wide MLP about \`8·d²\`, so a model has roughly \`12 · n_layers · d²\` parameters plus embeddings. GPT-3 checks out: 96 layers at a width of 12,288 gives about 174 billion, against its stated 175 billion. Doing that arithmetic out loud is a strong interview signal.

## Why Decoder-Only Won
Encoder-only models like BERT and encoder-decoders like T5 remain strong at specific jobs, but decoder-only scaled best for general use: one architecture, one objective, and **every position is a training example** — a 2,048-token sequence yields 2,048 next-token predictions. The same autoregressive form covers understanding (put the text in the prompt) and generation (keep sampling), and in-context learning emerged from it at scale.

## The Output End
A final normalization and an **unembedding** matrix — often tied to the input embedding — turn each position's vector into logits over the whole vocabulary. Training applies cross-entropy at every position in parallel; generation reads only the last position, one token at a time.

## The Decision Rule
Reason about cost and capability from the block: width and depth set the parameter count and memory, attention sets how cost grows with sequence length, and the residual stream is the frame for asking what any one layer contributes.`,
  },

  {
    id: "positional-encoding-long-context",
    title: "Positional Encoding & Long Context — RoPE, ALiBi, YaRN",
    oneLiner: "Attention is order-blind, so position has to be injected — and how it's injected decides whether a model trained on 4K tokens can later be stretched to 128K.",
    content: `Self-attention treats its input as a set: shuffle the tokens and, without positional information, the outputs just shuffle with them. Position has to be added, and the method chosen turns out to govern how far the context can reach.

## Absolute Encodings: Where It Started
The original transformer added fixed **sinusoidal** vectors to the token embeddings; GPT-2 and BERT **learned** one vector per position. Both encode *absolute* position, and both generalize poorly past the training length — a learned table simply has no row for position 1,025 in a model trained on 1,024.

## RoPE: Position as Rotation
**Rotary position embedding**, now the default in most open LLMs, **rotates** query and key vectors instead of adding anything to the embeddings — each pair of dimensions turned by an angle proportional to the token's position, at its own frequency. When two rotated vectors are dot-producted, only the *difference* of their angles survives, so attention scores depend on **relative** distance. **ALiBi** takes a simpler route: no positional vectors at all, just a penalty on attention scores that grows linearly with distance, which extrapolates past the training length more gracefully than absolute schemes.

## Stretching the Window After Training
Training at full length from the start is expensive, so long-context models are usually extended afterwards. **Position interpolation** rescales positions so a longer sequence maps into the angle range the model already knows — Meta took LLaMA from 2K to 32K tokens with about a thousand fine-tuning steps. **NTK-aware scaling** and **YaRN** refine this by stretching low-frequency dimensions more than high-frequency ones, keeping fine local resolution while reaching far.

## A Long Window Is Not Long Comprehension
Fitting a document in the window doesn't mean using it well. Recall of facts placed mid-prompt is markedly worse than at the start or end (**lost in the middle**), and accuracy on harder tasks falls as inputs grow, well before the advertised limit. **Needle-in-a-haystack** tests overstate real ability: finding one planted sentence is far easier than reasoning across many scattered facts. And every extra token adds attention compute and KV-cache memory on every call.

## The Decision Rule
Treat the advertised context length as a ceiling, not a working size: test your own task at the lengths you'll really use, put the most important material at the start or end, and retrieve the relevant slice instead of pasting everything.`,
  },

  {
    id: "mixture-of-experts",
    title: "Mixture of Experts — Total vs. Active Parameters",
    oneLiner: "MoE routes each token to a few of many expert MLPs, so a model holds far more parameters than it spends compute on — paid for in memory, routing and serving complexity.",
    content: `A dense model uses every parameter for every token. A **mixture-of-experts** model breaks that link: it holds many parameters, but each token passes through only a few of them.

## How the Layer Works
The MLP in some or all blocks is replaced by a set of **expert** MLPs and a small **router**. For each token the router scores the experts, sends the token to the **top-k** — typically one or two — and combines their outputs using the router's weights. Attention stays dense; only the feed-forward capacity is split.

## Total Versus Active Parameters
This is the distinction to state precisely. **Mixtral 8x7B** has about 47 billion parameters in total but uses about 13 billion per token, because each token visits 2 of 8 experts and the attention weights are shared — so "8x7B" is not 56B. **DeepSeek-V3** has 671 billion total and 37 billion active. Compute per token follows *active* parameters; memory follows *total*, because every expert must be resident when the next token might need any of them.

## Why It Pays Off
For a fixed compute budget, sparse models reach a given quality faster in training and run cheaper per token than a dense model of the same total size — roughly the quality of a much larger model for the FLOPs of a smaller one. That is why many frontier and open model families now use MoE layers.

## What It Costs
- **Load balancing** — left alone, the router collapses onto a few favorite experts and the rest starve. Training adds an auxiliary balancing loss (or bias-based balancing, as in DeepSeek-V3) and per-expert capacity limits, dropping or rerouting overflow tokens.
- **Memory and communication** — all experts must fit in memory, and when they're spread across GPUs (**expert parallelism**) every MoE layer needs an all-to-all exchange. At small batch sizes the savings shrink, since tokens scatter across experts and weight loads can't be amortized.
- **Fine-tuning** — sparse models have historically been touchier to fine-tune and quicker to overfit than dense ones.

## Experts Are Not Subject Specialists
The name invites a myth — one expert for medicine, another for code. Studies of trained routers mostly find specialization on **token-level and syntactic** patterns, such as punctuation or particular token types, rather than human-recognizable topics.

## The Decision Rule
Quote both numbers for any MoE model: active parameters predict speed and cost per token, total parameters predict the memory bill. MoE pays off in high-throughput serving that keeps every expert busy; for small or memory-constrained deployments, a dense model near the active size is often the simpler choice.`,
  },
];
