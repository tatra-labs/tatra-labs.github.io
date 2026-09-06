# 2.4 Linear Dependence and Span

This is the section that answers *when does $Ax = b$ have a solution*, and it answers it geometrically
rather than algebraically. The reframing is the point.

## Reading $Ax$ as a combination of columns

The product $Ax$ can be read as a weighted sum of the columns of $A$, with the entries of $x$ as the
weights:

$$
A x = \sum_i x_i A_{:,i}
$$

So asking whether $Ax = b$ has a solution is asking whether $b$ lies in the set of all such combinations.
That set is the **span** of the columns — also called the **column space** or **range** of $A$.

A set of vectors is **linearly independent** when no vector in it lies in the span of the others.
Redundant vectors add nothing to the span, which is why counting columns is not enough.

## The conditions

For $Ax = b$ to have a solution for **every** $b \in \mathbb{R}^m$, the column space must be all of
$\mathbb{R}^m$. That requires $A$ to have at least $m$ columns, so $n \geq m$ — but the real requirement
is $m$ *linearly independent* columns, not merely $m$ columns. A matrix can be $3 \times 10$ and still
span only a plane.

For the solution to be **unique** there must be at most one combination producing each $b$, which rules
out extra columns: $n \leq m$. Combining the two, a matrix with an inverse must be **square** with
linearly independent columns. A square matrix with linearly dependent columns is called **singular**, and
$A^{-1}$ does not exist.

Non-square matrices can still have one-sided inverses, but not both; the general case is deferred to the
pseudoinverse in 2.9.

## My take

The habit worth building here is reading every matrix as a map with a range, not as a grid of numbers.
It pays off repeatedly. An under-determined system with infinitely many solutions is exactly the setting
where regularisation picks one, which is the entire content of Section 7.3, and *which* solution the
algorithm lands on turns out to be one of the more consequential questions in deep learning.

The implicit bias of gradient descent — the fact that on a separable problem it converges toward a
minimum-norm solution rather than an arbitrary one — is a post-2016 result and so is not in the book, but
the vocabulary for stating it is entirely here: underdetermined system, solution set, and which point of
that set you end up at.
