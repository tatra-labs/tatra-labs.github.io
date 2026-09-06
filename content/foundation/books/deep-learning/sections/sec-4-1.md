# 4.1 Overflow and Underflow

Real numbers cannot be represented exactly on a computer, and this section is about the two ways that
approximation becomes catastrophic rather than merely imprecise.

## The two failures

**Underflow** occurs when numbers near zero round to zero. This is usually harmless and occasionally
fatal, because several operations behave differently at exactly zero: division produces infinity, and the
logarithm produces negative infinity, which then propagates as `nan` through everything downstream.

**Overflow** occurs when large-magnitude numbers are approximated as $\infty$ or $-\infty$. Further
arithmetic typically turns these into `nan` as well.

Both matter in probability code specifically, because probabilities are small, likelihoods are products
of small numbers, and the logarithms taken to avoid the products have their own edge cases at zero.

## The worked example: softmax

The book's illustration is the softmax, whose output $s$ has components

$$
s_i = \frac{\exp(x_i)}{\sum_{j=1}^{n} \exp(x_j)}
$$

It fails in both directions. If every $x_i$ is a large negative constant, every exponential underflows
and the denominator becomes zero. If some $x_i$ is large and positive, its exponential overflows.

Both are fixed by one substitution. Evaluate the softmax at $z = x - \max_i x_i$ instead of at $x$. The
softmax is invariant to adding a constant to every input, so the value is unchanged; but now the largest
exponent is exactly zero, so nothing overflows, and at least one term in the denominator equals one, so
the denominator cannot underflow to zero.

One residual problem remains: if $\log \operatorname{softmax}$ is computed by taking the logarithm of a
stabilised softmax, an underflowed component still gives $-\infty$. The log-softmax must be stabilised
separately, in its own implementation.

## My take

The point generalises well beyond softmax. A mathematically valid expression is not a valid
implementation, and the gap between them is where a large share of real training failures live.

The practical consequence is that this stabilisation should almost never be written by hand. Every
framework ships a fused `log_softmax`, a `logsumexp`, and a cross-entropy loss that takes raw logits
rather than probabilities, and the reason those exist is precisely this section. The recurring bug in
production code is applying a softmax and then a log-loss as two separate steps — mathematically
identical, numerically broken, and it shows up as a `nan` at some unpredictable step thousands of
iterations into a run.

The authors' own advice is worth repeating: low-level libraries stabilise these primitives so their users
do not have to, and reimplementing them is a false economy.
