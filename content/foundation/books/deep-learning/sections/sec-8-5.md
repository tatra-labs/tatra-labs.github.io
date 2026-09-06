# 8.5 Algorithms with Adaptive Learning Rates

One learning rate for every parameter is a poor compromise when the loss is far more sensitive in some
directions than others. This section gives three algorithms that maintain a separate rate per parameter,
adapted from the gradient history.

## AdaGrad

Accumulate the sum of squared gradients seen so far, and scale each parameter's learning rate by the
inverse square root of its accumulator. Parameters with consistently large partial derivatives get their
rate reduced sharply; parameters with small ones keep a large rate.

The property that makes it attractive in convex optimisation is exactly the property that limits it here:
because the accumulator only grows, the effective learning rate decays monotonically from the beginning
of training. The book reports that for deep models this leads to a **premature and excessive decrease**
in the learning rate, and that AdaGrad performs well only for some models.

## RMSProp

The fix is to replace the sum with an **exponentially weighted moving average**, discarding history from
the distant past. In a convex problem AdaGrad converges quickly once it reaches a convex bowl; in a
non-convex one it may have shrunk its rate to nothing long before arriving at a useful region. RMSProp's
moving average behaves as though initialised anew in each locally convex region.

It adds a decay-rate hyperparameter controlling the length of the average, and can be combined with
Nesterov momentum. The book describes it as one of the go-to optimisation methods in routine use at the
time of writing.

## Adam

Adam combines the two ideas and adds a correction. It keeps an exponentially decaying average of the
gradient — the first moment, which is momentum — and of the squared gradient — the second moment, as in
RMSProp — and divides one by the square root of the other.

The distinctive detail is **bias correction**. Both moment estimates are initialised at zero, so early in
training they are biased toward zero; Adam divides by $1 - \beta^t$ to correct for it. RMSProp lacks this
and can therefore take very large steps in its first iterations. The book describes Adam as generally
robust to the choice of its hyperparameters, with the learning rate sometimes needing adjustment from the
default.

## Which to choose

The section ends without a recommendation, and says so honestly: there is currently no consensus, and the
most popular algorithms in active use include SGD, SGD with momentum, RMSProp, RMSProp with momentum,
AdaDelta and Adam. The choice appears to depend largely on the user's familiarity with tuning it.

## My take

The non-answer at the end of the section is a fair report of 2016 and did not last. Adam won, decisively
and almost universally, and the reason is the one the book half-identifies: it works acceptably without
tuning. An algorithm that is second-best but needs no hyperparameter search beats a better one that does.

Three things about Adam that the section predates and that matter in practice:

**Weight decay must be decoupled.** As noted in 7.1, an L2 term added to the loss gets divided by the
second-moment estimate along with the real gradient, so it stops being weight decay. AdamW applies the
shrink directly and is now the default for transformer training.

**Warmup is effectively required at scale.** The second-moment estimate is unreliable in the first few
hundred steps, and bias correction does not fully compensate; a large-batch run without warmup often
diverges immediately. The section describes bias correction as the fix for exactly this problem, and it
is not sufficient.

**Memory cost is real.** Adam stores two additional values per parameter, so optimiser state is twice the
model size. For a large model that dominates the memory budget, and the family of memory-efficient
optimisers that followed — Adafactor, 8-bit Adam, and the sharded optimiser states in distributed
training — exists entirely because of this line item, not because of anything about convergence.
