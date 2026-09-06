# 9.4 Convolution and Pooling as an Infinitely Strong Prior

Two pages that reframe the whole chapter in the language of Chapter 5. They are the most conceptually
useful pages in it.

## The reframing

A prior is a distribution over parameters encoding belief before data arrives. A **weak** prior is
high-entropy and easily overridden by evidence; a **strong** prior is concentrated and moves less. An
**infinitely strong** prior assigns zero probability to some parameters, forbidding them outright
regardless of what the data says.

Convolution is an infinitely strong prior on a fully connected layer. It says the weights of one hidden
unit must be identical to those of its neighbour shifted in space, and that the weights must be **zero**
outside the receptive field. Pooling is likewise an infinitely strong prior that each unit should be
invariant to small translations.

## The two consequences

**Underfitting when the prior is wrong.** Because the prior cannot be overridden, a convolutional network
applied to a task where translation equivariance does not hold will underfit, and no amount of data will
rescue it. The book's example: if a task requires preserving precise spatial information, pooling
everywhere increases training error. Some architectures pool on some channels and not others for exactly
this reason.

**Benchmark comparisons must control for it.** If a task requires invariance to permutations of the input
— genuinely destroying spatial structure — a convolutional network is the wrong model. The book states the
methodological rule directly: convolutional models should be compared only with other convolutional
models on permutation-invariant benchmarks, because the spatial prior is doing work that has nothing to do
with the learning algorithm under test.

## My take

The infinitely-strong-prior framing is the best available answer to the recurring question of when to use
an architectural prior at all, and it makes the trade-off explicit in a way that "inductive bias" as
usually used does not. A prior that cannot be overridden is free capacity when it is right and an
irreducible error floor when it is wrong. The data can never argue with it.

This is exactly the axis along which vision transformers displaced convolutional networks on large
datasets. A ViT has a much weaker spatial prior: position is supplied as an embedding the model may learn
to use or ignore, rather than baked into the connectivity. On small data it underperforms, because it
must learn from examples what a convolution assumes for free. On very large data it wins, because the
convolutional prior is only approximately true and the transformer is free to learn the corrections. The
book gives the vocabulary for that result eight years early.

The benchmarking rule generalises further than stated, and it is broken constantly. Any comparison
between architectures with different priors is partly a comparison of how well each prior matches the
dataset, and reporting it as a comparison of methods is a category error. The same applies to the
augmentation caution in 7.4 and to the ensembling caution in 7.11 — three separate places in this book
where the authors point out that a headline benchmark number is measuring something other than what it
claims.
