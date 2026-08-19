import type { TheoryTopic } from "./types";

export const ML_NLP_LLM_TOPICS: TheoryTopic[] = [
  {
    id: "text-representation",
    title: "From Bag of Words to Contextual Embeddings",
    oneLiner: "Every text representation scheme is defined by what the previous one threw away — and the modern answer is that a word's vector should depend on the sentence around it.",
    content: `Turning text into numbers is the oldest problem in NLP, and each generation of methods is best understood by what the generation before it destroyed.

## The Sparse Era: Bag of Words and TF-IDF
**Bag of words** represents a document as counts over the vocabulary — a vector as long as the vocabulary itself, almost entirely zeros, with word order destroyed outright, so "the dog bit the man" and "the man bit the dog" land on the same point. **TF-IDF** softens that by weighting each term by how often it appears in a document against how rare it is across the corpus — a word appearing everywhere carries no discriminating signal and is pushed toward zero, while a term concentrated in a few documents is amplified. It is worth recognizing and rarely worth defending — still sparse, still order-blind, firmly legacy.

## Dense Vectors and the Arithmetic That Made Them Famous
**word2vec** and **GloVe** learn **static embeddings**: a few hundred dense dimensions per word, fit from co-occurrence statistics on the premise that words sharing contexts should land near each other. The result supports real vector arithmetic — \`king - man + woman ≈ queen\` — which is the demo everyone remembers.

## Why "Bank" Is the Question Actually Being Asked
The distinction that gets scored is static versus contextual. A static embedding assigns exactly one vector per word type, so the river bank and the financial bank collapse into a single blurred point that averages both senses and faithfully represents neither. **Contextual embeddings** — the BERT-style kind — compute a fresh vector for every *occurrence* from the surrounding sentence, so the two banks land in different regions of the space. Polysemy, negation, and syntax become representable instead of averaged away.

## The Second Consequence: Words the Vocabulary Never Saw
Static embeddings also have no vector at all for an **out-of-vocabulary** word — not a poor vector, none — which covers misspellings, new product names, and ordinary morphological variants. **Subword tokenization** (**BPE**, **WordPiece**) fixes precisely this by splitting rare words into pieces drawn from a fixed subword inventory, leaving any string at all representable.

## The Decision Rule
Static vectors still earn their place when latency is tight and the vocabulary is closed; anything hinging on word sense or word order needs contextual ones — and answering "embeddings" without naming which kind concedes the point.`,
  },

  {
    id: "attention-mechanics",
    title: "Self-Attention Mechanics — Q, K, V",
    oneLiner: "Attention is three learned projections and one softmax — the interview lives in why the scores get divided by the square root of the key dimension.",
    content: `Everyone can say attention lets each position look at every other; what gets scored is the arithmetic underneath — three learned projections, one scaled dot product, one softmax.

## Query, Key, and Value Are Three Different Jobs
Each token embedding is multiplied by three learned matrices to produce a **query**, a **key**, and a **value**. The retrieval framing is exact — the query is what this position looks for, the key is what each position advertises, the value is what it contributes once its key matches. Scores are the dot product of one query against every key, a softmax converts them into weights, and the output is the weighted sum of values. The functional consequences belong with transformers-versus-RNNs; mechanics live here.

## Why Dividing by \`sqrt(d_k)\` Is Not Vague "Numerical Stability"
A dot product of \`d_k\`-dimensional queries and keys is a sum of \`d_k\` terms, so with roughly independent unit-variance components its **variance grows linearly with \`d_k\`** — at \`d_k\` of 64 the scores spread about eight times wider. Large logits push softmax into **saturation**: one weight approaches 1, the rest approach 0, and the gradient collapses toward zero, so learning stalls. Dividing by \`sqrt(d_k)\` renormalizes that variance back to about 1 and keeps softmax in its responsive range. The memorized "for stability" line is the symptom — the variance argument is the reason.

## One Head Can Only Point at One Place at a Time
A single softmax yields exactly one distribution over positions — one averaged mixture — so a head tracking the syntactic subject cannot also track a distant coreferent pronoun. **Multi-head attention** runs several attention operations in parallel across **lower-dimensional subspaces** of the model dimension, then concatenates them. Because the dimension is split rather than duplicated, total compute stays roughly flat. "It captures different relationships" is the consequence; the single-distribution limit is the mechanism.

## Masking Is the Encoder/Decoder Difference
Encoder self-attention is **bidirectional**; decoder self-attention is **causally masked**, future positions driven to negative infinity before the softmax; **cross-attention** takes queries from the decoder, keys and values from the encoder. That mask is the differentiator — bidirectional context for BERT-style classification and embeddings, autoregressive generation for GPT-style decoders — and every variant pays \`O(n^2)\` in sequence length.

## One Caveat Worth Naming
Attention weights are not explanations — high weight marks where information was mixed in from, not what the prediction depended on.`,
  },

  {
    id: "transfer-learning",
    title: "Transfer Learning & Fine-Tuning",
    oneLiner: "Pretraining moves the expensive part of learning off the small dataset — the real question is not what to freeze but how the freezing decision gets made.",
    content: `**Transfer learning** reuses a model pretrained on a large general corpus as the starting point for a small, specific task — the representations are already paid for, leaving only the adaptation.

## Feature Extraction Versus Fine-Tuning
**Feature extraction** freezes the pretrained backbone and trains only a fresh head on top, treating the network as a fixed featurizer. **Fine-tuning** unfreezes some or all of those weights and keeps training them on the target data. The choice is not stylistic — early layers hold generic structure (edges and textures in vision, morphology and syntax in language) that transfers almost everywhere, while later layers hold source-task specifics that may not apply.

## The Two Axes That Decide How Much to Freeze
How much to unfreeze is a function of **domain similarity** crossed with **target dataset size** — naming both axes separates a scoring answer from a shrug. Small and similar: freeze nearly everything and train the head, since there is not enough data to update millions of parameters without memorizing. Large and similar: fine-tune most layers, because the data supports it. Small and dissimilar: the hardest cell — freeze the early layers, retrain the later ones, and expect regularization to do heavy lifting. Large and dissimilar: fine-tune deeply, or ask whether pretraining buys anything at all.

## The 1,000 Labelled Tweets, Worked
Sentiment classification on tweets with 1,000 labelled examples is the canonical scenario, and training a transformer from scratch overfits within a couple of epochs. The right move: take a pretrained language model, attach a small classification head, train that head alone with the backbone frozen, then apply **gradual unfreezing** — releasing the top block or two with a **much smaller learning rate** on pretrained weights than on the new head, so prior knowledge is nudged rather than overwritten — and stop when held-out loss turns upward. The domain is ordinary English and the data is tiny, so most of the network stays frozen.

## The Decision Rule
Too aggressive an update causes **catastrophic forgetting**, where pretrained knowledge is destroyed and the result lands below the frozen baseline; **data augmentation** buys headroom only when label-preserving and distribution-realistic — horizontally flipping digits or shuffling words invents inputs no test set contains. Default to freezing more than feels necessary and unfreeze upward while validation improves: an under-adapted backbone is recoverable in one more run, a forgotten one is not.`,
  },

  {
    id: "rag-vs-finetuning",
    title: "RAG vs. Fine-Tuning vs. Long Context",
    oneLiner: "Retrieval changes what a model knows, fine-tuning changes how it behaves, and a long window changes neither — these are three levers, not three names for one.",
    content: `Retrieval changes what a model knows; fine-tuning changes how it behaves; a long window changes neither — collapsing them into one question is the fastest way to lose the room.

## Knowledge Belongs in Retrieval, Behavior Belongs in Weights
**RAG** — retrieval-augmented generation — answers the knowledge case: facts that change often, anything demanding citations, corpora far too large to train on. **Fine-tuning** answers the behavior case: house style, output formats, task-specific patterns, domain vocabulary, and cost or latency reduction by making a smaller model competent enough to replace a larger one.

## The Wrong Answer That Deserves a Name
"Fine-tune it so the model knows our documents" is the most common miss in the topic. Fine-tuning teaches *form* far more reliably than *facts* — a few thousand examples reshape tone and structure readily, but individual facts land unevenly, cannot be cited or revoked, and demand another training run to fix — with **catastrophic forgetting** as the standing risk.

## Long Context Is the Third Option, Not a Footnote
Placing documents directly in a large window is competitive for small, stable corpora — treating this as a three-way rather than a two-way separates a current answer from a 2023 one. The costs are concrete: attention is \`O(n^2)\` in sequence length, quality sags for material buried mid-prompt (**lost-in-the-middle**), and every token is paid for on every call.

| | RAG | Fine-tuning | Long context |
|---|---|---|---|
| Best for | Facts that change | Style and format | Small stable corpora |
| Update cost | Reindex one document | Retrain | None |
| Citations | Natural | No | Weak |
| Per-call cost | Moderate | Lowest | Highest |

## The Pipeline and the Hallucination Question
End to end, RAG is: chunk the corpus, embed the chunks, index the vectors, retrieve \`top-k\` for the query, place them in the prompt, generate. **LoRA** and other **PEFT** methods train small low-rank adapters over a frozen base, making the fine-tuning half cheap. **Hallucination** is not eliminable — anything that produces fluent text can produce fluent wrong text — but it is boundable through retrieval grounding, required citations, constrained output, tool calls for facts, and an explicit path to abstain.

## The Decision Rule
Production systems generally run both: retrieval for what is true today, a light fine-tune for how the answer should look.`,
  },

  {
    id: "evaluating-llm-outputs",
    title: "Evaluating LLM and RAG Output",
    oneLiner: "Open-ended generation broke the old overlap metrics — the answer that scores is decomposing the system and measuring retrieval and generation apart.",
    content: `Evaluation is the LLM topic that has crossed into general interviews, for the plain reason that it is the part an interviewer can actually score.

## Why BLEU and ROUGE Stopped Being Enough
**BLEU** and **ROUGE** measure surface **n-gram overlap** against a reference string, and that correlates poorly with quality on open-ended generation. A correct answer phrased differently scores badly; a fluent, wrong answer recycling the reference's vocabulary scores well. Both stay reasonable for tightly-referenced translation and summarization — and misleading nearly everywhere else.

## The RAG Triad and the Retrieval Numbers Underneath
The standard decomposition is three questions — **faithfulness**, whether the answer is grounded in retrieved context rather than invented; **answer relevance**, whether it addresses the question asked; **context relevance**, whether the retrieved material was worth retrieving. Underneath sits classic information retrieval: **Recall@k** for whether the right document was fetched, **MRR** for how high the first relevant hit ranked, **nDCG** for graded relevance across the ranking.

## Decompose the Failure Before Scoring the System
This is the answer that scores — a single end-to-end number reports that something broke and nothing about where. Evaluate **retrieval in isolation** against labelled relevant documents, evaluate **generation in isolation** on hand-verified known-good context, then read the two together to localize the break. Strong retrieval with weak generation points at the prompt, the model, or context handling. Weak retrieval points at chunking, the embedding model, \`top-k\`, or a missing reranker — and no amount of prompt engineering repairs that half.

## LLM-As-Judge, With the Biases Said Out Loud
Using a model to grade outputs scales far past human review — and the caveats have to be named: **position bias** toward whichever answer came first, **verbosity bias** toward longer answers, **self-preference** for text resembling the judge's own generations, and the requirement that the judge be at least as capable as the model under evaluation. Randomized ordering, explicit rubrics, pairwise comparison instead of absolute scores, and periodic calibration against human labels keep it honest.

## What Turns This Into Engineering
A **golden set** — a frozen collection of questions with verified answers and known relevant documents, rerun on every prompt, chunking, or model change — is what makes evaluation regression testing rather than a vibe check. Without one, the only available report is that the new version feels better, which is precisely the claim nobody can act on.`,
  },
];
