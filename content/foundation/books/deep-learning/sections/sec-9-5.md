# 9.5 Variants of the Basic Convolution Function

The convolution used in practice differs from the mathematical operation in several ways. This section
enumerates them, and between them they account for most of the hyperparameters in a convolutional layer.

## Channels

Real layers do not apply one kernel but many, in parallel, so that a layer can extract several kinds of
feature at every location. The input likewise has multiple channels — three for a colour image, and as
many as the previous layer produced thereafter. The kernel is therefore a 4-D tensor: output channel,
input channel, and two spatial offsets.

## Stride

To reduce computation, the kernel can be applied at every $s$-th position rather than at every position.
This is a **strided convolution**, and it is equivalent to full convolution followed by downsampling —
with the saving that the discarded outputs are never computed.

## Zero-padding

Without padding, the representation shrinks by one less than the kernel width at every layer, which
forces either tiny kernels or shallow networks. Padding the input with zeros decouples the two. The book
names three cases:

- **Valid** — no padding. Output shrinks each layer, and pixels near the border are visited by fewer
  kernel positions than interior ones.
- **Same** — enough padding to keep the output the same size as the input. This is the usual choice, and
  the book notes its drawback: border pixels are underrepresented in the model relative to interior ones.
- **Full** — enough padding for every pixel to be visited the same number of times. Output grows, and the
  border units are hard to learn well because they see few real inputs.

The book's guidance is that the optimum is usually somewhere between valid and same.

## Unshared and tiled convolution

A **locally connected layer** — sometimes called unshared convolution — keeps the sparse connectivity but
drops the parameter sharing, so every position has its own weights. It is the right choice when a feature
is known to be a function of a small local region *and* is not expected to recur elsewhere in the image.

**Tiled convolution** is the compromise: learn a set of kernels and rotate through them as position
changes, so that neighbouring positions use different filters but the parameter count stays bounded.

## Back-propagation

The section closes with the observation that training a convolutional network needs more than the
convolution operation itself. The gradient with respect to the kernel and the gradient with respect to
the input are each computed by their own operations, and the transpose of convolution is what
reconstructs an input-shaped tensor from an output-shaped one.

## My take

The padding discussion is the most practically consequential part and it is worth being explicit about the
consequence. `same` padding is nearly universal, and it means the model treats border pixels differently
from interior ones — which has been shown to let a network infer absolute position from the border
artefacts, quietly undermining the translation invariance the architecture is supposed to provide. It is a
small effect and a real one, and this section is where its origin is described.

Locally connected layers had a brief life in face recognition, where the assumption holds — a face image
is aligned, so the eye region really is a different problem from the mouth region — and disappeared with
their parameter cost. Tiled convolution disappeared entirely.

The transpose-of-convolution operation mentioned in the last paragraph became far more important than its
treatment here suggests. It is the upsampling primitive in every generator and segmentation decoder,
usually named `ConvTranspose`, and the checkerboard artefacts it produces when stride and kernel size are
mismatched are a well-known failure the book does not anticipate.
