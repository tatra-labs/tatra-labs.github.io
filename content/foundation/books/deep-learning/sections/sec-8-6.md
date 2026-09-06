# 8.6 Approximate Second-Order Methods

Methods that use curvature rather than only slope. All of them are better than gradient descent in
theory, and none of them displaced it, which makes this section a useful study in why.

## Newton's method

The update from 4.3, applied to a network's parameters:

$$
\theta \leftarrow \theta - H^{-1} \nabla_{\theta} J(\theta)
$$

Two problems make it unusable directly. **Saddle points** — the Hessian near one is not positive definite,
and the update can move in the wrong direction entirely, which by 8.2 is the common case in high
dimensions. The standard remedy is regularising the Hessian by adding $\alpha I$ before inverting, which
works only if the negative eigenvalues are small.

**Cost.** With $k$ parameters the Hessian has $k^2$ entries, and inverting it is cubic. For a network with
even a million parameters, forming the matrix is out of the question and inverting it at every iteration
is absurd. The book notes that only networks with a very small number of parameters can be trained this
way in practice.

## Conjugate gradients

An intermediate method that avoids the Hessian entirely. Steepest descent on a quadratic zig-zags because
each new gradient direction undoes progress made in the previous one; conjugate gradients choose each
direction to be **conjugate** to the previous one, meaning the new search does not spoil the last. The
coefficient can be computed from gradients alone, with no Hessian required, and on a quadratic in $k$
dimensions the method converges in at most $k$ steps.

Nonlinear conjugate gradients extends it to general functions with periodic restarts, and the book notes
that minibatch versions have been made to work.

## BFGS and L-BFGS

Quasi-Newton methods approximate $H^{-1}$ directly, refining a matrix $M$ from successive gradient
evaluations rather than inverting anything. This removes the cubic cost but not the quadratic memory: BFGS
stores a $k \times k$ matrix, which is prohibitive.

**L-BFGS** — limited-memory BFGS — avoids storing the matrix by assuming it is the identity at the start
of each step and reconstructing the correction from the last few gradient vectors. Memory becomes linear
in the parameter count, and the method is practical.

## My take

The reason none of this is used is worth stating clearly, because it is not primarily about cost.

Second-order methods want an accurate curvature estimate, and a minibatch does not provide one. Section
8.1 already gave the reason: methods using second-order information need much larger batches, because the
inverse Hessian amplifies whatever error the gradient estimate carries. Conjugate gradients and L-BFGS
were designed for deterministic objectives, and they degrade badly when the objective changes on every
step. Adding the saddle-point attraction of 8.2 on top of that, the case for second-order methods in deep
learning largely evaporates.

What survived is the *diagonal* approximation. Adam is a second-order method in spirit — it rescales each
coordinate by an estimate of curvature — and it is affordable precisely because the diagonal is linear in
the parameter count and needs no inversion. Section 2.6's observation about diagonal matrices is what
makes it work.

There is a live descendant worth naming. **K-FAC** approximates the Fisher information matrix as a
Kronecker product of two smaller factors, which is a middle path between a diagonal and a full matrix,
and it has been used successfully in large-scale training. Shampoo and Muon are the recent members of the
same family, and they are the current best evidence that this section's ideas were not wrong so much as
premature — they were waiting for a structured approximation that fits between the diagonal and the
impossible.
