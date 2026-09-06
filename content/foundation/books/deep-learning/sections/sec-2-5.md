# 2.5 Norms

Norms are how a vector gets a size, and the choice of norm is a modelling decision rather than a
convention. The book introduces the family, then spends most of the section on the differences that
actually matter in optimisation.

## The family

The $L^p$ norm, for $p \in \mathbb{R}$ and $p \geq 1$, is

$$
\lVert x \rVert_p = \left( \sum_i \lvert x_i \rvert^p \right)^{1/p}
$$

A norm is any function satisfying three properties: it is zero only at the origin, it obeys the triangle
inequality $f(x + y) \leq f(x) + f(y)$, and it is absolutely homogeneous, with
$f(\alpha x) = \lvert \alpha \rvert f(x)$.

**$L^2$**, the Euclidean norm, is written $\lVert x \rVert$ with the subscript dropped. In practice the
**squared** $L^2$ norm $x^{\top} x$ is used instead, because its derivative with respect to a given
element depends only on that element, while the derivative of $\lVert x \rVert_2$ depends on the whole
vector.

**$L^1$** matters when the difference between zero and near-zero matters. The squared $L^2$ norm grows
very slowly near the origin, so it barely distinguishes a coordinate at $0$ from one at $\epsilon$; the
$L^1$ norm grows at rate $1$ everywhere, and every unit of movement away from zero costs the same. That
is the whole reason $L^1$ induces sparsity and $L^2$ does not.

**$L^{\infty}$**, the max norm, reduces to the largest absolute element, $\max_i \lvert x_i \rvert$.

For matrices the analogue is the **Frobenius norm**, the square root of the sum of squared entries —
which is the $L^2$ norm applied to a flattened matrix.

## The name that is wrong

Counting nonzero entries is often called the $L^0$ norm. It is not a norm: scaling a vector by any
nonzero $\alpha$ does not change the count, so absolute homogeneity fails. The $L^1$ norm is the standard
stand-in, and the book flags this misuse explicitly.

## The other reading of the dot product

$$
x^{\top} y = \lVert x \rVert_2 \lVert y \rVert_2 \cos \theta
$$

with $\theta$ the angle between the vectors — the bridge from algebra to geometry, and the reason cosine
similarity is written the way it is.

## My take

The $L^1$-versus-$L^2$ contrast is the most transferable idea in Chapter 2, and it is worth holding in
geometric form rather than algebraic form: the $L^1$ ball has corners on the axes, and a constrained
optimum tends to land on a corner. Section 7.1 rederives this analytically, and it is much harder to
remember that way.

One thing the section understates: the squared $L^2$ norm is preferred for computational convenience,
and that convenience has a cost. It is not a norm — it violates the triangle inequality — so it should
not be used anywhere norm properties are being relied on rather than merely differentiated.
