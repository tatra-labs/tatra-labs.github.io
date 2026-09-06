**Ouyang, Wu, Jiang, Almeida, Wainwright, Mishkin, Zhang, Agarwal, Slama, Ray et al. · 2022 · [arXiv:2203.02155](https://arxiv.org/abs/2203.02155)**

A base language model is not an assistant and cannot be argued into being one. Ask GPT-3 a question and the highest-probability continuation is often another question, because documents containing questions tend to contain more of them. The model is not failing; it is doing exactly what it was trained to do, and what it was trained to do is not what anyone wants. This paper is the recipe that closed that gap, and it is the reason ChatGPT existed eight months later.

Three stages, each solving the previous one's problem.

**Supervised fine-tuning.** Contractors write the response they think a prompt deserves, and the model is fine-tuned on those pairs. Around `13k` prompts. This works immediately and stops working quickly, because writing a good answer is slow and expensive, and the ceiling is the demonstrator's own writing.

**A reward model.** Instead of writing answers, label them. For a prompt, sample `K` outputs from the model, have a human rank them, and train a `6B` model to score a response the way the ranker would. Around `33k` prompts. Ranking is far cheaper than writing and — this is the important part — **a person can reliably recognise a better answer than they could have produced**, so the reward model encodes a standard above the demonstrators' own output.

**Reinforcement learning against that model.** PPO, with the reward model in the loop, plus a per-token KL penalty against the SFT policy to stop the optimiser wandering into text that scores well and reads like nothing. Around `31k` prompts.

The headline result is a statement about efficiency that reframed the field: **labellers preferred the `1.3B` InstructGPT model's outputs to those of the `175B` GPT-3**, a hundredfold difference in parameters recovered by post-training. Alignment was not a tax on capability but a multiplier on the capability already present and inaccessible.

The paper is unusually careful about what it did not achieve. It names the **alignment tax** — regressions on standard NLP benchmarks — and mitigates it by mixing pretraining gradients back into the PPO objective. It reports that truthfulness improved and that bias did not meaningfully. And it addresses "aligned to whom" directly: the system is aligned to about forty contractors, screened for agreement with the researchers' own judgements, following instructions the researchers wrote. That is a specific and small group, and the paper says so rather than implying a species-wide preference had been captured.

> Humans are much better at ranking answers than at writing them, so train a model to imitate the ranking and optimise against that — the whole of RLHF is this arbitrage.

**What did not survive:** the machinery, though not the idea. PPO is finicky, memory-hungry — four models in play at once — and largely displaced for preference tuning by [Direct Preference Optimization](/foundation/book/karpathys-list?section=sec-4-3), which removes the reward model and the sampling loop entirely. Human labelling as the sole source of preferences did not survive either, on cost grounds, giving way to [AI feedback](/foundation/book/karpathys-list?section=sec-4-4). And the reward model turned out to be the structural weak point of the whole design: it is a learned, imperfect proxy being optimised hard by a capable adversary, which is the textbook setup for [reward hacking](/foundation/book/wengs-guide?section=sec-4-1). The KL penalty is a leash, not a solution. What survived completely is the three-stage shape — demonstrate, rank, optimise — which every frontier lab still runs in some form.
