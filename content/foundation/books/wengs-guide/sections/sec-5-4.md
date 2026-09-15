**Lilian Weng · 2026 · [Lil'Log](https://lilianweng.github.io/posts/2026-06-24-scaling-laws/)**

The adverb is the point. Everyone in the field fits scaling laws; this post is about how easily the fitting goes wrong. It is the right closing entry because it makes explicit what [the implementation post](/foundation/book/wengs-guide?section=sec-1-5) argued at the very start — that procedure, not principle, is where results are decided.

It opens with history that is usually skipped. Loss predictability was studied long before it was fashionable: Amari and colleagues derived learning-curve forms in the early 1990s, and Hestness et al. found power-law behaviour across several domains in 2017, three years before the paper everyone cites. The standard formula is stated plainly — an irreducible term $E$ for how unpredictable text simply is, a term that falls as the model grows, a term that falls as the data grows — together with the ubiquitous approximation $C \approx 6ND$ relating compute to model size and token count.

**The centrepiece is the Kaplan-versus-Chinchilla disagreement, treated as a methodological puzzle rather than a scoreboard.** [Kaplan et al.](/foundation/book/karpathys-list?section=sec-3-3) found the optimal model size grows roughly as $C^{0.73}$, implying you should spend new compute mostly on parameters. [Chinchilla](/foundation/book/karpathys-list?section=sec-3-4) found $C^{0.5}$, implying parameters and data should scale together. Between those two numbers sits a two-year period in which the entire field trained badly undertrained models on the strength of the first answer.

Weng gives two reconciling explanations, and neither is about anyone being careless.

**Kaplan's models were smaller**, so the extrapolation had to run much further, and a long extrapolation is correspondingly more sensitive to small errors in the fit.

**And embedding parameters are a large fraction of a small model and a negligible fraction of a large one**, so whether you count them changes the apparent exponent. Sit with that one: it is a *definitional* choice, not an experimental result, and it produced a difference worth hundreds of millions of dollars in misallocated compute.

The section on why the relationship should be a power law at all is the most speculative and the most interesting, canvassing explanations based on data lying on a low-dimensional surface, and on knowledge arriving in discrete pieces whose frequencies follow a power law. Neither is settled. **The field has been extrapolating confidently along a curve it cannot derive.**

**The data-limited section is the one that matters for the present**, now that unique high-quality tokens are the binding constraint. Repeated data loses value, and the post covers the work modelling how fast — including approaches that model the interaction between model size and repetition explicitly, rather than folding repetition into a vaguer notion of effective data.

> A common workflow is to fit on a handful of small runs and extrapolate to a very large one, and in that setup "choices that look like rounding error may lead to wild differences in prediction."

**The practical section should be printed and pinned up.** Numerical precision and rounding. How the loss is averaged — over tokens, over sequences, over batches — which quietly changes the quantity you are fitting. What counts as a parameter. Which checkpoints are allowed into the fit. Each of these sounds like housekeeping, and each can move an extrapolation further than a genuine scientific disagreement would.

That is the note this guide should end on. It began with the finding that [deep reinforcement learning results are properties of implementations](/foundation/book/wengs-guide?section=sec-1-5) rather than of algorithms, and it closes with the same claim about the most trusted extrapolation in machine learning — the curve that authorises nine-figure training runs. Between those two points sit reward models that are proxies, toxicity classifiers that encode their annotators, benchmarks that reward guessing, and evaluators too weak for the loops built on top of them. **The recurring subject of Lilian Weng's writing, across eight years and two subject areas, is that the measurement is the hard part.** Almost nobody organises a reading list around that, which is why I organised this one that way.
