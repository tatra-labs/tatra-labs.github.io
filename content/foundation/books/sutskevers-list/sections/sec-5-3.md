**Jared Kaplan, Sam McCandlish, Tom Henighan, Tom B. Brown, Benjamin Chess, Rewon Child, Scott Gray, Alec Radford, Jeffrey Wu, Dario Amodei · 2020 · [arXiv:2001.08361](https://arxiv.org/abs/2001.08361)**

GPipe and Deep Speech 2 make a cluster usable. Neither tells you how large a model to put on it. Before this paper that choice was craft knowledge. Everyone knew larger models did better, but nobody could say *by how much*, or whether a fixed budget was better spent on more parameters, more training data, or more steps. Effort went into architecture search — depth against width, how many attention heads, which activation function — on the assumption that the shape of the network was where the gains lived. A team could not predict how good a run would be until they had done the run.

Kaplan et al. trained decoder-only transformers on WebText2 across a deliberately wide grid: `768` to `1.5B` parameters, datasets from `22M` to `23B` tokens. The method is a controlled sweep — vary model size $N$, data $D$, or compute $C$ one at a time, keeping the other two large enough that they are not the thing holding you back, then fit a curve to the resulting test loss.

**Every fit comes out a clean power law**, meaning loss falls by a constant *factor* each time you multiply the input by a constant factor — a straight line when both axes are logarithmic:

$$
L(N) = (N_c/N)^{0.076}, \qquad L(D) = (D_c/D)^{0.095}, \qquad L(C_{\min}) = (C_c/C_{\min})^{0.050}
$$

Some of these trends hold over more than seven orders of magnitude. **The exponents being small is the substance of the claim, not a footnote.** A tenfold increase in parameters multiplies the fitted loss by roughly `0.84`. Progress is real, it is remarkably steady, and it is expensive.

Two secondary results carried as much weight as the curves. First, **architecture barely registered**: within a wide range, depth and width traded off against each other with minimal effect on loss at a fixed parameter count. Shape was noise; size was signal — which quietly invalidated a great deal of ongoing work. Second, the paper combined the fits into an allocation rule. Given extra compute, it recommended $N \propto C^{0.73}$ and only $D \propto C^{0.27}$: spend most of any new budget on a bigger model, feed it a modest amount of data, and stop well short of convergence, on the grounds that large models reach any given loss in fewer steps and fewer tokens than small ones do.

The effect was to convert training from an experimental art into a forecasting problem. Fit curves on a ladder of small runs, extrapolate, commit the cluster. That is now standard practice, and the scaling plot is a routine pre-flight artifact rather than a research result. It also justified spending eight figures on a single run, since the loss at the far end was now predictable rather than hoped for.

> Loss falls as a smooth power law in scale, and the fitted exponents are small enough that the only reliable path to a better model is a much larger budget.

**What did not survive:** the allocation rule — the part everyone acted on. Hoffmann et al. (2022, Chinchilla) trained over 400 models from `70M` to over `16B` parameters on `5B` to `500B` tokens and found that parameters and data should scale roughly *equally*: double one, double the other. Chinchilla at `70B` parameters, trained on 4x Gopher's data at the same compute, beat Gopher (`280B`) across the board and reached `67.5%` on MMLU. Pearce and Song (TMLR 2024) traced most of the discrepancy to Kaplan counting parameters excluding the embedding layers at small scale, where those embeddings are a large share of the total. The functional form held up. The recommendation it produced was wrong, and an entire generation of models built on it was undertrained.
