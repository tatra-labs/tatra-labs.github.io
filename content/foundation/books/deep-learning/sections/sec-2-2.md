# 2.2 Multiplying Matrices and Vectors

Matrix multiplication is defined here in its index form, and the definition is worth holding onto because
two other products in the book look similar and are not the same thing.

## Three products that look alike

The **matrix product** of $A \in \mathbb{R}^{m \times n}$ and $B \in \mathbb{R}^{n \times p}$ is
$C \in \mathbb{R}^{m \times p}$ with

$$
C_{i,j} = \sum_k A_{i,k} B_{k,j}
$$

Note what this is not: it is not the elementwise product of $A$ and $B$. That is the **Hadamard product**,
written $A \odot B$, and it requires the two matrices to have the same shape. The **dot product** of two
vectors of equal size is the special case $x^{\top} y$, a matrix product whose result is $1 \times 1$.

The shape rule is the whole content of the definition: the inner dimensions must agree, and the outer
dimensions survive.

## Properties, and the one that fails

Matrix multiplication is distributive and associative:

$$
A(B + C) = AB + AC
$$

$$
A(BC) = (AB)C
$$

It is **not** commutative — $AB \neq BA$ in general, and often the shapes make $BA$ undefined at all. The
dot product of two vectors is the exception; $x^{\top} y = y^{\top} x$, which follows because the result
is a scalar and a scalar equals its own transpose. The transpose of a product reverses the order:

$$
(AB)^{\top} = B^{\top} A^{\top}
$$

## Why this section exists

The payoff is that a system of linear equations

$$
A x = b
$$

compresses $m$ separate equations in $n$ unknowns into one line. The next several sections — inverses,
span, singularity — are about when this equation has a solution and how to find it, and none of it is
readable without the compact form.

## My take

The associativity law is doing more work in deep learning than it appears to here. Choosing where to put
the parentheses in a chain of matrix products is a real optimisation: computing $(AB)C$ versus $A(BC)$
can differ by orders of magnitude in FLOPs when the intermediate shapes differ, and this is precisely
what back-propagation exploits when it multiplies Jacobians right-to-left rather than left-to-right. A
law that reads like a triviality in Chapter 2 turns out to be the reason reverse-mode differentiation is
cheap in Chapter 6.

The other thing worth flagging: $\odot$ and plain juxtaposition are visually similar and semantically
unrelated. When reading the LSTM equations in Chapter 10, the difference between them is the difference
between a gate and a linear layer.
