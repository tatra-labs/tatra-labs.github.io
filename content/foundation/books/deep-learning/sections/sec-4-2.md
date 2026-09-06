# 4.2 Poor Conditioning

A well-posed problem can still be a badly behaved one. Conditioning measures how much a function's output
can move when its input moves slightly, and for linear systems it has a clean expression in terms of
eigenvalues.

## The condition number

For a matrix $A$ with an eigendecomposition, the condition number is

$$
\max_{i,j} \left\lvert \frac{\lambda_i}{\lambda_j} \right\rvert
$$

the ratio of the largest to the smallest eigenvalue in magnitude. When this number is large, the matrix
is **poorly conditioned**.

The consequence is that inverting the matrix amplifies error in the input. This is an intrinsic property
of the matrix itself, not an artefact of a particular algorithm — it is a bound on what any algorithm
can achieve, and it compounds with the rounding error already present before inversion begins.

## My take

The word "conditioning" reappears throughout the book and almost always means this quantity computed on
the **Hessian** rather than on a data matrix, so it is worth making the translation early.

A poorly conditioned Hessian means the loss surface curves sharply in some directions and gently in
others. Gradient descent must then choose a learning rate small enough not to diverge along the steepest
direction, which makes it crawl along the shallow ones. Section 8.2 calls this the single most pervasive
difficulty in neural network optimisation, and 4.3 shows it concretely: the number of steps required
scales with the condition number.

That one quantity explains an unreasonable amount of practice:

- **Momentum** accumulates progress along consistently-signed shallow directions while cancelling
  oscillation across sharp ones.
- **Adaptive methods** — AdaGrad, RMSProp, Adam — rescale each coordinate by its own gradient history,
  which is a diagonal preconditioner attacking the same ratio.
- **Normalisation layers** improve conditioning by controlling activation scale, which is a substantial
  part of why batch normalisation works.
- **Feature standardisation**, the oldest advice in machine learning, is conditioning improvement applied
  to the input.

Four techniques from four different chapters are the same idea. Reading them that way is the reason this
two-page section is worth the attention.
