**Lewis, Perez, Piktus, Petroni, Karpukhin, Goyal, Kuttler, Lewis, Yih, Rocktaschel, Riedel & Kiela · 2020 · [arXiv:2005.11401](https://arxiv.org/abs/2005.11401)**

Karpathy's organising metaphor in the talk is the operating system: the model is the CPU, the context window is RAM, and everything the model knows but cannot hold in context is disk. Retrieval-augmented generation is the file system, and this paper is where it was specified.

The framing the paper introduces is the useful part. A fine-tuned language model has **parametric memory** — knowledge baked into weights, which is fast, blended, and impossible to inspect, update or attribute. RAG adds **non-parametric memory**: a dense vector index over a corpus, in the original case about `21M` hundred-word chunks of Wikipedia, retrieved by a pretrained dense passage retriever. The generator, a BART sequence-to-sequence model, conditions on the query together with the retrieved passages.

Two variants differ in how much they commit. **RAG-Sequence** picks documents once and generates the whole answer from them. **RAG-Token** marginalises per token, so different tokens in one answer can be supported by different passages — the right choice when an answer combines facts from several sources. Both are trained end to end, with one deliberate compromise: the query encoder and generator are fine-tuned while **the document encoder is frozen**, because updating it would mean re-embedding and re-indexing the entire corpus after every step.

The results were state of the art on open-domain question answering, beating both parametric-only sequence-to-sequence models and the task-specific retrieve-and-extract pipelines that preceded them, while producing generations that were more specific and more factual.

The property that mattered most was not on the leaderboard. **The knowledge can be replaced without retraining.** Swap the Wikipedia dump for a newer one and the system's beliefs about the world update, with no gradient step. For a field where the alternative was retraining a model to correct a fact, this decoupling of knowledge from capability is the paper's real contribution, and it is why every production system now has a retrieval layer.

> Separating what a model knows from what it can do turns a fact update from a training run into a database write.

**What did not survive:** the architecture, almost entirely. Nobody trains RAG-Token or marginalises over retrieved documents. What is universally called RAG in 2026 is far dumber — embed the query, fetch the top `k` chunks, paste them into the prompt, generate — requiring no training at all and working well enough because instruction-tuned models are competent at using material placed in front of them. The end-to-end differentiable version lost to a pipeline with no gradients in it.

The direction of travel since is toward **agentic retrieval**: rather than one shot of similarity search before generation, the model issues its own queries, reads the results, and searches again, which is [tool use](/foundation/book/karpathys-list?section=sec-6-2) rather than an architecture and handles multi-hop questions that a single embedding lookup cannot express.

The caveat worth carrying is that **retrieval does not fix hallucination**, and the early framing overpromised here. Grounding a model in retrieved text reduces fabrication when the retrieval succeeds, and does nothing when it fails; models will also contradict a passage sitting in their own context, or blend it with parametric knowledge without marking the seam. Lilian Weng's [Extrinsic Hallucinations in LLMs](/foundation/book/wengs-guide?section=sec-4-2) treats that distinction carefully, and it is the one most RAG deployments get wrong.
