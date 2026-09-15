**Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun · 2016 · [arXiv:1603.05027](https://arxiv.org/abs/1603.05027)**

The original block was not the clean identity path it is usually drawn as. It computed $x_{l+1} = \operatorname{ReLU}(x_l + F(x_l))$ — the addition happened, and then a ReLU sat on the result. Look at where that ReLU is: on the trunk, not on the branch. So a signal travelling from layer 1 to layer 1000 passed through a thousand nonlinearities anyway, and the shortcut was not really a shortcut. At ordinary depths nobody noticed. At extreme depth it showed, and the warmup schedule the last section needed was a symptom of it.

This paper writes the block in general form — $y_l = h(x_l) + F(x_l)$ then $x_{l+1} = f(y_l)$ — and asks what happens when *both* $h$ and $f$ are left as the identity, so that nothing at all sits on the trunk.

**The forward pass then telescopes.** Each layer adds its contribution onto a running total and passes it on untouched, so any deep activation is just a shallow one plus a sum of residuals, $x_L = x_l + \sum F(x_i)$ — a sum, where the old design gave a product of transforms. Differentiating that sum gives the reason it matters:

$$
\frac{\partial E}{\partial x_l} = \frac{\partial E}{\partial x_L} \cdot \left( 1 + \frac{\partial}{\partial x_l} \sum F \right)
$$

**The $1$ is the whole point.** The term that can shrink is *added* to a constant rather than multiplied into one, so no product of small derivatives can ever drive the path to zero. The gradient always has a clean road home. Making $f$ the identity means the nonlinearity has to go somewhere, and it moves to the head of the branch: normalise, ReLU, convolve, normalise, ReLU, convolve, then add onto the shortcut with nothing afterwards.

**The ablations are what make the argument stick**, and one of them is worth reading twice. On ResNet-110/CIFAR-10 the plain identity shortcut gives 6.61% error. Putting a $1 \times 1$ convolution on the shortcut gives 12.22%. That convolution is strictly *more* expressive than an identity — it can represent the identity and more besides — and it loses by over five points. A more powerful model doing worse locates the problem squarely in optimisation rather than capacity. Scaling both shortcut and branch by 0.5 gives 12.35%; scaling only the shortcut fails to converge at all, as does dropout on the shortcut; the best gating variant reaches 8.70%. Ordering matters the same way: normalisation after the addition 8.17%, ReLU before the addition 7.84%, ReLU-only pre-activation 6.71%, full pre-activation 6.37%.

With the reordered unit the 1001-layer CIFAR-10 network reaches 4.92% against 7.61% for the same depth built the old way, and CIFAR-100 at that depth goes from 27.82% to 22.71%. On ImageNet at 320×320 crops, ResNet-200 improves from 21.8%/6.0% to 20.7%/5.3% top-1/top-5. Warmup is no longer needed. The rule — keep the residual stream unmodulated, put the normalisation inside the branch — is what pre-LN transformers adopted, and it is why the residual stream described above stayed a clean sum rather than accumulating gates.

> Keep the residual stream free of everything but additions, and the gradient path becomes $1 + \text{something}$ instead of a product.

**What did not survive:** the 1000-layer network. At ResNet-110 the gain over the original block was 0.24 points, so the real payoff arrives only at depths nobody ever deployed; width and better blocks bought more than depth did. The paper also names its own limit — the original ResNet-200 had *lower* training error than ResNet-152 and worse validation error, which is the signature of overfitting, so part of what pre-activation fixed on ImageNet was normalisation placement rather than gradient flow. The ResNet-50 shipped in most vision libraries is still the 2015 post-activation block.
