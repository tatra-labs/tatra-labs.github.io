# 8.4 Parameter Initialization Strategies

The book is unusually candid here: initialisation strategies are simple, heuristic, and poorly
understood, and the only firm principle is one about symmetry.

## The one thing that is certain

Initialisation must **break symmetry**. If two hidden units in the same layer have identical inputs and
identical initial parameters, a deterministic learning rule updates them identically forever, and they
remain duplicates. Random initialisation is the cheap way to guarantee distinct units, and it is the
reason the initial weights are drawn from a distribution rather than set to a constant.

Weights are typically drawn from a Gaussian or uniform distribution; the book notes the choice between
them does not seem to matter much. The **scale** does matter, and it involves a genuine tension. Larger
weights break symmetry more effectively and propagate signal more strongly, but risk exploding values,
saturating activation functions, and — in recurrent networks — chaos, an extreme sensitivity to small
input perturbations.

## Heuristics for the scale

For a fully connected layer with $m$ inputs and $n$ outputs, sampling uniformly from
$\pm 1 / \sqrt{m}$ is one standard choice. The book gives the **normalised initialisation** of Glorot and
Bengio, which samples uniformly from

$$
\pm \sqrt{\frac{6}{m + n}}
$$

This is a compromise between keeping the variance of activations constant on the forward pass and keeping
the variance of gradients constant on the backward pass — the two goals give different answers, and the
formula splits the difference by using $m + n$.

The book flags an argument against these formulas: they assume the network is a chain of matrix
multiplications with no nonlinearity, which is not the case, and treating the scale as a hyperparameter
searched over is often better than trusting a formula.

**Sparse initialisation** is the alternative offered: give each unit exactly $k$ nonzero incoming weights,
so that the total input scale does not grow with layer width and each unit starts diverse. Its drawback
is that it imposes a strong prior on the units that begin with large weights, and can take a long time to
correct if those choices were wrong.

**Biases** are usually set to zero, with exceptions the book lists — a bias matching the marginal output
statistics for an output unit, a small positive bias such as $0.1$ for ReLU units to keep them active
initially, and a bias of $1$ on an LSTM forget gate so that the cell begins by remembering.

## My take

The Glorot formula was derived for $\tanh$ networks, and the correction that followed matters more in
practice than the formula itself. **He initialisation** uses a variance of $2/m$ rather than $1/m$,
because a rectifier zeroes half its inputs and so halves the variance passed forward; without the factor
of two, activations shrink layer by layer and a deep rectifier network fails to train. The book was
written after that result and does not include it, which is one of the few places where it is simply
behind.

The advice to treat the scale as a hyperparameter is sound and rarely followed, mostly because the
defaults are now good enough that the question does not arise. What replaced careful initialisation is
**normalisation** — batch, layer, and RMS norm all make the network far less sensitive to the initial
scale by rescaling activations at every layer, which is a more robust fix than getting the initial draw
right. Section 8.7.1 covers batch normalisation and does not quite make this connection, but the reason
initialisation research went quiet after 2016 is that normalisation absorbed the problem.

The forget-gate bias of $1$ is a small detail worth remembering. It is a case where a single scalar,
chosen for a reason specific to the architecture, makes the difference between a model that learns
long-range structure and one that does not.
