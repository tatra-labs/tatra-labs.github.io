# 2.8 Singular Value Decomposition

The SVD is the general-purpose decomposition. Where eigendecomposition needs a square matrix with
independent eigenvectors, the SVD applies to every real matrix without exception, and that unconditional
existence is why it is the one worth memorising.

## The factorisation

Every real $A \in \mathbb{R}^{m \times n}$ can be written

$$
A = U D V^{\top}
$$

with $U \in \mathbb{R}^{m \times m}$ orthogonal, $V \in \mathbb{R}^{n \times n}$ orthogonal, and
$D \in \mathbb{R}^{m \times n}$ diagonal — not necessarily square. The diagonal entries of $D$ are the
**singular values**; the columns of $U$ are the **left-singular vectors** and the columns of $V$ the
**right-singular vectors**.

The relationship to the previous section is direct. The left-singular vectors are the eigenvectors of
$A A^{\top}$, the right-singular vectors are the eigenvectors of $A^{\top} A$, and the nonzero singular
values of $A$ are the square roots of the nonzero eigenvalues of either product. Both products are
symmetric and positive semidefinite, so 2.7 applies to them even when it does not apply to $A$.

Geometrically the reading is the same three-step story as before, but honest about rectangularity: rotate
in the input space, scale each axis and change dimension, rotate in the output space.

## Why it matters

Because it always exists, the SVD is how the book defines the pseudoinverse in the next section — the
tool for the non-square and singular systems that 2.4 left unresolved. It also gives the numerically
sound definition of matrix rank (count the singular values above a tolerance) and of the condition number
(the ratio of largest to smallest).

## My take

The SVD is the most useful single object in Chapter 2 and the book's treatment is the thinnest it could
be. What is missing is the low-rank approximation theorem: truncating to the largest $k$ singular values
gives the best rank-$k$ approximation of $A$ in both Frobenius and spectral norm. That result is the
reason SVD appears in practice at all — PCA, latent semantic analysis, matrix completion, and every
compression scheme that talks about "the top components" is that theorem being applied.

It also has a direct modern echo the book could not have included. LoRA and the whole family of low-rank
adapters rest on the empirical claim that the *update* to a large weight matrix is close to low-rank, so
it can be stored as two thin factors instead of one dense matrix. The justification for why that is
lossless enough is exactly the truncation argument.
