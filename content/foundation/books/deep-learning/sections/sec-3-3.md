# 3.3 Probability Distributions

The definitions of PMF and PDF, side by side. The reason to read them side by side is one asymmetry that
trips up almost every reader once.

## Discrete: the probability mass function

A PMF $P$ maps states to probabilities and must satisfy three conditions: its domain is the set of all
possible states of $\mathrm{x}$; every value lies in $[0, 1]$, with $0$ meaning impossible and $1$
meaning certain; and the values sum to one,

$$
\sum_x P(x) = 1
$$

The last is **normalisation**, and without it a function of the right shape can still assign arbitrarily
large or negative mass. The uniform distribution over $k$ states, $P(x) = 1/k$, is the simplest example
satisfying all three.

A PMF may act on several variables at once, written $P(x, y)$ — a **joint** probability distribution.

## Continuous: the probability density function

A PDF $p$ must have the right domain, must satisfy $p(x) \geq 0$ everywhere, and must integrate to one:

$$
\int p(x) \, dx = 1
$$

Here is the asymmetry: $p(x)$ is **not** required to be at most $1$. A density is not a probability. It
gives probability only when integrated over a region — the mass in an infinitesimal region of volume
$\delta x$ is approximately $p(x) \delta x$. A distribution concentrated on a narrow interval has density
far above $1$ inside it, and this is not a contradiction.

For a uniform density on $[a, b]$, $u(x; a, b) = 1/(b - a)$, which exceeds $1$ whenever the interval is
shorter than one unit.

## My take

The density-is-not-a-probability point is worth over-learning, because it explains two things that
otherwise look like bugs. A continuous log-likelihood can be **positive** — a well-fit model on tightly
clustered data legitimately reports positive log-likelihood per dimension, and nothing is wrong. And
likelihoods under different parameterisations are not comparable, because rescaling the variable
rescales the density; that is the change-of-variables correction in 3.12, and it is the reason bits-per-
dimension is reported instead of raw likelihood when generative image models are compared.

Continuous probability has one more trap the book only addresses in 3.12: every individual point has
probability zero. Saying a Gaussian "predicted" a particular real number is a statement about density,
never about probability.
