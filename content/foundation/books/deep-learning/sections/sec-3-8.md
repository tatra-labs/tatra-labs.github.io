# 3.8 Expectation, Variance and Covariance

Three summary statistics, and one warning about the third that is repeated in every statistics course
because it keeps being ignored.

## Expectation

The **expectation** of $f(x)$ under a distribution is the average value it takes when $x$ is drawn from
that distribution — a sum in the discrete case, an integral in the continuous one:

$$
\mathbb E_{x \sim P}[f(x)] = \sum_x P(x) f(x)
$$

Expectations are **linear**, which is the property that gets used:

$$
\mathbb{E}[\alpha f(x) + \beta g(x)] = \alpha \mathbb{E}[f(x)] + \beta \mathbb{E}[g(x)]
$$

This holds whether or not $f$ and $g$ are independent, and it is what licenses minibatch training: the
gradient of a sum is the sum of gradients, so an average over a random subset is an unbiased estimate of
the average over the whole set.

## Variance and covariance

**Variance** measures spread:

$$
\operatorname{Var}(f(x)) = \mathbb{E}\left[ (f(x) - \mathbb{E}[f(x)])^2 \right]
$$

Its square root is the standard deviation. **Covariance** measures how two quantities vary together:

$$
\operatorname{Cov}(f(x), g(y)) = \mathbb{E}\left[ (f(x) - \mathbb{E}[f(x)]) (g(y) - \mathbb{E}[g(y)]) \right]
$$

High absolute covariance means both deviate far from their means simultaneously; the sign says whether
they move together or oppositely. For a vector, the **covariance matrix** collects all pairs, with the
variances on its diagonal, and it is symmetric and positive semidefinite.

## The warning

Independence implies zero covariance. **Zero covariance does not imply independence.** Covariance detects
only linear dependence. The book's example: let $x$ be uniform on $[-1, 1]$ and let $s$ be $\pm 1$ with
equal probability, independent of $x$; set $y = sx$. Then $x$ and $y$ are clearly dependent — the
magnitude of one determines the magnitude of the other — yet their covariance is zero.

## My take

The linearity of expectation is the quiet workhorse of the entire book. Stochastic gradient descent,
dropout's interpretation as an ensemble average, the REINFORCE estimator, and every Monte Carlo method in
Chapter 17 rest on it.

The covariance warning has a modern edge the book does not draw. Decorrelating features is not the same
as disentangling them, and a method that only removes linear dependence — PCA whitening, or a loss
penalising off-diagonal covariance — has not made the factors independent. Section 15.3 wants
independence and can only measure correlation, and that gap is a large part of why disentanglement
remains unsolved.
