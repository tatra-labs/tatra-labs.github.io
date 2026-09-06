# 7.2 Norm Penalties as Constrained Optimization

A short section that reinterprets the previous one, then argues that the reinterpretation is sometimes
better as an implementation rather than merely as an explanation.

## The reinterpretation

Section 4.4 gave the generalised Lagrangian for minimising $J(\theta)$ subject to
$\Omega(\theta) \leq k$:

$$
L(\theta, \alpha) = J(\theta) + \alpha \left( \Omega(\theta) - k \right)
$$

Minimising over $\theta$ with $\alpha$ **fixed** gives exactly the regularised objective of 7.1, since
$\alpha k$ is a constant that does not affect the minimiser. So a norm penalty *is* a constrained
optimisation with the multiplier frozen.

The correspondence is not a fixed one. Larger $\alpha$ corresponds to a smaller feasible region, and
smaller $\alpha$ to a larger one, but the value of $k$ implied by a given $\alpha$ is unknown — it depends
on the shape of $J$, so the effective constraint radius drifts during training even when $\alpha$ does
not.

## Explicit constraints instead

The alternative is to enforce the constraint directly: take an ordinary gradient step, then project the
parameters back onto the region where $\Omega(\theta) < k$. The book gives three reasons to prefer this.

**Penalties can cause dead units.** A penalty with a large coefficient can drive a group of weights to
become and remain very small, leaving units stuck near zero with vanishing gradient. A projection does
not push toward the origin at all — it only intervenes when the boundary is crossed — so the interior is
unpenalised.

**Explicit constraints impose stability.** A penalty plus a high learning rate admits a positive feedback
loop: large weights produce large gradients, which produce larger weights. Reprojection breaks it.

**The constraint can be applied per unit rather than globally.** Constraining the norm of each column of
a weight matrix separately prevents any single hidden unit from acquiring very large weights, which a
global penalty allows.

The book credits Hinton with the recommendation to constrain the norm of each hidden unit's incoming
weights — **max-norm regularisation** — noting that it permits a high learning rate without runaway
weights.

## My take

The framing here is the payoff of Chapter 4 and it is worth stating plainly: **there is no difference in
kind between regularisation and constraint**, only in which side of the Lagrangian you hold fixed. A
practitioner who tunes weight decay is choosing a feasible region indirectly and cannot say which one.

The stability argument is the part that has aged into everyday practice, though not in the form given
here. Max-norm regularisation is now rare, but its successor — **gradient clipping**, which bounds the
size of the update rather than the parameters — is standard in every large training run, and it is
motivated by exactly the feedback loop described above. The lineage runs from this paragraph to a line in
every modern training script.

The dead-unit argument also generalises beyond what the section claims. It is the same mechanism as the
dead-ReLU problem in 6.3: a unit driven far enough into its flat region stops receiving gradient and
never returns. Penalties that push uniformly toward the origin are one way to get there, and a large
learning rate is another.
