# 2.9 The Moore-Penrose Pseudoinverse

Section 2.4 left two cases open: systems with no exact solution and systems with infinitely many. The
pseudoinverse handles both, and it does something different in each — which is the detail worth getting
right.

## The definition

For a non-square $A$, the pseudoinverse $A^{+}$ is defined by a limit,

$$
A^{+} = \lim_{\alpha \to 0} (A^{\top} A + \alpha I)^{-1} A^{\top}
$$

but the practical definition comes from the SVD:

$$
A^{+} = V D^{+} U^{\top}
$$

where $D^{+}$ is formed by taking the reciprocal of each nonzero element of $D$ and then transposing.
Zeros stay zero — that is the entire trick, and it is what makes the pseudoinverse defined for singular
matrices.

## Two behaviours, depending on shape

When $A$ has **more columns than rows**, the system is underdetermined and has many solutions.
Then $x = A^{+} y$ returns the solution with the **smallest $L^2$ norm** among all of them.

When $A$ has **more rows than columns**, the system typically has no solution. Then $x = A^{+} y$ returns
the $x$ minimising $\lVert Ax - y \rVert_2$ — the least-squares fit.

Same formula, two different meanings, selected by shape. Neither is arbitrary: in both cases the
pseudoinverse resolves the ambiguity by an $L^2$ criterion.

## My take

The limit definition is more than a technicality; it is the connective tissue between this section and
Section 7.3. That expression $(A^{\top} A + \alpha I)^{-1} A^{\top}$ is *exactly* ridge regression with
regularisation strength $\alpha$. So the pseudoinverse is the zero-regularisation limit of weight decay,
and weight decay is what makes an underdetermined problem well posed. Chapter 7 makes the argument in
words; the formula is already here.

That also explains the minimum-norm behaviour, which otherwise looks like an arbitrary tiebreak. It is
not a tiebreak — it is the trace left by an $L^2$ penalty that was sent to zero, and it survives the
limit. The same phenomenon reappears as the implicit bias of gradient descent on overparameterised
models, which is the modern version of the same sentence.
