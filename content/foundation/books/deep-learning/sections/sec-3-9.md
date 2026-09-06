# 3.9 Common Probability Distributions

A catalogue. Rather than memorising the density functions, the useful reading is: what does each one
assume, and where does it appear in a neural network?

## The discrete ones

**Bernoulli** — a single binary variable with $P(\mathrm{x} = 1) = \phi$. This is the output distribution
of every binary classifier; a sigmoid unit produces its $\phi$.

**Multinoulli** (categorical) — a single discrete variable over $k$ states, parameterised by a vector in
the $k-1$ simplex. This is what a softmax layer produces, and what every token prediction is.

## The continuous ones

**Gaussian** — the default, for two reasons the book gives explicitly. The central limit theorem says
sums of many independent effects are approximately normal, and among all distributions with a given
variance, the Gaussian has **maximum entropy** — it inserts the least additional structure. Its density:

$$
\mathcal{N}(x; \mu, \sigma^2) = \sqrt{\frac{1}{2\pi\sigma^2}} \exp\left( -\frac{1}{2\sigma^2}(x - \mu)^2 \right)
$$

For repeated evaluation the authors prefer the **precision** $\beta = 1/\sigma^2$, since it avoids
dividing by the variance each time. The multivariate form uses a covariance matrix $\Sigma$, or a
precision matrix; an **isotropic** Gaussian has covariance proportional to the identity.

**Exponential and Laplace** — for densities with a sharp peak at a point. The exponential puts all mass
at $x \geq 0$; the Laplace places a sharp peak at an arbitrary $\mu$ and has heavier tails than a
Gaussian.

**Dirac delta** — $p(x) = \delta(x - \mu)$, all mass at a single point. It is a generalised function, not
an ordinary one. Its role is to build the **empirical distribution**, a mixture of $m$ Diracs at the
observed data points, each with mass $1/m$ — which is the distribution maximum likelihood is actually
matching in Section 5.5.

## Mixtures

A **mixture** combines components with a categorical latent variable choosing among them:

$$
P(x) = \sum_i P(c = i) P(x \mid c = i)
$$

The Gaussian mixture model is a **universal approximator of densities**: with enough components it
approximates any smooth density to arbitrary accuracy. Each component has its own mean and covariance,
and the constraints placed on those covariances — diagonal, isotropic, or full — are the main modelling
decision.

## My take

The maximum-entropy argument is the one to keep, because it inverts the usual complaint. "Assuming a
Gaussian" sounds like a strong assumption; the theorem says it is the *weakest* assumption compatible
with knowing a variance. That reframes the squared-error loss of Chapter 5 as the honest default rather
than a convenience.

Two things about the mixture section have aged into more importance than the book gives them. Mixtures
introduce a latent variable, which is the template for every model in Part III — and the specific claim
that a GMM approximates any density is a warning, not a reassurance. It is true, and modelling images
with one is still hopeless, because the number of components required grows with the dimension. Universal
approximation results say nothing about how many parameters are needed, a point Section 6.4.1 makes again
for networks.
