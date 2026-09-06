# 5.2 Capacity, Overfitting and Underfitting

The central section of Chapter 5, and the one most worth reading slowly. It explains why machine learning
is not optimisation, and it contains two theoretical results that have both aged in interesting ways.

## Generalisation and the i.i.d. assumptions

What distinguishes learning from optimisation is that performance is measured on data the algorithm has
not seen. Minimising training error is optimisation; minimising **generalisation error** — the expected
error on a new draw — is learning.

The bridge between them is a pair of assumptions about the **data-generating process**: examples are
independent of one another, and the training and test sets are drawn from the same distribution. Under
these **i.i.d. assumptions** the expected training error equals the expected test error for a *fixed*
parameter setting. Training breaks the symmetry, because parameters chosen using the training set make
its error the smaller of the two.

Two factors then determine performance: make the training error small, and make the gap between training
and test error small. Failing the first is **underfitting**; failing the second is **overfitting**.

## Capacity

**Capacity** is a model's ability to fit a wide variety of functions. It is controlled by choosing a
**hypothesis space** — the set of functions the algorithm may select from. Allowing polynomials of degree
9 rather than degree 1 raises capacity.

The distinction the book draws next is worth keeping: **representational capacity** is what the family
can express, while **effective capacity** is what the optimisation algorithm can actually find. They are
not the same, and the gap is one reason imperfect optimisation sometimes helps generalisation.

The classical picture follows: as capacity rises, training error falls monotonically while generalisation
error is U-shaped, and the optimum sits between the two failure modes.

**Non-parametric** models avoid a fixed capacity entirely. Nearest-neighbour regression has capacity that
grows with the dataset; the book uses it to make the point that the ideal is the **Bayes error**, the
irreducible error left when the true data-generating distribution is known, and which is nonzero whenever
the mapping is genuinely stochastic.

## The two theorems

The **no free lunch theorem** states that averaged over all possible
data-generating distributions, every classification algorithm has the same error rate on unseen points.
No algorithm is universally better than any other. The conclusion the book draws is the right one: the
goal is not a universally good learner but one matched to the distributions that occur in the real world.

**VC dimension** measures capacity as the largest set of points a binary classifier can shatter, and
supports bounds in which the generalisation gap shrinks with more training data and grows with capacity.
The book notes immediately that these bounds are rarely used in deep learning, because they are loose and
because the effective capacity of a deep model is hard to determine.

## Regularisation

Since no algorithm is universally best, the alternative is **preference** rather than exclusion: express
a preference for some functions in the hypothesis space over others. Weight decay adds
$\lambda w^{\top} w$ to the training criterion, expressing a preference for small weights. The book's
definition is worth memorising — regularisation is any modification intended to reduce generalisation
error but not training error.

## My take

The U-shaped curve is the part of this section that has been overtaken by events. **Double descent**,
established after publication, shows that pushing capacity *past* the interpolation threshold — where the
model fits the training set exactly — often sends test error down again, sometimes below the classical
optimum. Modern practice routinely trains models with far more parameters than examples, which the curve
here predicts should be a disaster and is not.

The framework survives the correction; the diagram does not. Capacity, hypothesis space, generalisation
gap and the i.i.d. assumptions are all still the right vocabulary. What was wrong was the belief that
capacity is measured by parameter count.

The no-free-lunch theorem is also routinely over-read. It says nothing about performance on realistic
distributions, only about the uniform average over all of them, and that average is dominated by
distributions nobody will ever encounter. It is an argument for building in assumptions, not an argument
against expecting progress.
