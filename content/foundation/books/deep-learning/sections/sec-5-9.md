# 5.9 Stochastic Gradient Descent

Two pages, and the argument in them is the reason large-scale deep learning is possible at all.

## The problem with the exact gradient

Nearly every cost function in machine learning is a sum over training examples. The negative
log-likelihood is

$$
J(\theta) = \frac{1}{m} \sum_{i=1}^{m} L\left( x^{(i)}, y^{(i)}, \theta \right)
$$

so its gradient requires a pass over the entire dataset:

$$
\nabla_{\theta} J(\theta) = \frac{1}{m} \sum_{i=1}^{m} \nabla_{\theta} L\left( x^{(i)}, y^{(i)}, \theta \right)
$$

The cost of a single update is therefore $O(m)$, and as $m$ grows the time for one step grows with it.

## The insight

The gradient is an **expectation**, and an expectation can be estimated from a sample. Draw a
**minibatch** of $m'$ examples uniformly — typically from a few tens to a few hundred, held fixed as the
training set grows — and use

$$
g = \frac{1}{m'} \sum_{i=1}^{m'} \nabla_{\theta} L\left( x^{(i)}, y^{(i)}, \theta \right)
$$

followed by $\theta \leftarrow \theta - \epsilon g$.

The estimate is unbiased, by linearity of expectation from 3.8. And the cost of an update no longer
depends on $m$ at all. The book states the consequence directly: the model can converge to within a fixed
tolerance of its best possible test error before the whole training set has been examined even once.

## My take

The economics here are what made deep learning a scaling story. Before SGD, the standard view was that
large training sets are computationally expensive; after it, a larger dataset costs nothing extra per
update and only reduces overfitting. That inversion is the precondition for everything in Chapter 12, and
it dates to Widrow and Hoff in 1960 rather than to the deep learning era.

Two things the section understates.

**The noise is not purely a cost.** The gradient estimate is unbiased but noisy, and that noise turns out
to help — it perturbs the trajectory away from sharp minima and past saddle points. Section 8.2 makes
part of this argument; the connection between minibatch size, gradient noise and generalisation was
worked out afterwards, and it is why very large batches often generalise *worse* despite giving a more
accurate gradient. The obvious reading, that a better gradient estimate is better, is wrong.

**Batch size is not free in the way the argument suggests.** The book's claim is about examples processed
per update, and hardware cares about arithmetic intensity. A batch of one wastes almost all of a GPU. The
practical batch size is set by memory bandwidth and parallel efficiency far more than by any statistical
consideration, which is a constraint from outside the mathematics entirely.
