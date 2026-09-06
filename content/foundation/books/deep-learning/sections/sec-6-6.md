# 6.6 Historical Notes

A short closing section, and the most useful thing in it is a claim about why feedforward networks
improved between 1986 and 2016.

## The sequence

The core ideas are old. Linear models trace to the seventeenth century, and gradient descent to
techniques developed alongside them. Efficient application of the chain rule dates to the 1960s and 1970s
in control theory and automatic differentiation. Back-propagation applied to neural networks was proposed
in the 1980s and popularised by Rumelhart, Hinton and Williams in 1986.

Then interest declined through the 1990s and 2000s, and returned around 2006. The book's central
historical claim is deflationary and precise: the algorithms of 2016 were essentially those of 1986, and
the results improved for two reasons.

## The two reasons

**Larger datasets** reduced how much generalisation the algorithm itself had to supply.

**Larger models** became feasible because of hardware — faster processors, the shift to GPUs, and better
software infrastructure.

The book then names a small number of algorithmic changes that genuinely mattered, and the list is
notably short:

- Replacing mean squared error with **cross-entropy** as the loss family, which improved models with
  sigmoid and softmax outputs. MSE had been standard through the 1980s and 1990s.
- Replacing sigmoid hidden units with **piecewise-linear** ones, above all the rectifier. Rectified
  linear units were resisted for a long time because non-differentiability at zero was thought
  disqualifying, and because of a general preference for units that resemble biological neurons.
- The book adds a note on origins: rectifiers appear in early neural network work, were reintroduced
  around 2009 and became widespread after 2011.

## My take

The two-reason argument is the one to keep, and it has held up. The most reliable predictor of a model's
capability over the last decade has been how much compute and data went into it, and the second most
reliable has been the architecture — with the loss function and optimiser barely moving. That is
uncomfortable if you value ideas over resources, and it is what the evidence shows.

The rectifier story is worth reading as a case study in how a field can be wrong for a long time for
respectable reasons. The objection was theoretical — a non-differentiable point in the activation — and
it was decisive for two decades. It turned out not to matter at all, for reasons Section 6.3 gives, and
nobody could have established that except by trying it. The comparable current example is that most
architectural preferences are supported by arguments of exactly this quality, and it takes a decade to
find out which ones were real.

One thing the section could not anticipate: the third reason, arriving after publication, was
**architecture** rather than scale alone. The transformer changed what could be parallelised, and so
changed what scale was reachable — which is really a hardware argument again, but one made through the
model rather than around it.
