# 2.6 Special Kinds of Matrices and Vectors

A short catalogue of structured matrices. Structure buys two things — cheaper operations and stronger
guarantees — and each entry here is used somewhere later in the book.

## The catalogue

A **diagonal** matrix has nonzero entries only on the main diagonal. Writing $\operatorname{diag}(v)$ for
the square diagonal matrix with vector $v$ on the diagonal, multiplication becomes an elementwise
product:

$$
\operatorname{diag}(v) x = v \odot x
$$

Inversion is equally cheap — invert each entry — and exists exactly when every $v_i$ is nonzero. Storing
$n$ numbers instead of $n^2$ and computing in $O(n)$ instead of $O(n^2)$ is why diagonal approximations
appear everywhere in optimisation. Non-square diagonal matrices have no inverse, but multiplying by one
is still cheap: it scales, then either pads with zeros or truncates.

A **symmetric** matrix satisfies $A = A^{\top}$. These arise whenever an entry describes a relationship
with no direction — a distance matrix, a covariance, the Hessian of a twice-differentiable function.

A **unit vector** has $\lVert x \rVert_2 = 1$. Two vectors are **orthogonal** when $x^{\top} y = 0$, and
**orthonormal** when they are additionally unit vectors. In $\mathbb{R}^n$ at most $n$ vectors can be
mutually orthogonal with nonzero norm.

An **orthogonal matrix** is a square matrix whose rows *and* columns are each mutually orthonormal:

$$
A^{\top} A = A A^{\top} = I
$$

which gives the property the book cares about:

$$
A^{-1} = A^{\top}
$$

The inverse costs a transpose. Orthogonal transformations also preserve $L^2$ norms and angles — they
rotate and reflect, and never stretch.

## My take

Two of these matter far beyond this chapter, for opposite reasons.

**Diagonal structure** is the workhorse approximation of Chapter 8. Adam, RMSProp and AdaGrad all
maintain a diagonal estimate of curvature because the full matrix is quadratic in the parameter count,
and neural networks have too many parameters for that to be representable, let alone invertible. Every
adaptive optimiser in wide use is a bet that the diagonal captures enough.

**Orthogonality** matters because norm preservation is exactly what a recurrent network needs and does
not have. Chapter 10's vanishing-gradient analysis is a statement about repeated multiplication by a
matrix whose eigenvalues are not on the unit circle; were the recurrent weight matrix orthogonal, the
gradient magnitude would survive arbitrarily many steps. Orthogonal initialisation and the various
unitary-RNN proposals all descend from that observation.

The naming is a genuine trap, though: an "orthogonal matrix" requires orthonormal columns, not merely
orthogonal ones. The term is standard, it is wrong, and the book adopts it without comment.
