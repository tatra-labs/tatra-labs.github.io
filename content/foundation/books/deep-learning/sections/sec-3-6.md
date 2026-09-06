# 3.6 The Chain Rule of Conditional Probabilities

A joint distribution over many variables factorises into a product of conditionals over one variable
each. This is an identity, not an assumption, and it is the most consequential line in Chapter 3.

## The rule

$$
P(x^{(1)}, \ldots, x^{(n)}) = P(x^{(1)}) \prod_{i=2}^{n} P(x^{(i)} \mid x^{(1)}, \ldots, x^{(i-1)})
$$

It follows from applying the definition in 3.5 repeatedly. For three variables,

$$
P(a, b, c) = P(a) P(b \mid a) P(c \mid a, b)
$$

Nothing has been assumed about the variables. Any ordering works, and different orderings give different
but equally valid factorisations.

## My take

Every autoregressive model in existence is this identity plus a function approximator. A language model
does not model the joint distribution over token sequences directly — it models
$P(x^{(i)} \mid x^{(1)}, \ldots, x^{(i-1)})$ with a neural network, and the chain rule guarantees that
the product of those conditionals *is* the joint. This is why next-token prediction is not a proxy for
distribution modelling. It is distribution modelling, exactly, with no approximation in the
decomposition itself.

Three consequences follow, and all of them are visible in practice.

**Sampling is easy, marginalising is not.** Draw $x^{(1)}$, condition, draw $x^{(2)}$, and so on:
ancestral sampling costs one pass. But asking for the probability of a *middle* token unconditioned on
what precedes it requires the sum of 3.4, which the factorisation does not help with.

**Order is a modelling choice.** The identity holds for any permutation, but a neural network with finite
capacity will fit some orderings better than others. PixelRNN's raster scan and BERT's masked objective
are two different answers to a question the mathematics leaves open.

**Errors compound.** Because the joint is a product, a small per-step error accumulates multiplicatively
over a long sequence. Exposure bias — the mismatch between conditioning on ground truth during training
and on the model's own samples at generation time — is this product being evaluated along a trajectory
the model never saw.
