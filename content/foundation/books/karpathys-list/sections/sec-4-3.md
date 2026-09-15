**Rafailov, Sharma, Mitchell, Ermon, Manning & Finn · 2023 · [arXiv:2305.18290](https://arxiv.org/abs/2305.18290)**

The RLHF pipeline has four models in memory, a sampling loop inside the training loop, and a reinforcement-learning algorithm that needs careful tuning to avoid collapsing. This paper observes that for the preference-tuning problem, none of it is necessary — and the argument is three lines of algebra.

Start with what RLHF is actually optimising: get as much reward as possible, while not straying too far from the model you started with. That constrained problem has a **known closed-form answer**, a standard result rather than a new one:

$$
\pi_r(y \mid x) = \frac{1}{Z(x)} \pi_{\text{ref}}(y \mid x) \exp\left( \frac{r(x,y)}{\beta} \right)
$$

In words: the best policy is the original one, reweighted to favour high-reward responses, with $Z(x)$ the normalising constant that makes the probabilities sum to one. Everyone had written this down.

**The move is to read it backwards.** Solve for the reward instead of the policy:

$$
r(x,y) = \beta \log \frac{\pi_r(y \mid x)}{\pi_{\text{ref}}(y \mid x)} + \beta \log Z(x)
$$

**Every language model already *is* a reward model**, up to that awkward $Z(x)$ term. And now the trick lands: $Z(x)$ does not matter. Preference data is modelled by asking only which of two responses to the *same* prompt is better, which depends only on the **difference** of their rewards — so $\beta \log Z(x)$ appears twice with opposite signs and cancels exactly. Substituting leaves an ordinary binary classification loss on the policy itself:

$$
-\log \sigma\left( \beta \log \frac{\pi(y_w \mid x)}{\pi_{\text{ref}}(y_w \mid x)} - \beta \log \frac{\pi(y_l \mid x)}{\pi_{\text{ref}}(y_l \mid x)} \right)
$$

No reward model is trained. No samples are drawn during training. No reinforcement learning happens at all. It is ordinary supervised learning on a fixed dataset of preferred and dispreferred pairs — and it optimises the *same* objective PPO was approximating. This is not a heuristic substitute for RLHF; it is the same problem solved in closed form.

The gradient has a clean reading too. It pushes up the probability of the preferred response and pushes down the dispreferred one, weighted by how badly the *implicit* reward model — the current policy, viewed through that identity — currently has the pair ordered. Examples the model already gets right contribute almost nothing, so the update concentrates where it is wrong. Empirically it matched or beat PPO on sentiment control, summarisation and single-turn dialogue, while being stable enough to run without a specialist on hand.

> Any policy trained against a KL-constrained reward objective is already an implicit reward model, and preference likelihood only ever asks for reward differences — so the reward model can be eliminated symbolically rather than trained.

**What did not survive:** the conclusion people drew from it, which was that reinforcement learning had been shown unnecessary. Two limits appeared quickly. DPO is **offline** — it fits a fixed set of pairs, so it cannot explore, and it degrades when the preference data drifts away from the policy being trained, which is exactly the staleness [Llama 2](/foundation/book/karpathys-list?section=sec-4-2) addressed with five iterative rounds. It also controls only the *gap* between the two responses, and a well-documented failure mode is that the probability of the preferred response falls too, merely more slowly than the dispreferred one, pushing probability mass somewhere neither was measured. A family of corrections followed — IPO, KTO, ORPO, SimPO, and iterative or online DPO variants that put sampling back in.

The larger reversal came from a different direction. When the reward is **verifiable** rather than preferential — a unit test passes, an answer matches — there is no preference model to invert and nothing to cancel, and online RL came back decisively; the reasoning models of 2025 and 2026 are trained with GRPO and its relatives, not with DPO. The honest summary is that DPO settled preference tuning and did not generalise past it.
