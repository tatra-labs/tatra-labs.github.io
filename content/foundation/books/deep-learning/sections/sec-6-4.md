# 6.4 Architecture Design

How many layers, how wide, and how connected. The book has one theorem and a great deal of honesty about
how little the theorem helps.

## The universal approximation theorem

A feedforward network with a single hidden layer, a squashing activation and enough units can approximate
any Borel measurable function from one finite-dimensional space to another to arbitrary accuracy. The
result extends to rectifiers. Any continuous function on a closed, bounded subset of $\mathbb{R}^n$ is in
scope.

The theorem says a network of sufficient size can **represent** the function. It does not say the
training algorithm will find it — optimisation may fail, or regularisation may select the wrong function
— and it gives no useful bound on the required size. In the worst case the number of hidden units is
exponential in the input dimension.

So the theorem settles the representational question and leaves every practical question open. The book
is direct about this: a single-layer network can represent anything, and may need infeasibly many units
to do it.

## Why depth instead

The counting arguments favour depth. A deep rectifier network divides input space into a number of linear
regions that grows **exponentially in depth** and only polynomially in width — the composition of layers
lets later layers reuse the folds made by earlier ones. There are also results exhibiting families of
functions that require exponentially many units in a shallow network but only polynomially many in a deep
one.

The statistical argument runs alongside the representational one. Choosing a deep model expresses a prior
belief that the target function is a composition of simpler functions, or that the problem is solved by a
sequence of steps. Empirically, test accuracy rises with depth on many tasks, and the book shows this is
not merely a parameter-count effect: adding parameters by widening helps much less than adding them by
deepening.

## Other considerations

Architecture is not only a chain of fully connected layers. Layers can be connected in other patterns —
the book mentions **skip connections** from layer $i$ to layer $i + 2$ or beyond, which ease gradient
flow, and specialised sparse connectivity, which is what Chapter 9 formalises for images.

## My take

The universal approximation theorem is the most over-cited result in the field, and this section is the
right corrective. It is an existence proof with no rate, and existence proofs with no rate are nearly
useless for engineering. It was also never the thing in dispute — the interesting question is which
functions are *cheap* to represent, and that is what the depth arguments address.

The skip-connection remark is a single sentence here and became one of the most important architectural
facts of the following decade. ResNet appeared the year before this book was published and is discussed
in Chapter 9 rather than here, and it is now hard to find a large model without residual connections. The
reason they matter is only partly gradient flow: they make the identity the default, so a layer must
actively learn to *change* its input rather than to reproduce it. That reframing is not in the book, and
it is what made networks of hundreds of layers trainable.

The depth-versus-width guidance also needs a caveat from the years since. Depth helps until it does not,
and beyond some point the returns are small. Modern large models are very wide and only moderately deep,
because width parallelises across devices and depth does not. The best architecture is now as much a
function of the interconnect as of the approximation theory.
