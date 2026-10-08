import type { TheoryTopic } from "./types";

export const AI_LLM_INFERENCE_TOPICS: TheoryTopic[] = [
  {
    id: "decoding-and-sampling",
    title: "Decoding — Greedy, Beam Search, Temperature & Top-p",
    oneLiner: "A model outputs probabilities, not text — the decoding strategy that picks each token decides whether output is repetitive, creative, reproducible or schema-valid.",
    content: `At every step an LLM produces **logits** over its whole vocabulary. How those become text — and therefore much of the output's character — is decided outside the model, by the **decoding strategy**.

## Search: Greedy and Beam
**Greedy decoding** takes the single most likely token each step: fast and deterministic, but prone to dull, looping text. **Beam search** keeps the \`k\` most probable partial sequences and returns the best finished one, which suits tasks with a narrow correct answer such as translation. For open-ended writing it backfires — maximizing likelihood yields generic, repetitive text, because human writing is not the most probable sequence. Holtzman et al. named this **neural text degeneration**.

## Sampling and Its Knobs
Sampling draws each token from the distribution, after reshaping it:
- **Temperature** divides the logits before the softmax: below 1 sharpens toward the top choice, above 1 flattens toward randomness, and 0 means greedy.
- **Top-k** samples only from the \`k\` likeliest tokens — a fixed cutoff that's too tight when many tokens fit and too loose when one dominates.
- **Top-p** (nucleus) samples from the smallest set whose probabilities sum to \`p\`, say 0.9, so the pool adapts to the model's confidence.
- **Min-p** keeps tokens with at least a set fraction of the top token's probability, and holds up better at high temperatures.

Repetition and frequency penalties down-weight tokens already used. The knobs interact, so tune one at a time.

## Constrained Decoding
When output must parse — JSON matching a schema, a SQL grammar, one label from a fixed set — **constrained decoding** masks every token that would make the output invalid at each step, so the result is valid by construction instead of by retry. API structured-output modes and libraries like Outlines work this way. A schema can still push the model away from what it would naturally write, so field order and descriptions matter.

## Temperature 0 Isn't Fully Deterministic
Floating-point results depend on batch composition and kernel choice, so the same prompt can produce different text across runs, especially on shared serving infrastructure. Reproducible tests need pinned model versions, seeds where supported, and assertions on meaning rather than exact strings.

## The Decision Rule
Low temperature or greedy for extraction, classification and code; moderate temperature with top-p for writing and brainstorming; constrained decoding whenever a program will parse the output; and several samples when a verifier or a vote can pick the best one.`,
  },

  {
    id: "kv-cache",
    title: "The KV Cache — Why Generation Is Memory-Bound",
    oneLiner: "Caching keys and values spares generation from recomputing the prefix every step but makes it memory-bandwidth-bound — why prefill and decode behave so differently.",
    content: `Generating text one token at a time would be absurdly wasteful if attention were recomputed over the entire sequence at every step. The **KV cache** avoids that, and in doing so it defines how LLM serving behaves.

## What Gets Cached and Why
In causal attention, a token's key and value vectors never change once computed — later tokens can't influence earlier ones. So the server stores them, per layer and head, and each new token computes only its own query, key and value, then attends over the cache. Each step costs work proportional to the current length rather than a full recomputation of the prefix.

## Two Phases With Opposite Profiles
- **Prefill** processes the whole prompt in one parallel pass and fills the cache. Large matrix multiplies make it **compute-bound**, and it sets **time to first token** (TTFT).
- **Decode** produces one token per step. Each step reads every weight and the whole cache from GPU memory to do little arithmetic, making it **memory-bandwidth-bound**; it sets the **time per output token**, and so the streaming speed.

That asymmetry explains why long prompts mostly hurt TTFT, long outputs mostly hurt total latency, and batching many requests is the main lever on decode throughput: one pass over the weights serves many sequences at once.

## The Cache Is Big
Its size per token is \`2 × layers × KV heads × head dim × bytes\` (the 2 is keys plus values). For Llama 2 7B in FP16 — 32 layers, 32 heads of dimension 128 — that's about **0.5 MB per token**, or 2 GB for one 4,096-token sequence. Multiply by concurrent users and the cache, not the weights, becomes what limits the batch size.

## Shrinking It
- **Multi-query and grouped-query attention** (MQA, GQA) let many query heads share fewer key-value heads; Llama 3 8B uses 8 KV heads for 32 query heads, a quarter of the cache, with little quality loss.
- **KV-cache quantization** stores keys and values in 8 bits or fewer.
- **Sliding-window attention** caps how far back some layers look, bounding their cache.
- **Prefix caching** reuses the cache of a shared prompt prefix — a long system prompt or document — across requests; providers' prompt-caching discounts are this mechanism.

## The Decision Rule
Separate the phases in any serving question — optimize prefill for time to first token and decode for throughput — and do the KV-cache arithmetic early, because it decides how many concurrent long-context users one GPU can actually hold.`,
  },

  {
    id: "continuous-batching-paged-attention",
    title: "Serving Throughput — Continuous Batching & PagedAttention",
    oneLiner: "LLM servers win throughput by keeping the GPU full: schedule requests token by token, not batch by batch, and allocate the KV cache in pages, not one block per request.",
    content: `Because decoding is memory-bound, a GPU serving one request at a time spends most of its time waiting on memory. Serving engines exist to keep many requests in flight, and two ideas from 2022–2023 did most of the work.

## Static Batching Wastes the GPU
Classic batching groups requests and runs them together until **all** of them finish. LLM output lengths vary wildly, so one 2,000-token answer keeps the batch running for 2,000 steps while slots freed by short answers sit idle and new requests wait.

## Continuous Batching
**Iteration-level scheduling**, introduced by the Orca system and now standard, makes the batching decision at **every decoding step**: finished sequences leave immediately and waiting requests join on the next step. The GPU stays full, queueing delay drops, and throughput on real traffic rises severalfold over static batching. **Chunked prefill** refines it, splitting long prompts into pieces interleaved with ongoing decodes so one huge prompt doesn't stall everyone else's stream.

## PagedAttention
The KV cache was the next bottleneck. Earlier servers reserved one **contiguous** region per request, sized for the longest possible output, and the vLLM authors measured 60–80% of KV memory lost to that over-reservation and fragmentation. **PagedAttention** borrows virtual memory from operating systems: the cache lives in fixed-size **blocks** allocated on demand, and a block table maps each sequence's logical positions to physical blocks. Waste fell under 4%, more sequences fit in the same memory, and vLLM reported 2–4× the throughput of prior systems at the same latency. Pages also make **sharing** cheap — parallel samples, and requests with a common prefix, point at the same physical blocks with copy-on-write.

## Throughput Versus Latency
Larger batches raise total tokens per second but slow each individual stream, and admitting too many requests forces **preemption** when memory runs out mid-generation. So serving is tuned to latency targets — time to first token and inter-token latency at a percentile — not raw throughput. Large deployments also **disaggregate** prefill and decode onto separate GPU pools, since the two phases want different trade-offs.

## The Decision Rule
Don't hand-roll LLM serving: use an engine with continuous batching and paged KV memory, such as vLLM, SGLang or TensorRT-LLM, then load-test with realistic prompt and output lengths and tune batch limits to your latency targets rather than peak throughput.`,
  },

  {
    id: "speculative-decoding-flashattention",
    title: "Speculative Decoding & FlashAttention — Faster, Same Output",
    oneLiner: "Two big LLM speedups change no outputs: a small model drafts tokens the big one verifies in one pass, and exact attention runs without ever storing the full matrix.",
    content: `Most inference speedups give something up — a smaller model, fewer bits, a shorter context. These two don't: both produce **exactly** what the unoptimized model would, which is why serving stacks turn them on by default.

## Speculative Decoding: Draft, Then Verify
Decode is memory-bound, so checking several tokens in one forward pass costs about the same as generating one. Speculative decoding exploits that. A small, fast **draft model** proposes the next few tokens; the large **target model** scores them all in a single parallel pass; the agreed prefix is kept, and the target supplies the correct token where the draft first went wrong. A **modified rejection-sampling** rule accepts each draft token with probability \`min(1, p_target / p_draft)\` and resamples on rejection, which guarantees the output follows the target model's distribution exactly, not approximately.

## When It Pays Off
The speedup tracks the **acceptance rate** — how often the draft guesses what the target would have produced. On predictable text such as code, structured output and boilerplate, most drafts are accepted, and the original papers reported 2–3× faster decoding. On creative, high-temperature text more drafts are rejected and the extra work can cancel the gain. Variants drop the separate draft model: **Medusa** and **EAGLE** add light prediction heads to the target itself, and **prompt lookup** drafts by copying spans from the input, which works very well for edits and retrieval-heavy answers.

## FlashAttention: Exact Attention, Less Memory Traffic
Standard attention writes the full \`n × n\` score matrix to GPU memory, reads it back for the softmax, and reads it again to weight the values. At long sequence lengths that memory traffic, not the arithmetic, dominates runtime. **FlashAttention** computes attention in **tiles** small enough for the GPU's fast on-chip memory, using an online softmax that rescales running sums so the full matrix never has to exist, and recomputes tiles in the backward pass instead of storing them. Same result, memory that grows **linearly** with sequence length instead of quadratically, and an attention step several times faster.

## The Lesson Behind Both
On modern accelerators, an operation's cost is often set by **bytes moved**, not FLOPs. The same reasoning explains why decode is memory-bound, why quantization speeds it up, and why fused kernels matter — and FlashAttention's removal of the attention memory wall is a large part of why long-context training became practical.

## The Decision Rule
Treat both as defaults to confirm rather than features to build: check that your engine uses fused attention kernels, and enable speculative decoding where outputs are predictable and latency matters, measuring the acceptance rate on real traffic.`,
  },
];
