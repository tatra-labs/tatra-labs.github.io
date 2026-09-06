# 6.3 Hidden Units

The book opens this section by admitting that hidden unit design is an active research area with no
governing theory, and that the honest procedure is to guess and evaluate. What follows is a catalogue
ordered by how well the guesses have worked.

## Rectified linear units

The default recommendation:

$$
g(z) = \max\lbrace 0, z \rbrace
$$

Applied to an affine transformation $W^{\top} x + b$, with the advice to initialise $b$ to a small
positive value such as $0.1$ so that units start active for most inputs.

The ReLU is easy to optimise because it is nearly linear. Its gradient is either $0$ or $1$ — large and
consistent wherever the unit is active, with no second-order effects to distort the direction of descent.

It is **not differentiable at zero**, which the book addresses directly rather than dismissing. Gradient
descent still works, for two reasons: training does not reach an exact minimum, so the probability of
landing precisely at zero is negligible; and software returns a one-sided derivative there rather than
reporting an error. The authors note this is a case where a heuristic justification is all that is
available, and that it is empirically sound.

The drawback is that a unit cannot learn through examples where it is inactive, because the gradient is
exactly zero.

## Generalisations

All three fix the zero gradient by giving the negative side a slope:

$$
h_i = \max(0, z_i) + \alpha_i \min(0, z_i)
$$

**Absolute value rectification** fixes $\alpha = -1$, giving $\lvert z \rvert$ — used in image recognition
where a feature should be invariant to polarity. **Leaky ReLU** fixes $\alpha$ to something small like
$0.01$. **PReLU** learns it.

**Maxout** generalises differently. It splits $z$ into groups of $k$ and outputs the maximum within each,
so the unit learns a piecewise-linear convex activation with up to $k$ pieces rather than applying a
fixed one. It costs $k$ times the parameters and has redundancy that resists catastrophic forgetting.

## Sigmoid and tanh

Before rectifiers, these were the default. Both saturate across most of their domain, which makes them
poor hidden units — usable only when the cost function undoes the saturation, which is available at the
output but not in the middle of a network.

When a sigmoidal unit is required, $\tanh$ is usually the better choice, because $\tanh(0) = 0$ and it
resembles the identity near the origin, so early training behaves like training a linear network. The
logistic sigmoid is centred at $0.5$ and does not have this property.

Sigmoidal units remain common in recurrent networks and in gates, where saturation is the desired
behaviour rather than an obstacle.

## Others

The section closes with several units that exist and are rarely used: no activation at all, which
factorises one weight matrix into two and can reduce parameters; softmax as a switch; radial basis
functions, which saturate to zero almost everywhere and are hard to optimise; **softplus**, which the
authors explicitly discourage despite it being the smooth version of the rectifier, because it
empirically performs *worse*; and hard tanh.

## My take

The softplus finding is the most instructive result in the section, and the authors flag it as
counterintuitive on purpose. Softplus is everywhere differentiable and non-saturating, so the theory
predicts it should be at least as good as ReLU. It is not. That result should temper how much weight one
puts on smoothness arguments in activation design — and it is a warning that the field's explanations for
why ReLU works are post-hoc.

What the section could not know is which of these survived. Leaky ReLU and PReLU remain marginal; maxout
essentially disappeared, its parameter cost never justified. The units that displaced ReLU in modern
architectures — GELU and SiLU/swish — are both *smooth* approximations to it, which sits awkwardly beside
the softplus result and suggests the relevant property was never smoothness alone but the shape near the
origin. Gating, the maxout idea of letting the network choose among linear pieces, survived too, but
inside attention and mixture-of-experts routing rather than as an activation function.
