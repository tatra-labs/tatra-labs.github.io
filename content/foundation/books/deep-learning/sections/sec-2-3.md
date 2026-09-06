# 2.3 Identity and Inverse Matrices

The inverse is introduced here as the clean algebraic tool for solving $Ax = b$, and then immediately
qualified. The qualification is the useful part of the section.

## The definitions

An **identity matrix** $I_n \in \mathbb{R}^{n \times n}$ has ones on the main diagonal and zeros
elsewhere, and preserves any vector it multiplies:

$$
I_n x = x
$$

The **matrix inverse** $A^{-1}$ is defined by

$$
A^{-1} A = I_n
$$

For a square matrix the left and right inverses coincide, so $A A^{-1} = I_n$ as well. When $A^{-1}$
exists, the linear system has a closed-form solution:

$$
x = A^{-1} b
$$

That single line is why the inverse is introduced. It says the solution exists, is unique, and depends on
$b$ linearly.

## The caveat the authors attach immediately

The book is explicit that $A^{-1}$ is primarily a theoretical tool and that computing it is usually the
wrong thing to do in software. Two reasons. First, the inverse cannot in general be represented with
enough precision in floating point to be useful, so forming it and then multiplying introduces error that
a direct solver avoids. Second, the closed form is only available when the inverse exists, and much of
the interesting behaviour of linear systems happens when it does not.

In practice a direct solve beats forming the inverse and multiplying, on both accuracy and cost: the
direct route factors $A$ once and back-substitutes, while the inverse route does strictly more work to
get a strictly worse answer.

## My take

This section is short and it sets up the next two, which are the ones that matter. Existence of a
solution is really a question about the *column space* of $A$ (2.4), and the numerical behaviour of the
solve is really a question about *conditioning* (4.2). The inverse is a bridge between them, not a
destination.

Worth carrying forward: nothing in deep learning inverts a parameter matrix. When an inverse appears in
later chapters it is almost always the inverse of a small structured object — a covariance in a Gaussian
density, a curvature approximation in a second-order method — and in every one of those cases the
practical algorithm avoids forming it explicitly. Chapter 8's treatment of Newton's method is the
clearest example: the method is *defined* by $H^{-1}$, and every usable version of it refuses to compute
$H^{-1}$.
