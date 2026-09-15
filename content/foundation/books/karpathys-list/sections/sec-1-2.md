**Andrej Karpathy · 2016 · [Medium](https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b)**

The essay exists because students complained. CS231n made them implement forward and backward passes by hand in raw NumPy, and the objection was reasonable: TensorFlow computes gradients automatically, so why spend a week on the derivative of a matrix multiply?

Karpathy's answer is that **backpropagation is a leaky abstraction** — a convenience that mostly hides the thing underneath, except when it does not. And the leaks are not exotic. They are the ordinary failure modes of training, and they are invisible unless you know what the backward pass does.

**The examples are the essay.**

**Saturated sigmoids.** A sigmoid squashes any number into the range 0 to 1, and its slope is $\sigma(z)(1 - \sigma(z))$ — which peaks at `0.25` in the middle and falls to zero at both ends. Initialise the weights too large and every unit's input lands out in one of those flat tails. The whole network then multiplies the incoming gradient by approximately zero and nothing moves. The forward pass looks completely fine. The loss is simply flat, and no error is raised anywhere.

**Dead ReLUs.** A ReLU is $\max(0, z)$ — pass positive numbers through, clamp negatives to zero — and its gradient behaves like a gate: gradient passes unchanged when the unit is active and nothing passes when it is not. Now note what that means. A single large update can push a unit far enough negative that it never activates on *any* training example again, at which point it receives no gradient forever and can never come back. Karpathy's figure is that with a learning rate set too high you can find `40%` of a network dead — and the network still trains, just with a large fraction of its capacity permanently switched off. Again, no error.

**Exploding and vanishing gradients in RNNs.** The same recurrent matrix appears at every timestep, so tracing gradient back through $T$ steps involves that matrix multiplied by itself roughly $T$ times. If its largest scaling factor is above one the gradient explodes; below one and it vanishes. Clipping addresses the first. The second is the entire reason LSTMs exist — and Karpathy's point is that plain RNNs remain the default only because the failure is silent.

The framing generalises past its examples, which is why it has aged well. The claim is not that automatic differentiation is bad. It is that **a differentiable program can fail in ways only visible in the backward pass**, and the forward pass will not tell you. Every abstraction the field has added since has widened the gap the essay describes.

> The forward pass tells you the network computed something; only the backward pass tells you whether it can learn.

**What did not survive:** most of the specific pathologies. Those three examples were the live problems of 2016 and they have largely been engineered away — sensible initialisation schemes, batch and layer normalisation, residual connections that hand gradient an unobstructed path, and activations like GELU and SwiGLU that have no hard zero-gradient region. A modern transformer will not die the way a 2016 ReLU stack died. What survived is the argument, and it has strengthened: the stack is now several layers thicker than TensorFlow was, and someone debugging a fine-tune through a trainer wrapper, a parameter-efficient adapter and a distributed sharding strategy is further from the arithmetic than any CS231n student ever was. The title is still the correct advice; only the list of things that break has been replaced.
