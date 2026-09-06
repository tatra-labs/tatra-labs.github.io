# 5.7 Supervised Learning Algorithms

A tour of pre-deep-learning supervised methods, each derived from the principles already established. The
tour has a direction: it is building toward an argument about why these methods stopped being enough.

## Probabilistic supervised learning

Most of the algorithms here estimate $p(y \mid x)$ by maximum likelihood over a parametric family.
Linear regression is the Gaussian case from 5.5. **Logistic regression** is the Bernoulli case, squashing
a linear function into a valid probability:

$$
p(y = 1 \mid x; \theta) = \sigma\left( \theta^{\top} x \right)
$$

There is no closed-form solution as there is for linear regression, so the negative log-likelihood is
minimised by gradient descent. The book notes this in passing, and it is the template for everything that
follows in the book: define a conditional distribution, take its negative log-likelihood, descend.

## Support vector machines

The SVM predicts a class from the sign of $w^{\top} x + b$ without producing probabilities. Its
distinctive contribution is the **kernel trick**: the linear function can be rewritten in terms of dot
products between training examples, and replacing that dot product with a kernel function
$k(x, x^{(i)})$ implicitly maps the inputs into a much higher-dimensional space where a linear separator
may exist.

$$
f(x) = b + \sum_i \alpha_i k\left( x, x^{(i)} \right)
$$

The map can even be infinite-dimensional, as with the **Gaussian (RBF) kernel**, while the computation
stays finite. The model is linear in $\alpha$, so training remains convex with reliable convergence.

The weakness is cost. Evaluating $f$ requires a sum over training examples, so prediction scales with
dataset size. The SVM's saving grace is that most $\alpha_i$ are zero after training, leaving only the
**support vectors**.

## Other methods

**k-nearest neighbours** has no training step at all — it is non-parametric, has very high capacity, and
is consistent, converging to the Bayes error given enough data. Its weaknesses are cost on large sets and
an inability to distinguish informative from uninformative features, since a single irrelevant dimension
contributes to the distance as much as a critical one.

**Decision trees** partition the input space recursively into axis-aligned regions, each with its own
constant output. The book's criticism is precise: a tree cannot represent a simple diagonal boundary
without an enormous number of splits, because its regions are axis-aligned by construction.

## My take

The section is a setup for 5.11, and reading it as a list of algorithms misses the argument. Every method
here is either linear in its parameters, or built on a hand-chosen fixed feature map, or non-parametric
and local. The consistency guarantee for k-NN and the convexity guarantee for the SVM both look
attractive, and Section 5.11 explains why they are worth less than they appear — they depend on the
smoothness assumption that fails in high dimensions.

One thing worth stating plainly, since the book was written before it was clear: the RBF kernel SVM is the
closest classical analogue to a neural network, and the reason it lost is not accuracy on small problems
but scaling. Its prediction cost grows with the training set while a network's does not, and the feature
map is fixed in advance rather than learned. The whole case for deep learning is in that second clause,
and Chapter 6 opens with it.

Logistic regression is the entry here that never left. It is exactly a one-layer network with a sigmoid
output and cross-entropy loss, and every classifier in the rest of the book is a stack of nonlinearities
placed in front of it.
