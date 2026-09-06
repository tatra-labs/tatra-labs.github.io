# 2.7 Eigendecomposition

Decomposition is the organising idea of the second half of Chapter 2: break a matrix into parts that
reveal properties invisible in the array of numbers. Eigendecomposition is the first and most restricted
of these.

## Eigenvectors and the decomposition

An **eigenvector** of a square matrix $A$ is a nonzero vector $v$ that $A$ only rescales:

$$
A v = \lambda v
$$

with $\lambda$ the corresponding **eigenvalue**. Eigenvectors are defined up to scale, so by convention
only unit eigenvectors are considered.

If $A$ has $n$ linearly independent eigenvectors, collecting them as columns of $V$ and their eigenvalues
into a vector $\lambda$ gives

$$
A = V \operatorname{diag}(\lambda) V^{-1}
$$

The matrix, read this way, is a change of basis, a per-axis scaling, and a change back.

Not every matrix has one. The decomposition may involve complex numbers, and it may not exist at all. The
book therefore restricts attention to the case it needs: every **real symmetric** matrix decomposes as

$$
A = Q \Lambda Q^{\top}
$$

with $Q$ orthogonal and $\Lambda$ diagonal and real. The decomposition is not unique when eigenvalues
repeat — any orthonormal basis of that eigenspace will do.

## What the eigenvalues tell you

$A$ is **singular** exactly when some eigenvalue is zero. The signs classify the matrix: all positive is
**positive definite**, all non-negative is **positive semidefinite**, all negative is **negative
definite**, all non-positive negative semidefinite.

The definitions earn their keep through the quadratic form $f(x) = x^{\top} A x$ restricted to unit $x$.
Its maximum is the largest eigenvalue and its minimum the smallest; positive semidefinite guarantees
$x^{\top} A x \geq 0$ everywhere, and positive definite additionally forces $x^{\top} A x = 0$ only at
$x = 0$.

## My take

Skip nothing here, because Section 4.3 and all of Chapter 8 are this section applied to the Hessian. The
condition number in 4.2, the saddle-point argument in 8.2, the Newton step in 8.6 — each is a statement
about the eigenvalues of a real symmetric matrix, and each is opaque without the quadratic-form reading.

One caution the book gives and readers routinely ignore: the guarantee of a clean real orthogonal
eigendecomposition applies to *symmetric* matrices. A neural network's weight matrix is not symmetric, so
the intuition built here does not transfer to it directly. That gap is exactly what the next section
fills.
