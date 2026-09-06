# 6.5 Back-Propagation and Other Differentiation Algorithms

The section that explains the algorithm every framework implements. It is longer than it needs to be for
a reader who only wants to use autodiff, and exactly right for one who wants to know why it costs what it
costs.

## What back-propagation is, and is not

**Forward propagation** runs input through the network to produce an output and a cost.
**Back-propagation** computes the gradient of the cost with respect to the parameters by flowing
information backwards through the same graph.

The book insists on a clarification that is routinely muddled: back-propagation is *only* the gradient
computation. It is not a learning algorithm. Stochastic gradient descent is the learning algorithm, and
it consumes the gradient back-propagation supplies. Nor is it specific to neural networks — it computes
derivatives of any function expressible as a computational graph.

## The mechanism

Computation is represented as a **computational graph**, with nodes for variables and edges for
operations. Differentiation is the chain rule applied along that graph. For $y = g(x)$ and $z = f(y)$ in
the vector case:

$$
\nabla_x z = \left( \frac{\partial y}{\partial x} \right)^{\top} \nabla_y z
$$

Back-propagation is this Jacobian-vector product performed at each node, from output back to input.

The essential engineering point is **avoiding recomputation**. A naive recursive application of the chain
rule re-evaluates shared subexpressions an exponential number of times; back-propagation stores each
intermediate result once and reuses it. That is a memory-for-time trade, and it is why training memory
scales with the depth of the network and the size of its activations rather than with the parameter count
alone.

The cost is the headline result: computing the gradient costs about the same as computing the forward
pass — roughly one multiply-add per edge of the graph, so both are linear in the number of edges.

The book also distinguishes **symbol-to-number** differentiation, which takes a graph and numerical
inputs and returns numbers, from **symbol-to-symbol**, which adds derivative nodes to the graph itself
and returns a new graph. The second is more general, since running the procedure on its own output gives
higher-order derivatives, and it is what modern frameworks do.

## Beyond first order

Higher-order derivatives get a brief treatment. The Hessian of a network with $n$ parameters has $n^2$
entries, which is not representable at realistic scale. The practical alternative is **Krylov methods**,
which need only Hessian-vector products, and a Hessian-vector product can be computed with two
back-propagation passes without ever forming the matrix.

## My take

The cost result is the reason deep learning is feasible at all, and its significance is easy to miss when
stated as a complexity bound. Reverse-mode differentiation computes the gradient of one scalar with
respect to millions of inputs for the price of a single forward pass. Forward mode would cost one pass
*per parameter*. The asymmetry comes from the shape of the problem — many inputs, one output — and it is
the associativity of matrix multiplication from Section 2.2 being exploited by choosing the cheaper
parenthesisation.

The memory trade is the part that shows up in practice, because it is what fills a GPU. Every activation
from the forward pass must be kept until its gradient is consumed. Gradient checkpointing — discarding
some activations and recomputing them during the backward pass — is the standard response, and it is this
section's trade-off deliberately run in reverse to buy memory with time.

What has changed since publication is that nobody derives back-propagation by hand any more, and the
authors half-anticipate this by treating symbol-to-symbol differentiation as the more general approach.
Understanding the algorithm is still worth the time, but for debugging and cost estimation rather than
for implementation.
