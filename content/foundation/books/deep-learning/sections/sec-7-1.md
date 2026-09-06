# 7.1 Parameter Norm Penalties

Chapter 7 opens with the oldest form of regularisation: add a penalty on parameter size to the objective.
The analysis of what the penalty actually *does* is the reason to read the section rather than just
remember the formula.

## The general form

$$
\tilde J(\theta; X, y) = J(\theta; X, y) + \alpha \Omega(\theta)
$$

with $\alpha \geq 0$ trading the penalty against the original loss. Only the **weights** are penalised,
never the biases. The book gives the reason: a bias controls a single variable and needs less data to fit
accurately, while a weight couples two variables and needs both to vary. Regularising biases tends to
introduce underfitting for no benefit.

## L2: weight decay

$\Omega(\theta) = \frac{1}{2} \lVert w \rVert_2^2$, also called ridge regression or Tikhonov
regularisation. The gradient step becomes

$$
w \leftarrow (1 - \epsilon \alpha) w - \epsilon \nabla_w J(w)
$$

so every step first shrinks the weight vector multiplicatively — hence the name.

The interesting analysis is what happens at the optimum. Approximating $J$ quadratically around its
unregularised minimum and diagonalising the Hessian, the regularised solution rescales each eigen-
direction by

$$
\frac{\lambda_i}{\lambda_i + \alpha}
$$

Directions with large eigenvalues — where the loss curves sharply, so the parameter genuinely matters —
are barely affected. Directions with small eigenvalues, where moving the parameter hardly changes the
loss, are shrunk toward zero. **Weight decay removes parameters the data does not constrain**, and leaves
those it does.

## L1

$\Omega(\theta) = \lVert w \rVert_1$, the sum of absolute values. Its gradient contribution is
$\alpha \operatorname{sign}(w)$ — a constant push toward zero regardless of magnitude, unlike L2, whose
push is proportional to the weight.

Under the same quadratic approximation with a diagonal Hessian, the solution for each coordinate is

$$
w_i = \operatorname{sign}(w_i^{\ast}) \max \lbrace \lvert w_i^{\ast} \rvert - \alpha / H_{i,i}, \, 0 \rbrace
$$

Coordinates whose unregularised value is smaller than the threshold are set **exactly to zero**. L1
produces genuine sparsity; L2 shrinks but never zeroes. This is the geometric fact from Section 2.5 in
analytic form, and it is why L1 is used for feature selection.

## My take

The eigenvalue analysis is the most useful thing in the section and it is rarely quoted. It says weight
decay is not a uniform force toward the origin but a **selective** one, filtering out precisely the
directions in which the training data was uninformative. That is a much better story than "small weights
generalise better", and it connects directly to the pseudoinverse of Section 2.9, where the same
expression appeared as a limit.

Two practical notes the section motivates but does not state.

**Weight decay and L2 are not the same for adaptive optimisers.** Adam rescales gradients per coordinate,
so an L2 term added to the loss is rescaled along with everything else and stops behaving like decay.
Decoupling it — applying the multiplicative shrink directly, as AdamW does — restores the intended
behaviour, and this was a real and widely-felt bug in the years after publication.

**L1 sparsity is rarely used on network weights.** Unstructured sparsity does not make a GPU faster,
because the hardware wants dense blocks. The sparsity that pays is structural, and it comes from
architecture rather than from a penalty.
