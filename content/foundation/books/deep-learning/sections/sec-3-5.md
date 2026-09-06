# 3.5 Conditional Probability

The definition is one line. The caveat the book attaches to it is the reason the section is worth
reading.

## The definition

The probability of $\mathrm{y} = y$ given that $\mathrm{x} = x$ has already been observed is

$$
P(y \mid x) = \frac{P(y, x)}{P(x)}
$$

This is defined only when $P(x) > 0$. Conditioning on an event that cannot happen is not a limiting case
to be handled carefully; it is undefined.

## Conditioning is not intervening

The authors flag, briefly but explicitly, a confusion that this notation invites: computing the
consequences of an *action* is not the same as conditioning on an observation. Observing that people who
take a medicine recover more often tells you $P(\text{recover} \mid \text{took medicine})$. It does not
tell you what happens if you *give* the medicine to someone, because the people who took it may differ
from those who did not in ways that also affect recovery.

That second question is an **intervention query**, and the book places it firmly outside its scope,
under causal modelling.

## My take

This is a two-sentence aside in the book and it deserves more weight, because supervised learning is
conditional probability estimation and nothing else. A trained classifier reports
$p(y \mid x)$ under the distribution that produced its training data. Every failure mode grouped under
"spurious correlation" or "shortcut learning" is this section being ignored: the model found a genuine
conditional dependence that does not survive intervention or a shift in how the data was collected.

The practical form of the warning: a model's output is a statement about the world *as sampled*, never
about the world *as acted upon*. A credit model conditioned on postcode is reporting a real conditional
probability. Deploying it is an intervention, and the section that would justify that step is not in this
book.
