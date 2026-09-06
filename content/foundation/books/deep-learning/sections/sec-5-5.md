# 5.5 Maximum Likelihood Estimation

The previous section described how to evaluate an estimator. This one gives a principle for *deriving*
one, and it is the principle almost all of deep learning uses.

## The estimator

Given examples drawn independently from an unknown $p_{\text{data}}$ and a parametric family
$p_{\text{model}}(x; \theta)$, the maximum likelihood estimate is the parameter making the observed data
most probable:

$$
\theta_{ML} = \arg\max_{\theta} \sum_{i=1}^{m} \log p_{\text{model}}\left( x^{(i)}; \theta \right)
$$

The product over examples has been turned into a sum of logarithms — the same value maximised, without
the underflow that multiplying $m$ small probabilities would cause. Dividing by $m$ changes nothing and
turns the sum into an expectation under the **empirical distribution**.

## The reinterpretation as KL divergence

Written that way, maximum likelihood is

$$
\arg\min_{\theta} D_{KL}\left( \hat p_{\text{data}} \parallel p_{\text{model}} \right)
$$

The term involving only $\hat p_{\text{data}}$ does not depend on $\theta$, so minimising the divergence
is minimising the cross-entropy, which is minimising the negative log-likelihood. **Maximum likelihood,
cross-entropy minimisation and KL minimisation are three names for one procedure.**

The **conditional** version, which is what supervised learning uses, conditions on inputs:

$$
\theta_{ML} = \arg\max_{\theta} \sum_{i=1}^{m} \log P\left( y^{(i)} \mid x^{(i)}; \theta \right)
$$

The book then shows that linear regression under squared error is exactly maximum likelihood with
$p(y \mid x) = \mathcal{N}(y; \hat{y}(x; w), \sigma^2)$. Squared error is not an independent choice of
loss — it is the Gaussian assumption written out.

## Why it is the default

Under conditions the book states — the true distribution lies in the model family, and does so for
exactly one parameter value — the maximum likelihood estimator is **consistent**. It is also
**efficient**: no consistent estimator has lower mean squared error asymptotically, a result formalised
by the Cramér-Rao lower bound. For small $m$, regularisation can still do better by trading bias for
variance.

## My take

This is the most useful section in Chapter 5, because it collapses a long list of apparently arbitrary
choices into one.

Cross-entropy for classification, squared error for regression, $L^1$ loss as the Laplace assumption,
Poisson loss for counts — none of these are heuristics. Each is the negative log-likelihood under a
particular assumption about the noise, and choosing a loss *is* choosing a noise model whether or not the
practitioner realises it. A great deal of loss-function engineering is really distributional assumption
engineering conducted without naming the distribution.

The direction of the KL is the other thing to carry forward. Maximum likelihood minimises
$D_{KL}(p_{\text{data}} \parallel p_{\text{model}})$, the mode-covering direction from Section 3.13. It
punishes the model severely for assigning near-zero probability to data that occurred and barely at all
for assigning mass to regions that never occur. That single asymmetry is why likelihood-trained
generative models produce blurry, over-dispersed samples, and it is the gap that adversarial training in
Chapter 20 was invented to close.

Worth noting the assumption that fails in practice: consistency requires the true distribution to be in
the model family. It never is. What is guaranteed instead is convergence to the closest point in the
family under KL — which is a weaker and more honest statement than "the estimator recovers the truth".
