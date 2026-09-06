# 9.1 The Convolution Operation

The chapter starts from the mathematical definition rather than from images, which makes the later
architectural choices read as consequences rather than conventions.

## The definition

Convolution is an operation on two functions:

$$
s(t) = \int x(a) w(t - a) \, da
$$

written $s = x \ast w$. The book motivates it with a sensor producing a noisy position reading $x(t)$,
smoothed by a weighting function $w(a)$ that gives more weight to recent measurements. The first argument
is the **input**, the second the **kernel**, and the output is often called a **feature map**.

For discrete time the integral becomes a sum, and for a two-dimensional image $I$ with a
two-dimensional kernel $K$:

$$
S(i, j) = \sum_m \sum_n I(m, n) K(i - m, j - n)
$$

## Flipping, and the operation actually implemented

Convolution is commutative, and the reason is that the kernel is **flipped** relative to the input — as
$m$ increases, the index into the input increases while the index into the kernel decreases. Commutativity
is useful for proofs and irrelevant for implementation.

Most libraries therefore implement **cross-correlation**, which is the same sum without the flip:

$$
S(i, j) = \sum_m \sum_n I(i + m, j + n) K(m, n)
$$

and call it convolution. The book adopts the same convention. The distinction does not matter for a
learned kernel, since the network simply learns the flipped version of whichever filter it needs.

## As a matrix operation

Discrete convolution can be written as multiplication by a matrix, but the matrix has constraints: in one
dimension it is **Toeplitz**, with each row a shifted copy of the previous one, and in two dimensions it
is doubly block circulant. That matrix is very sparse, because the kernel is much smaller than the input,
and its entries are heavily repeated.

## My take

The Toeplitz observation is the single most clarifying idea in the chapter, and it is easy to skim past.
**A convolutional layer is a fully connected layer with two constraints imposed on its weight matrix**:
most entries are forced to zero, and the remaining ones are forced to be equal in a specific pattern. In
the vocabulary of Chapter 7 this is a sparsity constraint plus parameter sharing — both hard rather than
penalised, and both stated in the architecture rather than in the loss.

That framing makes the next section's three benefits predictable rather than surprising, and it explains
why a convolutional network can outperform a fully connected one on images despite being a strict subset
of it. The constraint is prior knowledge, and correct prior knowledge is worth more than capacity.

The flipping point is worth internalising for a smaller reason: it is the most common source of confusion
when reading convolution code against a textbook derivation. Every framework's `conv2d` computes
cross-correlation. Nothing in this book, or in almost any paper, depends on the difference.
