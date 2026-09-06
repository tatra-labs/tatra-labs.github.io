# 4.4 Constrained Optimization

Sometimes the minimum is wanted not over all of $\mathbb{R}^n$ but over a subset $\mathbb{S}$ of
**feasible** points. This section gives the general machinery, which reappears in Chapter 7 as the formal
account of what weight decay does.

## Three approaches

The simplest is to **modify gradient descent**: take an ordinary step, then project back into
$\mathbb{S}$. This works when the constraint set is simple, such as a norm ball.

The second is to **reparameterise** so the constraint becomes unconditional. To minimise over unit-norm
$x$, minimise over an angle $\theta$ with $x = [\cos\theta, \sin\theta]$ instead. The constraint has been
designed out rather than enforced.

The third is the general one. The **Karush-Kuhn-Tucker** approach handles a feasible set described by
equalities $g^{(i)}(x) = 0$ and inequalities $h^{(j)}(x) \leq 0$, by introducing a multiplier for each
and forming the **generalised Lagrangian**:

$$
L(x, \lambda, \alpha) = f(x) + \sum_i \lambda_i g^{(i)}(x) + \sum_j \alpha_j h^{(j)}(x)
$$

The constrained minimisation is then equivalent to the unconstrained problem

$$
\min_x \max_{\lambda} \max_{\alpha, \, \alpha \geq 0} L(x, \lambda, \alpha)
$$

The inner maximisation enforces feasibility by construction: any violated constraint lets its multiplier
grow without bound, sending the objective to infinity, so an infeasible $x$ can never win the outer
minimisation.

## The KKT conditions

Necessary conditions for optimality: the gradient of the generalised Lagrangian is zero; all constraints
are satisfied; and **complementary slackness** holds, meaning $\alpha \odot h(x) = 0$. That last condition
encodes an intuitive fact — either an inequality constraint is **active**, sitting exactly at its
boundary, or its multiplier is zero and it has no influence on the solution.

## My take

The reason to read this rather than skip it is Section 7.2, which shows that an $L^2$ penalty added to a
loss is the Lagrangian of a constrained problem with the multiplier held fixed. That reframes weight
decay: it is not merely "a term that discourages large weights" but a constrained optimisation over a
norm ball, with the ball's radius determined implicitly by the coefficient. The complementary-slackness
condition is what makes the constraint interpretation precise, and it explains why the effective radius
shifts during training even when the coefficient does not.

The min-max structure is worth noticing for a second reason. It is the same structure as a generative
adversarial network in Section 20.10.4 — an inner maximisation over one set of parameters inside an outer
minimisation over another. GANs are not derived from constrained optimisation, but the difficulties are
the same ones, and readers who have seen the saddle-point formulation here find the training instabilities
there much less mysterious.
