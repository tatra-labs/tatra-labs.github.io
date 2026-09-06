# 9.9 Random or Unsupervised Features

The most expensive part of training a convolutional network is supervised learning of the features. This
section asks how much of that cost is necessary, and reports a surprising answer.

## Three cheaper options

**Random filters.** Simply initialise the kernels randomly and never train them. The book reports that
this works remarkably well: layers consisting of random convolution followed by pooling naturally become
frequency-selective and translation-invariant, without any learning at all. The explanation offered is
that convolution and pooling supply so much structure that random weights already implement something
useful.

**Unsupervised learning of the kernels.** Learn features from unlabelled data, for instance by applying
k-means to small image patches and using each centroid as a filter. This decouples feature learning from
the classifier entirely.

**Greedy layer-wise pretraining.** Train the first layer in isolation, extract its output for the whole
dataset, train the second layer on that, and so on — the convolutional analogue of the deep belief
network procedure.

The book gives a practical use for random filters that is more interesting than the observation itself:
because they are free, an **architecture search** can be run with random weights. Evaluate many candidate
architectures cheaply with untrained filters, then fully train only the best. It also notes an
intermediate option — learn the features once and never revisit them, avoiding a full forward and
backward pass through the whole network on every gradient step.

## My take

The random-filter result is worth taking seriously because of what it says about where the performance
comes from. If random kernels plus rectification plus pooling already give frequency selectivity and
translation invariance, then a substantial part of a convolutional network's advantage is **the
architecture, not the learning**. That is the infinitely-strong-prior argument of 9.4 supported by direct
evidence, and it should temper the instinct to attribute everything to what was learned.

The idea has a live descendant in **extreme learning machines** and reservoir computing, where a random
nonlinear expansion is followed by a trained linear readout — the same bet, made in a different community.
Echo state networks in Section 10.8 are the recurrent version.

The layer-wise and unsupervised routes did not survive, for the reason Section 15.1 gives directly: with
enough labelled data and a working optimiser, end-to-end supervised training is simply better, and the
pretraining stage stopped earning its cost. The authors were writing at the moment that conclusion became
clear for vision.

What is worth flagging is that the conclusion reversed once more, at a scale nobody could test in 2016.
Pretraining came back — not layer by layer, not with k-means, but on an unlabelled corpus large enough to
change the arithmetic. This section's methods were the right idea evaluated with three orders of magnitude
too little data.
