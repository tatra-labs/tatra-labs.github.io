# 6.2 Gradient-Based Learning

The largest section of Chapter 6, and it makes one argument repeatedly from different angles: the cost
function and the output unit must be designed **together**, because what matters is not the value of the
loss but the size of its gradient.

## Non-convexity, and what is lost

Adding a nonlinearity makes the loss non-convex. Linear regression and SVMs come with convergence
guarantees; neural networks do not. Training is by iterative, gradient-based optimisation that drives the
cost to a low value with no guarantee of a global minimum, and it is sensitive to initialisation — weights
are initialised to small random values, and biases to zero or small positive numbers.

## Cost functions

In almost all cases the model defines a distribution $p(y \mid x; \theta)$ and the cost is the negative
log-likelihood, equivalently the cross-entropy between training data and model:

$$
J(\theta) = -\mathbb E_{x, y \sim \hat p_{\text{data}}} \log p_{\text{model}}(y \mid x)
$$

The advantage the book emphasises is that specifying a model automatically specifies a cost. There is no
separate design step.

The property that makes a good cost function is a **large and predictable gradient**. Saturating output
units destroy this, since a flat output function has a near-zero gradient. The negative logarithm is what
rescues the design: it undoes the exponential in the sigmoid and softmax so that the cost does *not*
saturate where the model is confidently wrong.

One warning the book gives that is easy to miss: cross-entropy with continuous outputs can be **unbounded
below**. A Gaussian with a learnable variance can drive the variance toward zero on a point it fits
exactly, sending log-likelihood to infinity. Regularisation exists partly to prevent this.

An alternative is to learn only a **statistic** of $y$ rather than a full distribution. Mean squared error
recovers the conditional mean and mean absolute error recovers the conditional median. Both are correct
and both work poorly in practice, because they produce small gradients when combined with saturating
units — which is why cross-entropy is often preferred even where the full distribution is not wanted.

## Output units

**Linear** units, $\hat y = W^{\top} h + b$, parameterise the mean of a Gaussian. They do not saturate, so
they pose no difficulty for any gradient-based method.

**Sigmoid** units produce a Bernoulli parameter. Writing $z$ for the pre-activation and $\hat y =
\sigma(z)$, the loss is

$$
J(\theta) = \zeta\left( (1 - 2y) z \right)
$$

using the softplus of 3.10. This saturates **only when the answer is already correct** — when the model
is wrong, the softplus is approximately linear in $z$ and the gradient does not vanish. That asymmetry is
the entire point, and it is lost if mean squared error is used with a sigmoid output.

**Softmax** units produce a categorical distribution. Writing $s = \operatorname{softmax}(z)$,

$$
\log s_i = z_i - \log \sum_j \exp(z_j)
$$

The first term never saturates, so a wrongly-classified example always produces gradient. Softmax is
invariant to adding a constant to every logit, which is both the source of the numerical stabilisation
in 4.1 and the reason the parameterisation is over-complete. The unit behaves as a soft winner-take-all,
and the book notes that the name is arguably wrong: it is a softened `argmax`, not a softened `max`.

Beyond these, the same principle extends: predict a variance as well as a mean for **heteroscedastic**
noise, or predict the parameters of a Gaussian mixture for a **mixture density network**. The book warns
that mixture density outputs are numerically unreliable in practice and usually need gradient clipping.

## My take

The design rule here is the most portable thing in Chapter 6: **the loss must undo the output
nonlinearity**. Sigmoid with cross-entropy is well behaved; sigmoid with squared error is not, and it
fails silently, appearing as a network that simply refuses to learn. Anyone who has seen a classifier
plateau immediately after initialisation has met this bug.

The unbounded-below warning deserves more weight than it gets. Any model that learns its own output
variance can cheat by shrinking it, and this is a live problem in variational autoencoders, where a
learnable decoder variance collapses the reconstruction term and the model ignores its latent code
entirely. The mechanism is described here, four hundred pages before the model that suffers from it.
