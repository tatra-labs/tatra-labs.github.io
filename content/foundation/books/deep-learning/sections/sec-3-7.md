# 3.7 Independence and Conditional Independence

Two definitions that look almost identical and behave completely differently. The distinction is what
makes graphical models possible.

## The two definitions

Variables $\mathrm{x}$ and $\mathrm{y}$ are **independent**, written $\mathrm{x} \perp \mathrm{y}$, when
the joint factorises unconditionally:

$$
p(x, y) = p(x) p(y)
$$

They are **conditionally independent given $\mathrm{z}$**, written
$\mathrm{x} \perp \mathrm{y} \mid \mathrm{z}$, when the factorisation holds within each value of
$\mathrm{z}$:

$$
p(x, y \mid z) = p(x \mid z) p(y \mid z)
$$

Neither implies the other. Two variables can be dependent and become independent once a common cause is
observed, and two independent variables can become dependent once a common effect is observed.

## My take

Conditional independence is the most useful idea in Chapter 3 and the definition above makes it look
like a technicality. It is not — it is the *only* thing that makes high-dimensional probability
tractable, and the argument is a counting argument.

A joint distribution over $n$ binary variables has $2^n - 1$ free parameters. Section 16.1 opens with
exactly this observation. Every practical model attacks that number by asserting conditional
independences: naive Bayes assumes the features are conditionally independent given the label, a Markov
chain assumes the future is conditionally independent of the past given the present, a convolutional
layer assumes distant pixels are conditionally independent given intermediate features. In each case a
structural assumption converts an exponential parameter count into a linear one.

The direction that catches people out is the second one — independent variables becoming dependent under
conditioning. If a burglary and an earthquake independently trigger an alarm, then hearing the alarm
makes them dependent: learning it was an earthquake explains away the burglary. This is why an undirected
graph cannot represent everything a directed one can, and it is the reason Section 16.2 needs both
formalisms rather than picking the more convenient one.
