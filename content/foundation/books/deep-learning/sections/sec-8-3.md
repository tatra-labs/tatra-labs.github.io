# 8.3 Basic Algorithms

Three algorithms: stochastic gradient descent, momentum, and Nesterov momentum. Everything in 8.5 is a
modification of one of them.

## Stochastic gradient descent

Sample a minibatch, compute the gradient estimate $g$, step:

$$
\theta \leftarrow \theta - \epsilon_k g
$$

The learning rate carries a subscript because it must **decrease over time**. The minibatch gradient does
not vanish at a minimum the way the true gradient does — noise persists — so a fixed learning rate leaves
the parameters bouncing around the optimum forever. Sufficient conditions for convergence are that the
learning rates sum to infinity while their squares sum to something finite.

In practice the book recommends decaying linearly until iteration $\tau$ and holding constant after, with
$\epsilon_{\tau}$ around $1\%$ of $\epsilon_0$ and $\tau$ set to a few hundred passes over the data. It
also states the pragmatic rule for choosing $\epsilon_0$: too large and the learning curve shows violent
oscillation; too small and learning is slow and may stick at a high cost. The best strategy is to monitor
the first several hundred iterations and pick something higher than the best-performing value at that
point, but not so high that instability appears.

The property that makes SGD suitable for large datasets is that the **cost per update does not depend on
the training set size**, so the model can converge before every example has been seen once.

## Momentum

Momentum accelerates learning when the gradient is small but consistent, or noisy. It accumulates an
exponentially decaying moving average of past gradients and moves in that direction:

$$
v \leftarrow \alpha v - \epsilon g
$$

$$
\theta \leftarrow \theta + v
$$

The hyperparameter $\alpha$ in $[0, 1)$ controls how quickly earlier contributions decay; common values
are $0.5$, $0.9$ and $0.99$. If the gradient were constant, the velocity would reach a terminal value of

$$
\frac{\epsilon \lVert g \rVert}{1 - \alpha}
$$

so $\alpha = 0.9$ multiplies the effective step size by ten. The physical analogy the book uses is a
particle with momentum on the loss surface, subject to a viscous drag that dissipates energy — chosen
because drag proportional to velocity is weak enough not to stop the particle on a gentle slope, unlike
dry friction.

Momentum's value is greatest in exactly the situation 8.2 described: a poorly conditioned Hessian, where
gradient descent oscillates across a narrow valley. The oscillating components cancel in the running
average while the consistent component accumulates.

## Nesterov momentum

The variant evaluates the gradient **after** applying the current velocity, so the step is a correction to
where the momentum is already taking the parameters rather than to where they are. For convex batch
problems this improves the convergence rate; the book notes that in the stochastic case it does not
improve the rate.

## My take

The learning-rate advice is the most practical paragraph in Chapter 8 and it is still how the value is
chosen — a short run, watch the loss, take the largest rate that stays stable. The theory offers nothing
better.

The schedule has changed, though. Linear decay to a floor has been largely replaced by **cosine decay
with linear warmup**, and warmup in particular is worth noting because the book does not have it. Warmup
exists because a large model with a large batch is unstable in its first few hundred steps, when adaptive
optimiser statistics are still poorly estimated. That is a failure mode arising from Adam rather than
from SGD, and it appears only at a scale the chapter predates.

Momentum's role has also shifted. It is no longer usually a separate algorithm but the first moment
inside Adam, and the value $0.9$ recommended here survives as Adam's default $\beta_1$. Nesterov's
variant is a good example of a result that is real in theory and marginal in practice: it improves the
convergence rate in the convex batch setting, which is not the setting anyone is in.
