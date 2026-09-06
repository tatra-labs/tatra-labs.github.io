# 5.6 Bayesian Statistics

An alternative to the frequentist framing of 5.4 and 5.5. The book presents it fairly, uses it rarely,
and explains why — which makes this section a good example of the authors being honest about a road not
taken.

## The two differences

Frequentist statistics treats the true parameter $\theta$ as a fixed unknown and the estimate
$\hat\theta$ as random, since it depends on the data. Bayesian statistics inverts both: the data are
observed and therefore not random, while $\theta$ is uncertain and so is represented by a distribution.

Before observing data, knowledge is encoded in a **prior** $p(\theta)$, usually a broad, high-entropy
distribution expressing a preference for simpler solutions. After observing data, Bayes' rule gives the
**posterior**:

$$
p\left( \theta \mid x^{(1)}, \ldots, x^{(m)} \right) = \frac{p\left( x^{(1)}, \ldots, x^{(m)} \mid \theta \right) p(\theta)}{p\left( x^{(1)}, \ldots, x^{(m)} \right)}
$$

Prediction then **integrates over** the posterior rather than plugging in a point estimate:

$$
p\left( x^{(m+1)} \mid x^{(1)}, \ldots, x^{(m)} \right) = \int p\left( x^{(m+1)} \mid \theta \right) p\left( \theta \mid x^{(1)}, \ldots, x^{(m)} \right) d\theta
$$

That integral is the substantive difference. Where maximum likelihood commits to one $\theta$, the
Bayesian prediction is a weighted average over all of them, and it protects against overfitting for the
same reason an ensemble does.

The book's worked example is **Bayesian linear regression**, where a Gaussian prior on the weights and
Gaussian noise give a Gaussian posterior in closed form.

## MAP estimation

Full Bayesian inference is usually intractable, so a common compromise is to take the single most
probable parameter under the posterior:

$$
\theta_{MAP} = \arg\max_{\theta} \left[ \log p(x \mid \theta) + \log p(\theta) \right]
$$

This is maximum likelihood plus a term from the prior. With a Gaussian prior of variance $1/\lambda$ on
the weights, that extra term is $\lambda w^{\top} w$ — **weight decay is MAP estimation with a Gaussian
prior**. A Laplace prior gives $L^1$ regularisation the same way.

## My take

The MAP result is the payoff of the section and it retroactively explains Chapter 7. Every norm penalty
in that chapter is a log-prior, and the coefficient is the prior's inverse variance. Practitioners tune
weight decay as though it were an arbitrary knob; it is a statement about how large the weights are
expected to be before any data arrives.

The reason the book does not pursue full Bayesian methods further is the integral. For a model with
millions of parameters it is hopeless, and every approximation — Laplace, variational, MC dropout, deep
ensembles — trades away most of what made the Bayesian treatment attractive. The authors are explicit
that Bayesian methods generalise better on small datasets and become impractical on large ones.

Worth noticing what MAP quietly gives up. It is a point estimate, so it discards the posterior *width* —
the model's own uncertainty about its parameters. That is the quantity a calibrated confidence interval
needs, and it is exactly what a trained network does not have. The persistent overconfidence of deep
classifiers on out-of-distribution inputs is this discarded information, and no amount of temperature
scaling recovers it.
