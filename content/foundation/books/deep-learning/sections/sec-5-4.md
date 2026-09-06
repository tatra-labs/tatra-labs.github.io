# 5.4 Estimators, Bias and Variance

The statistical vocabulary for talking about what an estimate is worth. Four concepts, and one
decomposition that connects them to Section 5.2.

## Point estimation

A **point estimator** is any function of the data producing a best guess at a quantity — a parameter, a
vector of parameters, or a whole function. Writing $\theta$ for the true value and $\hat\theta_m$ for
the estimate from $m$ examples,

$$
\hat\theta_m = g\left( x^{(1)}, \ldots, x^{(m)} \right)
$$

The definition places no requirement on $g$ beyond being a function of the data, so a good estimator is
just one whose output is close to $\theta$. Since the data are random, $\hat\theta_m$ is a random
variable, while $\theta$ is a fixed unknown constant in the frequentist view.

**Function estimation** is the same idea with the target a function rather than a number, which is what
supervised learning does.

## Bias

$$
\operatorname{bias}(\hat\theta_m) = \mathbb{E}\left[ \hat\theta_m \right] - \theta
$$

An estimator is **unbiased** when this is zero, and **asymptotically unbiased** when it tends to zero as
$m$ grows. The book's canonical examples: the sample mean is unbiased for a Gaussian mean; the sample
variance using $1/m$ is biased, while the version using $1/(m-1)$ is unbiased.

## Variance and standard error

The **variance** of an estimator measures how much it changes if the data are resampled; its square root
is the **standard error**. For the sample mean the standard error is $\sigma / \sqrt{m}$, which is why
error bars on a test-set accuracy shrink only as the square root of the number of test examples.

## The trade-off

Bias and variance measure two different kinds of error, and the natural way to combine them is the mean
squared error:

$$
\operatorname{MSE} = \operatorname{bias}(\hat\theta_m)^2 + \operatorname{Var}(\hat\theta_m)
$$

Minimising MSE therefore trades one against the other. This is the same phenomenon as Section 5.2 seen
through a different lens: increasing capacity tends to reduce bias and increase variance, and the
U-shaped generalisation curve is this decomposition plotted.

## Consistency

An estimator is **consistent** if it converges in probability to the true value as $m \to \infty$.
Consistency implies asymptotic unbiasedness; the reverse does not hold.

## My take

The bias-variance decomposition is real mathematics and is routinely applied where it does not belong.
It is exact for squared error and does not decompose cleanly for 0-1 loss or cross-entropy, so the
familiar picture is a story about regression that has been generalised by analogy.

More importantly, the modern overparameterised regime does not behave the way the trade-off suggests. A
network with far more parameters than examples should be dominated by variance and often is not; that is
the double-descent observation again. The decomposition stays valid as an identity, but "add capacity,
get variance" fails as a prediction, because capacity as measured by parameter count is not the quantity
that controls variance in these models.

What remains reliably useful is the standard error. Comparing two models that differ by 0.3% on a
10,000-example test set is comparing numbers whose standard error is around 0.5%, and this section is
where the arithmetic to notice that comes from. Section 11.1 makes the same point in applied form and it
is ignored just as often.
