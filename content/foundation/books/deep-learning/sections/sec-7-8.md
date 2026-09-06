# 7.8 Early Stopping

The book calls this "probably the most commonly used form of regularization in deep learning", and it is
also the one that requires no change to the objective at all.

## The algorithm

When training a model with enough capacity to overfit, training error decreases steadily while validation
error follows the U-shaped curve of 5.2. Early stopping exploits this: keep a copy of the parameters
whenever validation error improves, keep training until no improvement has been seen for some number of
evaluations — the **patience** — and return the stored parameters rather than the final ones.

The effective hyperparameter is the **number of training steps**, and its distinguishing property is that
it is tuned by a single training run rather than by one run per candidate value. Nearly every other
hyperparameter requires the whole run to be repeated.

The costs are small and real: periodic validation evaluation, and memory for a copy of the parameters,
which can be held in host memory or on disk since it is read rarely.

## Reusing the held-out data

Early stopping consumes a validation set, and the book gives two strategies for not wasting it.

The first is to **retrain from scratch** on all the data for the number of steps that was found to be
best. This is imperfect — the same number of parameter updates is not the same thing when the dataset is
larger — and there is no good way to know the right target.

The second is to **continue training** the existing parameters on all the data, stopping when the loss on
the previously held-out portion falls below the training-set loss value achieved at the stopping point.
This avoids the cost of retraining but the criterion may never be met.

## Why it regularises

The book's argument is that early stopping restricts optimisation to a neighbourhood of the initial
parameters. Under a quadratic approximation with learning rate $\epsilon$ and $\tau$ steps, the effect is
equivalent to L2 regularisation with

$$
\alpha \approx \frac{1}{\tau \epsilon}
$$

so more steps corresponds to less regularisation, exactly as expected. In this restricted setting the two
are equivalent, and early stopping has the advantage of determining the amount automatically.

## My take

The formula is a genuinely satisfying result — it says the number of steps and the weight-decay
coefficient are the same knob — but its assumptions are strong: a quadratic loss, a small learning rate,
and a start near the origin. None of these hold for a real network, so the correspondence should be read
as an explanation of the mechanism rather than as a conversion factor.

The practical case for early stopping is simply that it is nearly free, and this remains true. The
practical case *against* it, in the modern regime, is stronger than the book suggests. When training runs
are measured in weeks and the loss curve is still descending at the end, there is no U-shape to detect —
large models are typically stopped by budget, not by validation error, and the entire premise of the
section does not arise. Early stopping is a technique for the regime where a model is large relative to
its data, and much current practice is in the opposite regime.

The retraining discussion is also worth reading as a caution about a subtler thing: the number of steps
that was optimal for one dataset size is not optimal for another, and there is no principled way to
transfer it. That is a small instance of a general problem in hyperparameter transfer across scale, which
is now a research area of its own.
