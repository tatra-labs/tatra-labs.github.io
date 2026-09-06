# 4.3 Gradient-Based Optimization

The longest section in Chapter 4 and the one the rest of the book runs on. It builds from the derivative
of a scalar function to the second-order structure that explains why training behaves as it does.

## First order

Optimisation means minimising or maximising $f(x)$ by altering $x$; maximisation is minimisation of
$-f(x)$, so only one case needs treatment. The derivative gives the slope, and therefore the direction of
improvement: moving $x$ by a small $\epsilon$ in the direction of $-\operatorname{sign}(f'(x))$ decreases
$f$. This is **gradient descent**, and in multiple dimensions the update is

$$
x' = x - \epsilon \nabla_x f(x)
$$

with $\epsilon$ the **learning rate**. The gradient points in the direction of steepest ascent because,
among all unit directions $u$, the directional derivative $u^{\top} \nabla_x f(x)$ is minimised when $u$
points opposite the gradient — a direct consequence of the cosine identity in 2.5.

Points with zero gradient are **critical points**: local minima, local maxima, or **saddle points**,
which are minima along some directions and maxima along others. A **global minimum** may not be unique
and may not be reached; the book is blunt that in deep learning one settles for a low value of $f$ rather
than a formally optimal one.

For a function $f: \mathbb{R}^m \to \mathbb{R}^n$, all first partial derivatives form the **Jacobian**
$J$ with $J_{i,j} = \partial f_i(x) / \partial x_j$.

## Second order

The second derivative measures curvature, and answers a question the gradient cannot: how much will a
gradient step actually improve things? With zero curvature the gradient predicts the improvement exactly.
With negative curvature the function falls faster than predicted; with positive curvature it falls more
slowly, and a step may overshoot.

The matrix of all second partials is the **Hessian**, $H_{i,j} = \partial^2 f / \partial x_i \partial x_j$
— symmetric wherever the partials are continuous, so 2.7 applies. Approximating $f$ near $x^{(0)}$ by its
second-order Taylor expansion and taking a gradient step gives an optimal step size, for a Hessian with
largest eigenvalue $\lambda_{\max}$, of $1/\lambda_{\max}$ in the worst case.

The **second derivative test** classifies critical points by the eigenvalues of the Hessian: all positive
is a local minimum, all negative a local maximum, mixed signs a saddle. Zero eigenvalues leave the test
inconclusive.

The condition number of the Hessian is where 4.2 lands. When it is large, gradient descent performs
poorly: the step size must be small enough to avoid overshooting in the sharpest direction, which makes
progress in the flattest direction painfully slow.

**Newton's method** uses the curvature directly, jumping to the minimum of the quadratic approximation:

$$
x^{\ast} = x^{(0)} - H^{-1} \nabla_x f(x^{(0)})
$$

For a genuinely quadratic function this reaches the minimum in one step. For a non-quadratic one it must
be iterated, and it is actively harmful near a saddle point, where it is attracted to the critical point
rather than repelled from it.

Algorithms using only the gradient are **first-order**; those using the Hessian are **second-order**.
Guarantees in deep learning are scarce, and the book notes that the two available restrictions are
**Lipschitz continuity** — bounding how fast a function can change — and **convexity**, which for a
twice-differentiable function means a positive semidefinite Hessian everywhere, ruling out saddle points
entirely.

## My take

The saddle-point remark is the most important sentence in the section and it is easy to read past. The
folk belief that neural network training gets stuck in bad local minima is largely wrong, and the reason
is in the second derivative test: for a critical point to be a local minimum, *every* eigenvalue must be
positive. In a space with millions of dimensions, that is an extraordinary coincidence. Saddle points
overwhelmingly dominate, which is why Newton's method — designed to seek critical points — is the wrong
tool for this problem, and why Section 8.2 has to be read as a correction to standard optimisation
intuition rather than an application of it.

The other thing worth noticing is that convexity, which most optimisation theory assumes, buys almost
nothing here. The book says so directly. Deep learning kept the algorithms from convex optimisation and
discarded the guarantees, and every empirical result in Chapter 8 exists because the theory does not
cover the case.
