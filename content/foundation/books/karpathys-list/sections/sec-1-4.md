**Andrej Karpathy · 2023 · [Lecture 7](https://www.youtube.com/watch?v=kCc8FmEb1nY) · [github.com/karpathy/nanoGPT](https://github.com/karpathy/nanoGPT)**

Two hours, one file, a transformer trained on a megabyte of Shakespeare. The lecture is the best explanation of attention that exists, and the reason is a single sequence of four implementations of the same operation.

Start from a model that ignores everything except the previous character. The obvious improvement is to let each position see all the ones before it, and the crudest possible version of that is simply to **average them**.

**Version one** does it with a `for` loop: for each position `t`, average the character vectors from `0` up to `t`.

**Version two** notices that this is a matrix multiply. Take a lower-triangular matrix of ones — so each row can only reach positions at or before its own — normalise each row to sum to one, and multiply. Same answer, no loop.

**Version three** notices that the same normalised triangular matrix can be produced a roundabout way: start from zeros, set the upper triangle to negative infinity, and apply a softmax along each row. Identical output, more machinery, no benefit yet.

**Version four** collects the payoff. Replace those zeros with numbers the model computes. Each position emits a query and a key, the affinity between two positions is their dot product, and the softmax over affinities gives a **weighted** average instead of a uniform one — the model decides what to pay attention to.

That is self-attention, arrived at as the fourth way of writing "average the past" rather than as a formula to be accepted. And notice what the masking turns out to be: not an added rule about not seeing the future, but the same triangular matrix that was there in version one.

The rest assembles quickly, and each piece has a stated reason. **Values**, because what you aggregate should not be the same vector you match on. The `1/sqrt(head_size)` scale, because dot products in `d` dimensions have variance `d`, and a softmax over large numbers sharpens toward picking exactly one — without it, attention at the start of training would latch onto a single token instead of a diffuse average. **Multiple heads**, because one weighted average blends every relation into a single blur. A **feedforward block** at `4x` width, because attention is a communication step and the tokens need somewhere to actually compute afterwards. **Residual connections and normalisation**, because six blocks stacked without them do not train at all.

The final model is small: `6` layers, `6` heads, `384` embedding dimensions, a `256`-character context, around `10M` parameters, reaching a validation loss near `1.48`. It writes fluent nonsense in the shape of a play. That is the correct outcome — the lecture is not trying to produce a good model, it is trying to produce a transformer you have personally typed.

**nanoGPT** is the same architecture written for real: roughly three hundred lines of model code and three hundred of training loop, able to load GPT-2 weights and to reproduce GPT-2 `124M` on OpenWebText given a node and a few days. **The proportion is the argument.** The model is a small file; everything else in a modern training stack is data, schedule and infrastructure.

> Self-attention is the fourth rewrite of "average over the previous tokens", with the averaging weights made data-dependent — and every other component of a transformer exists to make that step trainable at depth.

**What did not survive:** the specific architecture, which is 2019 vintage and taught as though it were current. The lecture builds learned absolute positional embeddings, LayerNorm and GELU; production models in 2026 use rotary embeddings, RMSNorm and a gated SwiGLU feedforward, and none of those substitutions is mentioned. It also makes one modernising choice silently — normalisation is applied *before* each sublayer rather than after, as the original paper had it, which is a large part of why the stack trains at all — so the viewer inherits a correction without ever learning that it was one. The honest caveat on nanoGPT itself is that "reproduces GPT-2" is a claim about a cluster and a weekend, not about the three hundred lines.
