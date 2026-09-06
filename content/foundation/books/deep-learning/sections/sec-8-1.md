# 8.1 How Learning Differs from Pure Optimization

Chapter 8 opens by establishing that training a network is not an optimisation problem, even though it is
solved with optimisation algorithms. Three differences, each with practical consequences.

## We optimise the wrong thing on purpose

The quantity actually wanted is the expected loss over the **data-generating distribution**:

$$
J^{\ast}(\theta) = \mathbb E_{x, y \sim p_{\text{data}}} L\left( f(x; \theta), y, \theta \right)
$$

which cannot be computed, because $p_{\text{data}}$ is unknown. What is computed instead is the same
expectation under the **empirical distribution** — the average over the training set. Minimising it is
**empirical risk minimisation**, and it is a proxy: the object being minimised is not the object of
interest, and the entirety of Chapter 7 exists because of the gap.

The book adds that empirical risk minimisation is prone to overfitting and that for many useful losses,
such as 0-1 loss, no useful gradient exists, which is why deep learning rarely uses it in its pure form.

## We optimise a surrogate

When the true loss cannot be optimised efficiently, a **surrogate loss** is minimised instead. The
negative log-likelihood of the correct class stands in for 0-1 loss, and it has an advantage beyond
tractability: it keeps improving after the classification error reaches zero, by pushing the classes
further apart, so it continues to increase the margin where 0-1 loss has nothing left to say.

The most conspicuous difference from pure optimisation follows: training usually **halts before reaching
a local minimum**. Early stopping monitors the true loss on a validation set, so training terminates
while the surrogate gradient is still large.

## We use minibatches

Objective functions in machine learning decompose as a sum over examples, so the gradient is an
expectation and can be estimated from a sample. The book gives four reasons this is a good trade:

- **Diminishing returns.** The standard error of a mean over $n$ samples falls as $1/\sqrt{n}$, so a
  hundredfold increase in examples buys only a tenfold reduction in gradient error.
- **Redundancy.** Real datasets contain many near-duplicate examples, so a small sample often carries
  nearly the same information as the whole.
- **Hardware.** Runtimes scale better with power-of-two batch sizes, and very small batches leave
  multicore hardware idle.
- **Regularisation.** Small batches add noise, which itself regularises — with the caveat that a batch
  size of one may need a small learning rate to remain stable, making the run slow.

Different algorithms tolerate different batch sizes. Methods using only the gradient are robust at around
100 examples; methods using second-order information need much larger batches, because the estimate of a
Hessian-based update amplifies whatever error the gradient estimate contains.

Two requirements are easy to get wrong. Minibatches must be **selected randomly**, since consecutive
examples in a natural ordering are correlated — the book's example is a dataset of blood-test results
sorted by patient. Shuffling once is enough. And on the first pass over a dataset every example is new,
so the gradient of the training objective is an unbiased estimate of the *generalisation* error; only on
subsequent epochs does the estimate become biased.

## My take

The surrogate-loss argument is the cleanest justification available for why cross-entropy is used to
train classifiers evaluated by accuracy, and it is worth holding onto in the form the book gives: the
surrogate is not merely a differentiable approximation, it is a *better-behaved objective* that keeps
supplying signal after the metric has saturated.

The single-epoch observation has grown from a footnote into the defining regime. Large language models
are commonly trained for roughly one pass over their corpus, which means the entire distinction between
training and generalisation error in this section collapses: every gradient is computed on data the model
has never seen, so the training loss *is* an estimate of the generalisation loss. The chapter's careful
separation between $J$ and $J^{\ast}$ largely dissolves in that regime, and with it much of the reason to
regularise.

The minibatch-size guidance is also the part most changed by hardware. The book's figure of around 100
reflects the GPUs of 2016; modern training uses batches in the millions of tokens, held together by
learning-rate scaling rules and warmup rather than by anything in this section. The statistical argument
did not change — the returns still diminish as $1/\sqrt{n}$ — but the reason for large batches was never
statistical. It is that a large batch is the only way to keep thousands of accelerators busy.
