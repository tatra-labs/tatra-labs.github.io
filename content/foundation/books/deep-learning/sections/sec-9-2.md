# 9.2 Motivation

Three properties, presented as the reasons convolution is worth using. They are the clearest statement in
the book of what it means for an architecture to encode a prior.

## Sparse interactions

A fully connected layer has a separate parameter for every input-output pair. A convolutional layer uses
a kernel much smaller than the input, so each output depends on only a few inputs.

The saving is quantitative. With $m$ inputs and $n$ outputs, a dense layer costs $m \times n$ parameters
and the same order of runtime. Restricting each output to $k$ inputs makes both $k \times n$, and $k$ can
be smaller than $m$ by several orders of magnitude — thousands of pixels versus a kernel of tens.

Sparse connectivity does not mean limited reach. Units in deeper layers have a **receptive field** larger
than the kernel, because each depends on several units below, which each depend on several more. Depth
recovers global interactions from local ones.

## Parameter sharing

The same kernel is used at every position, so a parameter is learned once and applied everywhere. A dense
layer uses each weight exactly once per forward pass; a convolutional layer reuses each one at every
location.

This reduces storage from $m \times n$ to $k$ without changing the runtime of the forward pass, and it is
a large factor: the book's example gives a convolution with a kernel of a few parameters where the dense
equivalent would need billions.

## Equivariance to translation

Parameter sharing gives the layer a specific structural property: **equivariance** to translation. If the
input shifts, the output shifts by the same amount. Formally, $f$ is equivariant to $g$ when
$f(g(x)) = g(f(x))$.

This is exactly right for images, where a feature detector useful at one location is useful at another.
The book is careful that convolution is *not* naturally equivariant to other transformations — rotation
and scaling require different mechanisms.

## The fourth benefit

Convolution also permits **variable-sized inputs**, which a fixed-shape dense layer cannot accept. A
kernel is applied wherever it fits, so the same layer processes images of different sizes, producing
correspondingly different output sizes.

## My take

The distinction between **equivariance** and **invariance** is the one to get right, and the terms are
constantly swapped in casual use. Convolution is equivariant: move the input, the feature map moves with
it. Pooling in 9.3 introduces invariance: move the input a little, the output does not change. The two
are different properties and they are wanted at different points in the network — equivariance in the
middle, where spatial information must be preserved, and invariance at the end, where only the class
matters.

The parameter-sharing argument is also the honest answer to why convolutional networks work on images and
transformers now often work better despite discarding the prior. A prior helps when data is scarce and
costs capability when data is abundant, because the assumption is only approximately true. Vision
transformers, which have no translation prior, lose to convolutional networks on small datasets and win
on very large ones — the crossover being precisely where the data supplies what the prior was
substituting for.

Worth noticing that the sparse-interactions argument is really about depth. Local connectivity plus depth
gives large receptive fields, and that is the same compositional argument as Section 6.4. Attention takes
the opposite route: a global receptive field in one layer, at quadratic cost.
