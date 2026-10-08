import type { TheoryTopic } from "./types";

export const AI_LLM_TRAINING_TOPICS: TheoryTopic[] = [
  {
    id: "pretraining-scaling-laws",
    title: "Pretraining & Scaling Laws — Chinchilla and Beyond",
    oneLiner: "Loss falls as a smooth power law in parameters, data and compute — and the fight over splitting a budget between model size and tokens reshaped how labs train.",
    content: `**Pretraining** is self-supervised next-token prediction over trillions of tokens of web text, code, books and papers. No labels are needed — the text supervises itself — and grammar, facts and reasoning patterns are learned as by-products of predicting what comes next.

## The Compute Arithmetic
Training compute is approximately \`C ≈ 6 · N · D\` FLOPs for \`N\` parameters and \`D\` tokens — about 2 FLOPs per parameter per token for the forward pass and 4 for the backward. That one formula answers most back-of-envelope questions: what a run costs, how long it takes on a given cluster, and what doubling the data changes.

## Scaling Laws
Kaplan et al. (2020) showed that test loss falls as a **smooth power law** in parameters, data and compute across many orders of magnitude, which made a large run's outcome predictable from small ones. Their fits favored putting most new compute into **bigger models**, and GPT-3 — 175B parameters trained on about 300B tokens — reflected that.

## The Chinchilla Correction
Hoffmann et al. (2022) redid the analysis with learning-rate schedules matched to each run's length and reached a different split: for compute-optimal training, parameters and tokens should **grow in equal proportion**, at roughly **20 tokens per parameter**. Their 70B Chinchilla, trained on 1.4T tokens, beat the 280B Gopher on the same compute budget. The big models of the day had been badly *undertrained*.

## Over-Training on Purpose
"Compute-optimal" minimizes **training** cost only. A model that will serve heavy traffic should be smaller than Chinchilla-optimal and trained far longer, because inference cost scales with parameter count. Llama 3 8B saw over 15T tokens — nearly 2,000 per parameter — and was still improving. Data is now often the binding constraint: deduplication, quality filtering and the mixture of sources move results as much as size does.

## What Scaling Laws Don't Promise
They predict **loss**, not specific capabilities. Some abilities appear to switch on suddenly at scale, but part of that "emergence" is an artifact of all-or-nothing metrics — scored continuously, the same ability often improves smoothly. And a low-loss pretrained model is a document completer, not an assistant; that takes post-training.

## The Decision Rule
Size a model for its whole lifetime, not its training run: if it will be served heavily, train a smaller model on more tokens than the compute-optimal ratio, and invest in data quality before parameter count.`,
  },

  {
    id: "supervised-fine-tuning",
    title: "From Base Model to Assistant — Supervised Fine-Tuning",
    oneLiner: "A pretrained model only continues documents; fine-tuning on curated prompt-response pairs makes it an assistant — and a small, clean dataset does most of the work.",
    content: `Ask a **base model** "What is the capital of France?" and it may continue with three more quiz questions — it learned to continue documents, and quiz pages look like that. **Supervised fine-tuning** (SFT), or instruction tuning, is the first post-training step that turns it into something that answers.

## What SFT Actually Trains
The data is **prompt-response demonstrations**, written by people or generated and filtered, rendered into a **chat template** whose special tokens mark system, user and assistant turns. The objective is the same next-token loss as pretraining with one change: it is **masked to the response tokens**, so the model learns to produce answers rather than to imitate users. Knowledge comes overwhelmingly from pretraining; SFT mostly teaches format, register and when to stop.

## Quality Beats Quantity
LIMA fine-tuned a 65B LLaMA on just **1,000** curated examples and held up surprisingly well against far more heavily tuned assistants, prompting the "superficial alignment hypothesis": tuning mostly selects which existing behaviors to use. A few thousand diverse, correct, consistently formatted examples usually beat a large noisy set, because duplicated, contradictory or sloppy responses teach exactly those traits.

## Tool Calling Is Taught the Same Way
Native function calling is a trained behavior, not an emergent one. Models learn it from demonstrations that pair a request and a set of tool schemas with the correct structured call, the tool's result, and the final answer — datasets such as Gorilla, ToolLLM and APIGen exist for exactly this, and the **BFCL** leaderboard measures the outcome. Fine-tuning a small model on your own tools' calling patterns is a common way to get dependable tool use cheaply.

## Where SFT Falls Short
Imitation has a ceiling: the model can only be as good as its demonstrations, and it learns nothing about which of two plausible answers is *better*. It can also teach **confident fabrication** — demonstrations that state facts the model doesn't actually know train it to answer confidently whether or not it knows. Preference optimization and RL address both gaps.

## The Mistakes That Show Up in Practice
- Computing loss on prompt tokens, or training with a chat template that differs from the one used at inference.
- Too many epochs on a small set, so the model memorizes phrasing and loses general ability.
- Evaluating only on held-out examples like the training data, instead of on the broad capabilities you need to keep.

## The Decision Rule
Spend the effort on the dataset, not the hyperparameters: a small, diverse, verified set in the exact inference format, loss on responses only, and an eval that checks what you might break as well as what you're teaching.`,
  },

  {
    id: "rlhf-vs-dpo",
    title: "RLHF vs. DPO — Learning From Preferences",
    oneLiner: "Preference tuning teaches which of two answers is better — RLHF via a reward model and reinforcement learning, DPO via a single classification-style loss.",
    content: `SFT shows a model good answers; it never says which of two plausible answers is *better*. Preference optimization adds that signal, and it's a large part of what made assistants more helpful and less harmful.

## The Data: Comparisons, Not Scores
People judge "which of these two is better" far more consistently than they assign absolute scores, so preference data comes as **pairs**: a prompt, a chosen response and a rejected one. RLHF and DPO consume the same pairs and differ only in what they do with them.

## RLHF: Reward Model, Then RL
Classic **RLHF**, as in InstructGPT, has two stages. First, train a **reward model** — usually the LLM with a scalar head — to score chosen above rejected responses. Then optimize the policy with **PPO** to maximize that reward minus a **KL penalty** that keeps it near the SFT model. The penalty is essential: the reward model is an imperfect proxy, and a policy free to maximize it finds **reward hacking** exploits — padding, sycophancy, confident tone — that score well and read badly. The payoff was real: labelers preferred the 1.3B InstructGPT over the 175B GPT-3.

## DPO: Skip the Reward Model
**Direct Preference Optimization** showed that the same KL-constrained objective has a closed-form optimal policy, so the reward model can be folded into the policy itself. What remains is one supervised loss: raise the likelihood of the chosen response relative to the rejected one, both measured against a frozen reference model, with \`β\` controlling how far the policy may drift. No reward model, no sampling during training, no RL instability — which made DPO and its variants a default in open-model post-training.

| | RLHF (PPO) | DPO |
|---|---|---|
| Models held in memory | Policy, reference, reward, value | Policy, reference |
| Training data | Fresh samples, scored online | Fixed preference pairs |
| Stability and cost | Finicky, expensive | Simple, cheap |
| Ceiling | Higher when tuned well | Bounded by the dataset |

## The Real Tradeoff
DPO is **offline**: it learns only from the pairs it was given and can't explore regions the data doesn't cover. Online RL keeps sampling from the current policy and scoring the results, which tends to win at the frontier, at much higher engineering cost. Many pipelines combine them, or rerun DPO on fresh samples to recover some of the online benefit.

## The Decision Rule
Default to DPO when you have good preference data and little RL infrastructure; move to online RL with a reward model to push past the dataset. Either way, watch for reward hacking by reading samples, not just the reward curve.`,
  },

  {
    id: "reasoning-models-rlvr",
    title: "Reasoning Models — RL With Verifiable Rewards",
    oneLiner: "Reasoning models are trained with RL on problems a program can grade, and learn to think longer before answering — trading latency and cost for accuracy.",
    content: `Since 2024 a second scaling axis has joined model size: **thinking longer at inference time**. OpenAI's o1 showed accuracy on math and code rising with the amount of test-time reasoning, and DeepSeek-R1 published a recipe in the open.

## Rewards a Program Can Compute
RLHF depends on a learned reward model, which is noisy and hackable. **RL with verifiable rewards** (RLVR) avoids it wherever correctness can be **checked automatically**: math with a known final answer, code that must pass tests, puzzles with a verifier. The reward is simply right or wrong, plus a small format reward for putting reasoning and answer where they belong.

## GRPO: RL Without a Critic
DeepSeek's **GRPO** samples a **group** of answers per prompt, scores them, and uses each answer's reward relative to the group average as its advantage. Dropping PPO's separate value network cuts memory and compute substantially; answers that beat their siblings are reinforced and worse ones discouraged.

## What Emerged in DeepSeek-R1
**R1-Zero** applied this RL directly to a base model with no supervised reasoning data, and long chains of thought **emerged on their own**: responses lengthened over training, and the model began re-checking work, backtracking and trying alternatives — the paper's "aha moment." Its outputs were hard to read and mixed languages, so the released **R1** added a small cold-start set of curated reasoning examples before RL and further tuning after. R1's traces were then **distilled** into small Qwen and Llama models with plain SFT, which beat much larger non-reasoning models on math benchmarks — and did better than running the same RL on the small models directly.

## Test-Time Compute Is a Dial
Reasoning models expose a budget — effort levels or thinking-token limits — that trades **latency and cost** for accuracy. Sampling many answers and taking a majority vote or a verifier's pick is the parallel way to spend the same budget. Either way the cost is real: a hard query can burn thousands of reasoning tokens before the first visible word.

## Where It Helps and Where It Doesn't
Gains are largest on multi-step, checkable work — math, competitive programming, planning, debugging. On lookups, extraction or style tasks, extra thinking adds latency for little benefit, and models can **overthink** easy questions. The visible chain of thought is also not a faithful record: models often omit hints that actually changed their answer.

## The Decision Rule
Route by task — a reasoning model with a sensible budget for hard, verifiable, multi-step problems, a fast standard model for routine calls — and treat displayed reasoning as a helpful summary, not an audit log.`,
  },
];
