**Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun · 2015 · [arXiv:1512.03385](https://arxiv.org/abs/1512.03385)**

By late 2015 depth was clearly worth something — VGG and GoogLeNet had both bought accuracy by stacking more layers — and then the returns stopped abruptly. Somewhere past twenty layers, adding more made the network worse.

**The important part is that this did not look like overfitting.** Overfitting means fitting the training data too well and the test data badly. Here, on CIFAR-10, a 56-layer plain convolutional network had higher error on the data it was *trained on* than a 20-layer one. A model that cannot even fit its own training set is not memorising; it is failing to optimise.

The paper sharpens this into a construction that is worth holding in your head. Take a trained shallow network. Bolt extra layers on top that do nothing at all — that just pass their input straight through. The deeper network now computes exactly what the shallower one did, so it must score exactly as well. **A solution at least that good provably exists in the parameter space. Gradient descent simply did not find it.** The problem is the search, not the model.

**The fix changes what each block is asked to represent.** A standard block takes $x$ and must produce the whole desired output $H(x)$. A residual block instead computes $y = F(x, \lbrace W_i \rbrace) + x$ — the stacked layers produce $F$, and then the original input is added straight back on. So the block's job is only the *difference* between what came in and what should go out.

Now revisit the thought experiment. If the right thing to do is leave the signal alone, $F$ merely has to go to zero — and pushing weights toward zero is exactly what initialisation and weight decay already do. Under the old formulation, that same do-nothing behaviour required several layers of nonlinearity to conspire into an exact identity, which is a far harder target to hit.

The shortcut costs nothing: no parameters, no multiplications. Where a block changes the number of channels or the spatial size it becomes a small projection, $y = F(x, \lbrace W_i \rbrace) + W_s x$. The deepest models use a bottleneck block — a $1 \times 1$ convolution to cut the channel count, a $3 \times 3$ at the reduced width, a $1 \times 1$ to restore it — so cost stays flat as depth grows.

The measurements separate cause from correlation carefully. At 18 layers, where plain networks train fine, the two are level: 27.94% top-1 for plain, 27.88% for residual. At 34 layers the plain net degrades to 28.54% while the residual one *improves* to 25.03%. The benefit appears exactly where the problem appears. ResNet-152 runs at 11.3 billion FLOPs, below VGG-16 and VGG-19 at 15.3 and 19.6 billion. An ensemble reached 3.57% top-5 on the ImageNet test set and first place at ILSVRC 2015, and the same features gave a 28% relative improvement on COCO detection.

What changed is that the shortcut stopped being an architecture choice and became default wiring. The construction outlived vision entirely: a transformer's residual stream is this same object, with attention and MLP blocks writing increments into a vector that is carried forward unchanged. The paper earns its place as a training result that happened to be demonstrated on images.

> Make "do nothing" the easy thing for a block to express, and depth stops fighting the optimizer.

**What did not survive:** the explanation, and the block itself. The authors are candid that they have no account of the underlying failure — "the reason for such optimization difficulties will be studied in the future" — so the result arrived without one. Depth also stopped paying almost immediately: the 1202-layer CIFAR network reached 7.93% test error against the 110-layer network's 6.43%, and that 110-layer net still needed a warmup at learning rate 0.01 for roughly 400 iterations because 0.1 was too large to start converging at all. Within months the same four authors rewired the block, which is the next section.
