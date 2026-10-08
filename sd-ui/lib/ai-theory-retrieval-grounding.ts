import type { TheoryTopic } from "./types";

export const AI_RETRIEVAL_GROUNDING_TOPICS: TheoryTopic[] = [
  {
    id: "embedding-models",
    title: "Embedding Models — Bi-Encoders vs. Cross-Encoders",
    oneLiner: "Retrieval quality is set by the embedding model before any vector database is involved — and encoding query and document apart or together trades speed for accuracy.",
    content: `Every semantic search system rests on an **embedding model** that maps text to vectors so that similar meanings land close together. How that model was built and trained decides what "similar" means.

## Bi-Encoders: Fast Because They're Independent
A **bi-encoder** embeds the query and each document **separately**, and relevance is the similarity of the two vectors. Document vectors are computed once, offline, and searched with an approximate nearest-neighbor index, so retrieval over millions of documents takes milliseconds. The price: query and document never interact inside the model, so subtleties — negation, a specific constraint, who did what to whom — get compressed away.

## Cross-Encoders: Accurate Because They're Joint
A **cross-encoder** reads query and document **together** in one forward pass and outputs a relevance score, with full attention between every query token and every document token. It is far more accurate and far too slow to run against a whole corpus, so it serves as a **reranker** over the top 50–100 bi-encoder candidates. **Late-interaction** models such as ColBERT sit between the two, keeping one vector per token and matching query tokens to document tokens at search time.

## How Embedders Are Trained
Modern embedding models are trained **contrastively**: pull a query and its matching passage together and push other passages away, typically with an InfoNCE loss where the other passages in the batch act as **in-batch negatives**. Bigger batches and **hard negatives** — passages that look relevant but aren't — teach the finest distinctions. This is also why embeddings capture *topical* similarity better than *answer-ness*: two passages on the same subject sit close even when only one answers the question.

## Choosing and Using One
- **Benchmarks** like MTEB rank models across many tasks, but general leaderboard position is a weak predictor for a specific domain — run a small retrieval eval on your own queries.
- **Similarity** should match training; most models expect cosine, and on normalized vectors cosine and dot product agree.
- **Dimensions** cost storage and search time; Matryoshka-trained models can be truncated with modest quality loss.
- **Prefixes** — many models expect markers like "query:" and "passage:", and quality drops without them.
- **Model changes** mean re-indexing: vectors from different models, or versions, are not comparable.

## The Decision Rule
Retrieve wide with a bi-encoder and rerank narrow with a cross-encoder. Pick the embedder by a retrieval eval on your own data, and fine-tune it on in-domain pairs with hard negatives when off-the-shelf recall falls short.`,
  },

  {
    id: "vector-search-ann",
    title: "Vector Search — HNSW, IVF & Product Quantization",
    oneLiner: "Exact nearest-neighbor search doesn't scale, so vector indexes trade a little recall for orders-of-magnitude speed — knowing which knob trades what is the skill.",
    content: `Finding a query's nearest vectors exactly means comparing it with every stored vector — \`O(N · d)\` per query, fine at 100K vectors and hopeless at a billion. **Approximate nearest-neighbor** (ANN) indexes accept a little lost **recall**, missing some true neighbors, in exchange for search that's orders of magnitude faster.

## HNSW: A Navigable Graph
**Hierarchical Navigable Small World** indexes link each vector to its near neighbors and stack sparser layers on top as express lanes. A search enters at the top, walks greedily toward the query, drops a layer, and repeats down to the dense bottom layer. Three knobs define it: \`M\`, links per node (memory and recall); \`efConstruction\`, build-time thoroughness; and \`efSearch\`, candidates kept per query — the main **recall-versus-latency dial**, adjustable per request. HNSW gives excellent recall at low latency and takes inserts well, but it's memory-hungry, since vectors and graph both live in RAM, and deletions are awkward.

## IVF: Cluster, Then Search a Few Clusters
An **inverted-file** index uses k-means to split vectors into many clusters and, at query time, scans only the \`nprobe\` clusters whose centroids are closest; raising \`nprobe\` buys recall with latency. IVF is cheaper to build and lighter on memory than HNSW, but recall suffers when true neighbors sit just across a cluster boundary, and the clusters go stale as data drifts.

## Product Quantization: Compress the Vectors
**PQ** splits each vector into sub-vectors and replaces each with the ID of its nearest centroid in a small per-subspace codebook, shrinking a 768-dimension float vector from 3 KB to a few dozen bytes, with distances estimated from lookup tables. Combined as **IVF-PQ**, this is how billion-scale indexes fit in memory, usually with the top candidates **re-ranked** using full vectors to recover precision.

## Filtering Is the Practical Hard Part
Real queries carry constraints — this tenant, this date range, this language. Filtering ANN results afterwards can leave too few survivors when the filter is selective; filtering first can break the graph walk. Mature engines integrate filters into the search itself, and how well a system handles your filter patterns matters more than its headline benchmark speed.

## Where the Vectors Should Live
Up to a few million vectors, a vector extension in the database you already run, such as pgvector, keeps data, filters and transactions in one place. Dedicated vector databases earn their keep at larger scale, high write rates, or heavy filtered and hybrid search.

## The Decision Rule
Fix a recall target first — measured against exact search on a sample of real queries — then tune \`efSearch\` or \`nprobe\` to the cheapest setting that meets it. Index quality is a number you measure, not a default you inherit.`,
  },

  {
    id: "rag-pipeline-design",
    title: "RAG Pipelines — Chunking, Hybrid Search & Reranking",
    oneLiner: "Most RAG failures are retrieval failures, and the fixes are unglamorous: chunk with context, mix keyword and vector search, rerank, and measure recall before prompting.",
    content: `The demo version of RAG — split documents, embed chunks, fetch the top five, paste them into the prompt — handles easy questions and quietly fails the rest. The production version spends most of its effort before the model is ever called.

## Chunking Decides What Can Be Found
A chunk is the unit of retrieval: too large and it dilutes the embedding and wastes context, too small and it loses the meaning around it. Sensible defaults are a few hundred tokens with modest overlap, split along the document's own structure — headings, sections, paragraphs, code blocks — rather than fixed character counts. Chunks also go blind out of context: "revenue grew 3% over the previous quarter" retrieves poorly if the chunk never names the company or quarter. **Contextual retrieval** prepends a short generated note on where each chunk sits in its document before indexing; Anthropic reported 49% fewer failed retrievals when combined with contextual keyword indexing, and 67% with reranking added.

## Hybrid Search: Keywords Still Matter
Dense embeddings capture paraphrase but blur **exact tokens** — product codes, error strings, names, rare jargon. **BM25** keyword search nails those and misses synonyms. Running both and merging the lists, commonly with **reciprocal rank fusion** — scoring each document by the sum of \`1 / (k + rank)\` across the lists — reliably beats either alone.

## Rerank, Then Trim
Retrieve wide, say 50 to 100 hybrid candidates, then **rerank** with a cross-encoder and keep the best handful. Reranking is often the biggest single quality gain for the effort, and passing fewer, better chunks also helps the model, which uses long, noisy context less reliably.

## Fix the Query, Not Just the Index
User questions are often poor search queries. **Query rewriting** — reformulating, splitting multi-part questions, expanding acronyms, or embedding a generated hypothetical answer (**HyDE**) — closes the gap. **Metadata filters** for product, version, date and permissions keep the model from being handed a plausible answer from the wrong version, or from a document the user isn't allowed to see.

## Generation Is the Last Mile
Instruct the model to answer only from the supplied context, cite the chunks it used, and say so when the context doesn't contain the answer. Without an explicit way out, it fills retrieval gaps with plausible invention.

## The Decision Rule
Build a retrieval eval first — real questions with their known relevant chunks — then improve in order of leverage: chunking and context, hybrid search, reranking, query rewriting. Prompt work on the generation side only pays off once recall is high.`,
  },

  {
    id: "hallucination",
    title: "Hallucination — Why Models Guess and How to Bound It",
    oneLiner: "Models hallucinate partly because training and evals reward a confident guess over 'I don't know' — so the fixes are grounding, verification and making abstention valid.",
    content: `A **hallucination** is fluent, confident output that is false or unsupported — an invented citation, a nonexistent API, a wrong date stated plainly. It's the defining reliability problem of LLMs, and its causes are well enough understood to design around.

## Two Different Failures
- **Factuality errors** contradict the world: the model holds a wrong fact, or assembles a plausible but false one.
- **Faithfulness errors** contradict the supplied context: the source says one thing and the summary another, or adds claims the source never made.

The fixes differ — more knowledge or retrieval for the first, tighter grounding and checking for the second — so name which one you mean.

## Why Models Make Things Up
Pretraining teaches **plausible continuation**, and for rare facts — an obscure person's birthday, a niche paper's authors — plausibility and truth come apart, because the model saw the fact too few times to store it. Post-training can make it worse. A 2025 OpenAI analysis argued that training and benchmarks mostly grade answers simply right or wrong, so **guessing beats abstaining** in expectation — exactly like a student guessing on an exam with no penalty for wrong answers. And fine-tuning on demonstrations that contain facts the model didn't already know teaches it to answer confidently beyond its knowledge.

## Bounding It in Practice
It can't be eliminated, but it can be bounded:
- **Ground** answers in retrieved sources and require **citations** that can be checked.
- **Use tools** for anything a tool answers exactly — calculators, databases, search, code execution.
- **Make abstention legitimate** in the prompt, the output schema and the eval, so "not in the provided documents" outscores a confident wrong answer.
- **Verify** claims against sources in a separate step, or have the model plan and answer verification questions independently before finalizing (chain-of-verification).
- **Constrain** outputs to known options — enum fields, IDs from a lookup — wherever possible.

## Measuring It
Self-reported confidence is poorly calibrated after post-training, but **consistency across samples** is a useful signal: facts the model actually knows tend to recur across samples, while invented ones vary. For RAG, measure **faithfulness** — the share of claims supported by the retrieved context.

## The Decision Rule
Design as if every unsupported claim might be false: ground what can be grounded, verify what matters, give the model a clean way to say it doesn't know, and track the hallucination rate on a fixed eval set as a release metric.`,
  },
];
