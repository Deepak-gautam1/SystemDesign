import type { TheoryTopic } from "./types";

export const AI_LLM_ADAPTATION_TOPICS: TheoryTopic[] = [
  {
    id: "lora-and-qlora",
    title: "LoRA & QLoRA — Fine-Tuning a Sliver of the Model",
    oneLiner: "LoRA freezes the base weights and learns a small low-rank update beside them; QLoRA stores the frozen base in 4 bits — together they made big fine-tunes a one-GPU job.",
    content: `Full fine-tuning updates every weight, so it needs gradients and optimizer state for every weight too — with Adam, several times the memory of the model itself. **Parameter-efficient fine-tuning** (PEFT) trains a small set of new parameters instead, and LoRA is the method that won.

## The Low-Rank Bet
LoRA assumes the *change* a fine-tune needs has low intrinsic rank. Rather than a full update \`ΔW\` for a \`d × d\` weight matrix, it learns two thin matrices — \`B\` (\`d × r\`) and \`A\` (\`r × d\`), with rank \`r\` usually 8 to 64 — and computes \`W·x + B·A·x\`. At \`d\` = 4,096 and \`r\` = 16 that's about 131K trainable parameters instead of 16.8M for the matrix, under 1%. \`B\` starts at zero, so training begins exactly at the pretrained model, and a scale factor (\`alpha / r\`) sets the update's strength.

## Why It Caught On
- **Memory** — gradients and optimizer state exist only for the adapters. On GPT-3 175B, the LoRA paper reports 10,000× fewer trainable parameters and 3× less GPU memory than full fine-tuning.
- **No inference penalty** — \`B·A\` can be merged into \`W\` after training, so the served model has the original shape and speed.
- **Swappable adapters** — one base model can serve many tasks, each adapter a few megabytes, chosen per request.

## QLoRA: Quantize the Frozen Part
Frozen weights don't need full precision. **QLoRA** stores the base model in 4-bit **NormalFloat (NF4)** — a data type matched to the bell-shaped distribution of trained weights — dequantizes on the fly for each matrix multiply, and trains 16-bit LoRA adapters on top. With **double quantization** (quantizing the quantization constants) and **paged optimizers** that spill to CPU memory during spikes, it fine-tuned a 65B model on a single 48 GB GPU while matching 16-bit fine-tuning quality.

## The Honest Tradeoffs
LoRA reliably matches full fine-tuning for **style, format and narrow tasks**, but falls behind when the goal is substantial new knowledge or capability: "LoRA Learns Less and Forgets Less" found it trailing full fine-tuning on code and math while preserving more of the base model's general ability. Adapting all linear layers, not just the attention projections, usually matters more than the choice of rank.

## The Decision Rule
Start with LoRA on all linear layers — QLoRA when memory is tight — and move to full fine-tuning only when evals show the adapter can't reach the target and the compute is there. Whatever the method, build the eval set before the first training run.`,
  },

  {
    id: "quantization",
    title: "Quantization — Trading Bits for Memory",
    oneLiner: "Storing weights in 8 or 4 bits instead of 16 cuts memory two- to fourfold and speeds up generation — the craft is in handling the outliers naive rounding destroys.",
    content: `An LLM's memory footprint is mostly its weights, and its generation speed is mostly how fast those weights stream out of memory. **Quantization** shrinks both by storing numbers in fewer bits.

## The Memory Arithmetic
Bytes per parameter set the floor: a 7B model needs about 28 GB in FP32, 14 GB in BF16, 7 GB in INT8 and roughly 3.5 GB at 4 bits — the difference between a datacenter GPU and a laptop. That arithmetic answers most "can we run it here?" questions, as long as you leave headroom for the KV cache and activations.

## How It Works
Quantizing maps real values onto a small integer grid with a **scale**: store \`round(w / scale)\`, recover \`w ≈ q · scale\`. One scale per tensor is crude; per-channel or **per-group** scales — say one per 128 weights — follow local ranges far better for a small storage cost. **Weight-only** schemes keep activations in 16-bit and dequantize on the fly, which suits memory-bound decoding. Quantizing activations too speeds up compute-bound work as well, but is harder to do without losing quality.

## Outliers Are the Whole Problem
Rounding works until a few values dwarf the rest. LLMs develop **outlier features** — a few activation dimensions with huge magnitudes, which LLM.int8() saw emerge around 6.7B parameters — and one outlier stretches the scale until everything else rounds to zero. The methods that work are mostly outlier strategies: **LLM.int8()** keeps outlier dimensions in 16-bit; **GPTQ** quantizes weights column by column and uses approximate second-order information to compensate each rounding error in the weights not yet quantized; **AWQ** protects the small fraction of weights that matter most to activations by rescaling them before quantizing.

## Post-Training Versus Quantization-Aware
**Post-training quantization** — GPTQ, AWQ, and the GGUF formats used by llama.cpp — needs only a small calibration set and minutes to hours, and is the default for serving open models. **Quantization-aware training** simulates low precision during training so the model learns to tolerate it; it holds quality at very low bit widths but costs a training run.

## Where Quality Goes
8-bit is close to lossless for most models; 4-bit with a good method usually costs a little; below that, degradation becomes clear. Losses appear first in **long reasoning, math and code**, and in smaller models with less redundancy — and perplexity alone can hide them.

## The Decision Rule
Choose the bit width from the memory budget, then evaluate the quantized model on your own tasks, not perplexity alone. For a fixed memory budget, a larger model at 4-bit often beats a smaller one at 16-bit.`,
  },

  {
    id: "knowledge-distillation",
    title: "Knowledge Distillation — Teaching a Smaller Model",
    oneLiner: "A small student is trained on a large teacher's outputs instead of raw labels — the teacher's full distribution carries far more signal than one right answer.",
    content: `A big model is often more capable than you can afford to serve. **Knowledge distillation** moves much of that capability into a smaller, faster **student** by training it on what a **teacher** model outputs.

## Why Soft Targets Teach More
Hinton, Vinyals and Dean framed it in 2015: a one-hot label says only "this is a 7"; the teacher's probabilities say "a 7, a bit like a 1, nothing like a 4." That similarity structure — **dark knowledge** — is information the hard label discards. The student is trained to match the teacher's distribution, usually with a **temperature** above 1 applied to both softmaxes to expose the small probabilities, blended with ordinary loss on the true labels. DistilBERT is the classic result: 40% smaller and 60% faster than BERT while keeping 97% of its language-understanding performance.

## Three Strengths of LLM Distillation
- **Logit distillation** matches the teacher's full next-token distribution at every position — the richest signal, but it requires the teacher's logits and a shared tokenizer.
- **Sequence-level distillation** simply fine-tunes the student on text the teacher generated. It works through an API, which is why it dominates in practice.
- **Reasoning distillation** fine-tunes on the teacher's worked solutions; DeepSeek-R1's distilled Qwen and Llama models gained more from imitating R1's traces than from running RL themselves.

## What the Student Can and Can't Inherit
A student imitates the teacher's *outputs* on the inputs it was shown. It inherits errors and biases along with skills, generalizes poorly to inputs far from the distillation prompts, and can learn to *sound* like the teacher — fluent, confident — without matching its accuracy. Prompt diversity matters as much as teacher quality, and filtering teacher outputs for correctness, keeping only solutions that pass tests or match known answers, markedly improves results.

## The Practical and Legal Fine Print
This is how many small instruct models and task-specific production models are built: a frontier model labels data once, a cheap model serves it indefinitely. Check the teacher's terms first — several commercial providers prohibit using their outputs to train competing models.

## The Decision Rule
When a large model solves the task but costs too much to serve, distill: generate a broad, filtered dataset with it, fine-tune a small model on that, and evaluate the student on held-out real traffic rather than on more teacher outputs.`,
  },
];
