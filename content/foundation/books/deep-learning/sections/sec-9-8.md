# 9.8 Efficient Convolution Algorithms

Convolution is the dominant cost in a convolutional network, so the section on making it faster is short,
practical, and entirely about constant factors.

## Three routes

**The Fourier transform.** Convolution is equivalent to pointwise multiplication in the frequency domain,
so one route is to transform both input and kernel, multiply, and transform back. For some problem sizes
this is faster than the direct evaluation.

**Separable kernels.** When a $d$-dimensional kernel can be expressed as the outer product of $d$ vectors,
it is **separable**, and applying the $d$ one-dimensional convolutions in sequence is equivalent to
applying the full kernel. The saving is substantial: for a kernel of width $w$ in $d$ dimensions, the
naive approach costs on the order of $w^d$ operations and parameters, while the separable version costs
$w \times d$. Not every kernel is separable, so the trick is not universally available.

**Approximation.** The book notes that algorithms giving approximate convolutions can improve speed
without measurably harming accuracy, and that even devising faster ways to compute exact convolutions is
an active research area.

## My take

This is the most dated section in the chapter, and instructively so, because what actually made
convolution fast was none of the three.

The dominant implementation is **im2col plus GEMM**: unroll the overlapping patches of the input into a
large matrix, then call a general matrix multiply. This wastes memory by duplicating input values, and it
wins anyway, because a dense matrix multiply is the single most heavily optimised operation in
computing. Vendor libraries then specialise further, and Winograd's algorithm — which reduces the
multiply count for small kernels — is what cuDNN typically selects for the $3 \times 3$ case. FFT
convolution exists in those libraries and is chosen only for large kernels, which are rare.

The general lesson is worth more than the specifics: **the fastest algorithm on paper is often not the
fastest on hardware**. Arithmetic complexity stopped being the binding constraint once memory bandwidth
and cache behaviour started dominating, and an algorithm that does more FLOPs in a shape the hardware
likes beats one that does fewer in a shape it does not.

The separability idea did have a major second life, though not in the form given here. **Depthwise
separable convolution** — factorising a standard convolution into a per-channel spatial convolution
followed by a $1 \times 1$ convolution mixing channels — is the same decomposition applied across the
channel axis instead of the spatial one, and it is the core of MobileNet, Xception and most efficient
architectures since. The factor it saves is roughly the number of output channels, which is far larger
than the spatial saving described in the book.
