# 7.3 Regularization and Under-Constrained Problems

Two pages arguing that regularisation is not only about generalisation. Sometimes a problem has no
well-defined solution at all, and a penalty is what makes one exist.

## When the problem is ill-posed

Many linear models require inverting $X^{\top} X$, which is only possible when the columns of $X$ are
linearly independent. Whenever the data-generating distribution has no variance in some direction, or
whenever there are fewer examples than features, the matrix is singular and the standard solution does
not exist.

Regularised alternatives invert $X^{\top} X + \alpha I$ instead, and that matrix is guaranteed to be
invertible for any $\alpha > 0$. Which is the pseudoinverse again — Section 2.9 defined $A^{+}$ as the
limit of exactly this expression as $\alpha \to 0$, and one interpretation of the pseudoinverse is that
it performs linear regression with weight decay taken to the zero limit.

## When the objective has no minimum

The book's second case is sharper. Logistic regression on a **linearly separable** dataset has no finite
solution. If weights $w$ separate the classes perfectly, then $2w$ separates them with higher likelihood,
and $4w$ higher still. Gradient descent will increase the norm forever without ever converging.

Adding weight decay stops this: past some magnitude the penalty grows faster than the likelihood
improves, and a finite optimum exists. The regulariser is not improving generalisation here — it is
supplying a solution where none existed.

More generally, the book notes that many models can be guaranteed convergence when the problem is
under-determined simply by adding a penalty, and that most forms of regularisation guarantee convergence
for under-determined problems.

## My take

The separable-logistic-regression case is the clearest illustration in Chapter 7 of a distinction worth
holding onto: **regularisation and optimisation are not independent concerns**. A penalty can be the
difference between an optimiser that converges and one that runs forever, and the diagnosis of "training
loss keeps decreasing and the weight norm keeps growing" is this section rather than a bug.

It also connects forward to something the book could not have known. The direction in which the weights
diverge in the separable case is not arbitrary — gradient descent converges in direction to the
maximum-margin separator, which is the same solution an SVM finds. This is the **implicit bias** result,
established after publication, and it is the modern answer to why heavily overparameterised networks
generalise without explicit regularisation: the optimiser has a preference of its own, and its preference
is often a good one.

Read together with 7.1, the two sections give the honest picture. Explicit regularisation selects among
solutions when many exist, and creates one when none does. But it is not the only thing doing the
selecting, and in deep networks it is probably not the main thing.
