# 7.9 Parameter Tying and Parameter Sharing

Norm penalties express a preference for parameters near zero. This section generalises the idea: express
a preference for parameters near *each other*.

## Tying

Suppose two models perform closely related tasks on similar inputs, with parameters $w^{(A)}$ and
$w^{(B)}$. If the tasks are similar enough that the parameters should be close, that belief can be
imposed as a penalty:

$$
\Omega\left( w^{(A)}, w^{(B)} \right) = \lVert w^{(A)} - w^{(B)} \rVert_2^2
$$

Any distance could serve; L2 is the usual choice. This is **parameter tying** — a soft constraint, with a
coefficient controlling how firmly it binds.

## Sharing

The stronger version forces sets of parameters to be **equal**. Only one copy exists in memory, which is
the significant practical difference: sharing reduces the memory footprint of the model, while tying does
not.

The book's dominant example is the **convolutional neural network**. A CNN shares one set of weights
across every spatial position, encoding the belief that a feature useful at one location is useful at
another. The saving is large: a convolutional layer detecting an edge anywhere in an image uses the
parameters of a single small filter rather than one detector per position. The authors note that this
allows CNNs to have dramatically lower parameter counts than fully connected networks of comparable
capability, and that the resulting statistical efficiency comes from the same source — each shared
parameter is estimated from every position in every image.

## My take

The reframing matters more than either technique. A regulariser is a statement of prior belief, and this
section makes the point that the belief need not be "parameters are small". It can be "these parameters
are the same", which is a far stronger and far more useful assumption when it is true.

That is the right way to understand every architecture in Part II. Convolution is weight sharing across
space. A recurrent network is weight sharing across time — the same transition matrix applied at every
step, which is what makes a variable-length sequence tractable at all. Attention is weight sharing across
position in a different form again, with the same projection matrices applied to every token. In each
case the architecture is the regulariser, and it is a much more effective one than any penalty in this
chapter, because it rules out the wrong functions completely rather than merely discouraging them.

The memory point is worth keeping too, since it explains a modern practice the book predates. **Tied
embeddings** — using the same matrix for input token embedding and output projection in a language model
— saves a large fraction of the parameters in a small model and slightly improves quality. The
justification is exactly the argument here: the two matrices are doing related jobs, so force them to be
one.

The soft version, tying rather than sharing, has largely fallen out of use. It has the cost of the
constraint without the memory saving, and if two things are similar enough to tie, they are usually
similar enough to share.
