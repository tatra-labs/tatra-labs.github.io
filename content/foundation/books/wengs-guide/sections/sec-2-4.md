**Lilian Weng · 2019 · [Lil'Log](https://lilianweng.github.io/posts/2019-09-05-evolution-strategies/)**

Every other method in this guide needs a gradient — some way of asking "if I nudge this parameter, does the result improve?". Evolution strategies do not. Perturb the parameters at random, see which perturbations scored better, move that way. The objective can be discontinuous, non-differentiable, or a sealed box you can only query. None of it matters, because the algorithm never looks inside.

The post builds up the family properly. **Simple Gaussian ES** samples a population of parameter settings from a bell curve, keeps the best performers, and refits the curve's centre and spread to them. **CMA-ES** adds a covariance matrix, so the search distribution learns *which directions* in parameter space matter and stretches itself along them — the strongest general-purpose black-box optimiser for problems of modest size, and still a standard tool. **Natural evolution strategies** reframe the whole update as gradient ascent on expected fitness with respect to the *search distribution's* parameters, which gives the family a principled footing rather than a heuristic one.

Then the result that made the field pay attention. Salimans et al. showed ES competitive with A3C on Atari and MuJoCo — and the reason is not sample efficiency, on which ES is far worse. **The reason is parallelism.**

Here is the trick, and it is lovely. Each worker perturbs the parameters with random noise, evaluates the result, and reports back. If every worker draws its noise from a *shared* table of pseudo-random numbers, then a perturbation can be identified by **a single integer** — the seed that generated it. So workers exchange two scalars each, a seed and a score, instead of gradient vectors the size of the entire model. Communication is nearly free, scaling is nearly linear, and a problem that took a day of wall-clock could be done in an hour given enough machines.

The other virtues are structural. No backpropagation through time, so long horizons and sparse or delayed rewards cost nothing extra. No sensitivity to the credit-assignment problem that [chapter 1](/foundation/book/wengs-guide?section=sec-1-2) spends all its effort on. And complete tolerance of reward functions that are not differentiable in any sense whatsoever.

> Evolution strategies trade sample efficiency for perfect parallelism and total indifference to the shape of the objective, which is a bad trade when gradients exist and the only available one when they do not.

**What did not survive:** ES for neural network weights, decisively. The number of samples needed grows badly as the number of parameters grows, and against a model with billions of them, estimating a useful direction from random perturbations is hopeless. Gradient descent won because the gradient is available and enormously more informative per sample.

**And then it came back for a different object.** This is the most surprising line in the guide. The artifacts that matter for current agent systems — prompts, workflow definitions, harness code, tool descriptions, generated programs — are **discrete text, and no gradient exists for them at all.** That is precisely the regime ES was built for.

Population-based search over such artifacts is now an active area: AlphaEvolve and its relatives evolve programs against measurable objectives, prompt and workflow optimisation runs mutation and selection over text, and Weng's own [Harness Engineering](/foundation/book/wengs-guide?section=sec-5-3) post surveys a cluster of evolutionary methods applied to harness code — along with exactly the failure this chapter should make you expect. **Diversity collapse**, a population converging on one lineage and exploring nothing further, is [entropy collapse](/foundation/book/wengs-guide?section=sec-1-4) under a different name, and the oldest known failure of evolutionary search.

Read this post for CMA-ES and the seed-sharing trick, and read it as the chapter's closing argument: the technique that lost the contest it was entered in turned out to be the right tool for a problem nobody had yet posed.
