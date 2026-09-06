# 9.6 Structured Outputs

Most of the chapter assumes the network produces a class label. This short section covers the case where
it produces a tensor with spatial structure of its own.

## The setting

A convolutional network can emit a high-dimensional structured object rather than a single prediction —
typically a tensor $S$ where $S_{i,j,k}$ is the probability that pixel $(j, k)$ belongs to class $i$.
This is **semantic segmentation**: label every pixel, not the image.

The obstacle the book identifies is size. The output is generally smaller than the input, because pooling
with a large stride shrinks the representation. Three responses are given:

- Avoid pooling altogether.
- Use pooling with a stride of one, which keeps the resolution while still summarising.
- Emit a lower-resolution grid of labels and accept the coarseness.

## Iterative refinement

The strategy the book describes at most length is to produce an initial guess of the labels and then
refine it, using a network that takes both the image and its own previous output. If the same parameters
are used at each refinement step, this is a **recurrent** convolutional network — successive passes over
the same image, each correcting the last.

Once labels are produced, a further step can group neighbouring pixels into regions, and the book
mentions architectures that assign each pixel to a segment and then merge.

## My take

This is the least-aged section of Chapter 9 in its problem statement and the most-aged in its solutions.
The problem — output resolution lost to downsampling — is exactly right, and the three responses listed
are all worse than the two that arrived shortly after.

**Encoder-decoder with skip connections** is the answer that won. Downsample as usual to build up
semantic content, then upsample back with transposed convolutions, and connect each encoder stage to the
matching decoder stage so that fine spatial detail lost on the way down is reinjected on the way up. U-Net
published this in 2015, the year before the book, and it remains the standard architecture for
segmentation and — significantly — for the denoiser inside a diffusion model.

**Dilated convolutions** are the other answer: enlarge the receptive field by spacing out the kernel taps
rather than by pooling, so resolution is never lost in the first place. That gives the third option in the
book's list without the coarseness that motivated rejecting it.

The iterative-refinement idea, which the book gives the most space, is the one that went nowhere in
segmentation. It is worth noting where it did reappear, though: a model that repeatedly refines its own
output using shared parameters is precisely the structure of a diffusion model's sampling loop. The
mechanism found its application in generation rather than in labelling.
