**Jason Weston & Sainbayar Sukhbaatar · 2023 · [arXiv:2311.11829](https://arxiv.org/abs/2311.11829)**

Soft attention has a defect that is easy to state and hard to fix: **it assigns non-zero weight to everything in the context.** Because the weights come out of a softmax, and a softmax never outputs exactly zero, there is no mechanism for genuinely *ignoring* something. A sentence that is irrelevant, or misleading, or an opinion the user happened to express, still contributes to every representation downstream — and measurably degrades the answer.

The paper gives two demonstrations of the cost. Insert distracting but topically related sentences into a question and factual accuracy falls sharply. State an opinion in the question — "I think the answer is X, but I'm not sure" — and the model agrees far more often than it should. That second one is sycophancy arriving not from reward-model optimisation, which is where people usually look for it, but from the plain arithmetic of attention. Both are cases of a model unable to decide that part of its input deserves no weight at all.

**System 2 Attention is a two-step pipeline rather than an architectural change.** First, ask the model to **regenerate the context** — rewrite it to contain only the material relevant to the question, stripping out opinions, distractors and any hint of what the answer might be. Then answer the question using only that regenerated context, with the original thrown away.

The elegance is that the second pass *literally cannot* attend to what the first pass deleted, because it is no longer there. Attention is made hard by editing the input rather than by changing the mechanism.

It works well on the cases it targets. Factuality on distractor-laden TriviaQA rose from roughly `62.8%` to `80.3%`, math word problems with irrelevant context improved substantially, and sycophancy on opinionated questions dropped sharply. The pipeline is also modular in a way that made it easy to adopt: it is two prompts, and the first can be run by a cheaper model.

> Soft attention cannot assign zero weight, so the practical way to make a model ignore something is to delete it from the context and run the model again.

**What did not survive:** the technique, though the problem it identifies is thoroughly alive. The costs are structural. Every query pays two full passes. And the first pass rewrites the context, which means it can and does delete material that mattered — a regeneration step is a lossy compression of the input, performed by a model that does not yet know the answer. The failure mode is silent: nothing in the output tells you a necessary clause was dropped. That is a bad trade for retrieval-heavy or document-grounded work, where the context *is* the evidence and paraphrasing it is precisely what you must not do.

What replaced it was less elegant and more effective: training on data that contains distractors, so the model learns to down-weight them, and long-context training that makes position less determinative. The reasoning models of 2025 onward also do this filtering inside their own chain, restating the relevant facts before working — System 2 Attention performed by the model on itself, paid for in output tokens rather than in an extra round trip.

The underlying defect has not gone away. Liu et al.'s "Lost in the Middle" showed the same year that retrieval accuracy depends heavily on *where* in a long context the relevant passage sits, and long-context distraction remains measurable in 2026 models with far larger windows. This paper's contribution is the diagnosis — that irrelevant context is not neutral but actively harmful — and the observation that the cheapest available fix is to run the model twice.
