# 7.5 Noise Robustness

Three places to inject noise, three different regularising effects. The section's value is in showing
that the same intervention has a different mathematical meaning depending on where it is applied.

## Noise on the inputs

For some models, adding noise of small variance to the input is **equivalent to imposing a norm penalty
on the weights**. The book attributes the result to Bishop (1995). The equivalence is not general, but
where it holds it explains why input noise regularises rather than merely degrades.

## Noise on the weights

Adding noise to the weights themselves, primarily in recurrent networks, has a different interpretation.
It is a stochastic implementation of a Bayesian treatment, in which the weights are uncertain and that
uncertainty is represented by a distribution.

The book works through the case of a regression network and shows that weight noise is equivalent, for
small noise variance, to an additional penalty term proportional to

$$
\mathbb E \left[ \lVert \nabla_W \hat y(x) \rVert^2 \right]
$$

a penalty on the **squared norm of the gradient of the output with respect to the weights**. The effect
is to push parameters toward regions where small perturbations of the weights have little effect on the
output — flat regions, in the sense of points surrounded by flat basins rather than merely stationary
points.

## Noise on the labels

Most datasets have some mislabelled examples, and a model trained on hard $0$ and $1$ targets with a
softmax output can never satisfy them — the softmax never reaches exactly $0$ or $1$, so training pushes
the weights toward ever larger magnitudes without bound.

**Label smoothing** replaces the hard targets with $1 - \epsilon$ and $\epsilon / (k - 1)$ for $k$
classes. The cross-entropy now has a finite minimum, and the model can be trained without the weight
norms diverging.

## My take

The flat-minima result is the most interesting thing here and it prefigures a decade of subsequent work.
The claim is that weight noise finds solutions insensitive to weight perturbations, and the argument
that such solutions generalise better became a substantial research programme — entropy-SGD,
sharpness-aware minimisation, and the whole debate about whether large-batch training generalises worse
because it finds sharper minima. The book states the mechanism in three lines and does not pursue it.

The claim is also contested, and it is worth knowing why. Sharpness is not invariant to reparameterisation
— rescaling weights in one layer and inversely in the next changes the curvature without changing the
function at all — so "flat minima generalise better" is not well defined until the measure of flatness is
pinned down. The intuition is durable; the theorem is not.

Label smoothing is the practical item to take away, and its logic is worth stating in the form the
section implies: **a target a model cannot represent is a target that will destabilise it.** Asking a
softmax for a probability of exactly one is asking for an infinite logit, and the optimiser will
cheerfully spend the rest of training pursuing it. That failure mode is the same one as separable
logistic regression in 7.3, arriving by a different route.
