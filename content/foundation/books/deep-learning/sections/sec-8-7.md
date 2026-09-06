# 8.7 Optimization Strategies and Meta-Algorithms

Techniques that are not optimisation algorithms themselves but change what the optimiser faces. The first
of them is the most important thing in Chapter 8.

## Batch normalisation

The book calls it one of the most exciting recent innovations in optimising deep networks, and describes
it as a method of **adaptive reparameterisation** rather than an optimisation algorithm.

The problem it solves is compositional. Gradient descent updates every layer simultaneously, under the
assumption that the other layers stay fixed — and they do not. In a deep chain, the update to layer one
changes the input distribution of layer two, whose own update was computed for the old distribution.
Second-order effects that a first-order method cannot see accumulate with depth, which is why very deep
networks require small learning rates.

Batch normalisation replaces each layer's activations $H$ with

$$
H' = \frac{H - \mu}{\sigma}
$$

using the mean and standard deviation computed over the current minibatch, and back-propagates through
the normalisation itself so the gradient can never simply increase the scale. The layer then learns
$\gamma H' + \beta$, restoring the ability to have any mean and variance — but now controlled by two
parameters instead of by the interaction of every weight below.

The book's observation is that this makes the model easier to learn even though it seems to reduce
expressive power: the new parameterisation has the same range of output distributions and a far better
conditioned learning problem. At test time, running averages collected during training replace the batch
statistics.

## The rest of the toolbox

**Coordinate descent** minimises with respect to one variable, or one block, at a time. It works well when
the variables separate cleanly and badly when they interact strongly.

**Polyak averaging** returns the average of the parameters visited along the trajectory rather than the
final point, which is provably strong on convex problems and used with an exponentially decaying average
in the non-convex case.

**Supervised pretraining** trains a simpler problem first and uses the result as a starting point.
Greedy layer-wise supervised pretraining is the example, along with the observation from **FitNets** that
a thin, deep student can be trained with the help of a wider teacher when it cannot be trained directly.

**Designing models to aid optimisation** is the strategy the book endorses most strongly: it is more
productive to choose a model family that is easy to optimise than to invent a better optimiser for a
difficult one. Modern networks are chosen to be locally near-linear for exactly this reason, and the book
cites linear paths and skip connections as design choices made for optimisation rather than for
representation.

**Continuation methods and curriculum learning** construct a sequence of easier objectives leading to the
target one, or present easier examples first.

## My take

The recommendation to design models for optimisation is the most valuable sentence in the chapter, and it
predicts the following decade accurately. Residual connections, layer normalisation, and attention all
succeeded partly because they made the optimisation problem easier, not because they represented anything
a previous architecture could not. The optimiser barely changed; the models changed to suit it.

Batch normalisation's *explanation* has not held up as well as the technique. The internal-covariate-shift
story given here was tested directly in later work and found not to be the mechanism — normalisation
helps by smoothing the loss landscape, and injecting distribution shift after normalising does not undo
the benefit. The description of it as adaptive reparameterisation is closer to right than the covariate-
shift framing that the section leans on.

Batch norm has also been substantially displaced. Its dependence on batch statistics is a real defect —
behaviour differs between training and inference, small batches give noisy estimates, and it is awkward
in recurrent and distributed settings. **Layer normalisation**, which normalises across features within a
single example, has none of those problems, and it is what every transformer uses. The idea in this
section won completely; the specific algorithm did not.

Polyak averaging is worth flagging as underrated. Its modern descendants — exponential moving averages of
weights, stochastic weight averaging, and the EMA teacher in self-supervised methods — are cheap and
reliably help, and they get far less attention than they deserve for a technique described here in one
paragraph.
