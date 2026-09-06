# 3.4 Marginal Probability

One rule, one page. Given a distribution over several variables, the distribution over a subset of them
is obtained by summing or integrating the others away.

## The sum rule

For discrete variables $\mathrm{x}$ and $\mathrm{y}$ with joint distribution $P(x, y)$,

$$
P(x) = \sum_y P(x, y)
$$

For continuous variables the sum becomes an integral:

$$
p(x) = \int p(x, y) \, dy
$$

The name comes from the practice of computing these totals in the margins of a table of joint
probabilities written out by hand.

## My take

The rule is trivial and the operation is not. Marginalisation is the central computational difficulty of
Part III, and it is worth attaching that fact to the definition now rather than being surprised by it in
Chapter 16.

The reason is combinatorial. Summing out one binary variable costs two terms; summing out $k$ of them
costs $2^k$. So the moment a model has a meaningful number of latent variables, the sum in this section
becomes intractable, and everything downstream is a response to that: the graph structure of Chapter 16
exists to make marginalisation factorise, the sampling methods of Chapter 17 approximate it by drawing
from the joint, and the variational methods of Chapter 19 replace it with an optimisation that bounds it.

The one place marginalisation stays cheap is where the model is *defined* by an ancestral factorisation
and nothing needs summing out — which is exactly the autoregressive setting. A language model never
marginalises; it applies the chain rule of 3.6 and evaluates each conditional directly. A great deal of
what made autoregressive models win over undirected ones is contained in that one asymmetry.
