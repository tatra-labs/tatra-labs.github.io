# 9.3 Pooling

The third stage of a typical convolutional layer, after the convolution and the nonlinearity. It replaces
the output at a location with a summary of its neighbourhood.

## The operation

**Max pooling** reports the maximum within a rectangular window. Other choices are the average, an $L^2$
norm, or a weighted average based on distance from the centre.

The purpose is **invariance to small translations**: if the input shifts by a small amount, most pooled
outputs do not change, because the maximum of a window is insensitive to where within the window it
occurred. This is the right property when the *presence* of a feature matters more than its exact
position — the book's example is detecting a face, where knowing an eye is on the left side matters and
knowing its pixel coordinate does not.

## Downsampling

Pooling is usually combined with a stride, reporting one summary per $k$ positions rather than per
position. This reduces the size of the representation, cutting memory, parameter count in later layers,
and compute. It also lets a network accept **variable-sized inputs** while producing a fixed-size output
for a classifier — the pooling regions are sized as a fraction of the image rather than fixed, so the
number of outputs stays constant.

## Learned invariances

The book makes a further point that is easy to miss. Pooling over the outputs of *separately parameterised*
convolutions lets the network **learn which transformations to become invariant to**, rather than having
translation invariance imposed. If three filters detect the same digit at three rotations, max pooling
over them yields a rotation-invariant detector — and which invariance is acquired depends on what the
filters learned.

## My take

Pooling is the part of the classical convolutional stack that has most clearly lost ground, and the
reasons are worth stating because they are not the obvious ones.

The main objection is that pooling **discards spatial information**, which is fine for classification and
harmful for anything else. Segmentation, detection and generation all need to know where things are, and
architectures for those tasks either avoid pooling or work hard to recover what it threw away — which is
what the encoder-decoder skip connections in U-Net are for.

The replacement in practice is a **strided convolution**, which downsamples while learning how to
summarise rather than applying a fixed maximum. It costs parameters and it is strictly more general.
Modern convolutional architectures typically keep a single global average pool at the very end, where
invariance is genuinely wanted, and use strided convolutions everywhere else.

The invariance argument also deserves a caveat the section does not give. Pooling provides invariance only
to translations smaller than the pooling window; stacking layers extends the range but slowly, and a
convolutional network is far less translation-invariant in practice than the theory suggests. Data
augmentation does more of that work than the architecture does.

The learned-invariance idea in the last paragraph is the most interesting thing here and the least
pursued. It is the same idea as maxout in 6.3 — let the network choose among alternatives rather than
fixing the choice — and it points at what attention later delivered properly.
