Most of the formats in Part II exist in several sizes because of one idea: store each weight as a
small integer, and store once, for a whole block of weights, the number that turns those integers
back into real values. Everything in this Part is a variation on that sentence. This section builds
it from the ground up and lets you run it.

(For what the bits inside a floating-point number do — why BF16 and FP16 differ, what E4M3 means —
see this site's [Where to Spend the Bits](/post/where-to-spend-the-bits). Here the question is how to
spend fewer of them on a trained model.)

## One scale, many integers

Take a block of $g$ weights $w_1 \dots w_g$. Pick a scale $s$ so that the largest weight lands on the
largest integer you can store, round everything else, and keep $s$:

$$s = \frac{\max_i \lvert w_i\rvert}{q_{\max}}$$

$$q_i = \mathrm{round}\left(\frac{w_i}{s}\right), \qquad \hat w_i = s \, q_i$$

With 4 bits there are 16 integers, so $q_{\max}$ is about 7 or 8, and every weight is off by at most
half a step, $s/2$. The file stores the $g$ integers and one scale. That is **Q4_0**, the original
llama.cpp type: 32 weights, 32 four-bit integers and one 16-bit scale, 18 bytes in all.

The cost of a scheme is its *bits per weight*, and the scale is part of it:

$$b = b_{\text{element}} + \frac{b_{\text{scale}}}{g}$$

| Scheme | Element | Scale | Block $g$ | Bits per weight |
|---|---|---|---|---|
| Q8_0 (GGUF) | 8-bit int | FP16 | 32 | 8 + 16/32 = **8.5** |
| Q4_0 (GGUF) | 4-bit int | FP16 | 32 | 4 + 16/32 = **4.5** |
| MLX 4-bit | 4-bit int | FP16 scale + FP16 bias | 64 | 4 + 32/64 = **4.5** |
| GPTQ, group 128 | 4-bit int | FP16 scale + 4-bit zero | 128 | 4 + 20/128 ≈ **4.16** |
| MXFP4 (OCP) | 4-bit float | 8-bit power of two | 32 | 4 + 8/32 = **4.25** |
| NVFP4 (NVIDIA) | 4-bit float | 8-bit float | 16 | 4 + 8/16 = **4.5** |

<p class="fig-note">NVFP4 also keeps one 32-bit scale per tensor, which rounds to nothing per weight. Sources in sections 4.2 and 4.3.</p>

## Why blocks: the outlier problem

Why not one scale for the whole tensor, and save the overhead? Because the scale is set by the
largest value, and trained weights have a few values much larger than the rest. With one scale per
tensor, a single outlier stretches the step for millions of weights, and most of them round to zero.
With one scale per block, the damage stays inside that block's 16 or 32 weights.

Try it. Each bar below is a real-valued weight; each square is what the file would store. Switch
schemes, toggle the outlier, and watch the *rounded to zero* count.

<figure class="fig">
<span class="fig-title">Playground &#183; Quantize 32 weights by hand</span>
<div data-widget="quantizer" data-scheme="Q4_0" data-outlier><p class="pg-note">The quantizer needs JavaScript.</p></div>
<figcaption>The weights are drawn from a normal distribution; &#8220;One outlier&#8221; makes one of them roughly ten times the typical size, the way trained weights occasionally are. The maths follows ggml&#8217;s reference quantizers for Q8_0, Q4_0 and Q4_1 and the published definitions of MXFP4 and NVFP4. Error is measured on the 31 ordinary weights, so the outlier&#8217;s own error does not count.</figcaption>
</figure>

Four things to notice. With the outlier on, **Q4_0** sends between a third and a half of the block to
zero, because its step is now an eighth of the outlier. **NVFP4** roughly halves that error, because
its blocks are 16 wide and the outlier ruins only one of the two. **MXFP4**'s scale must be a power
of two, so it can land up to twice too coarse — the format's known weakness, and the reason NVIDIA
added a finer scale to its own version ([section 4.3](/post/whats-in-a-model-file?section=sec-4-3)).
And with the outlier *off*, the 4-bit floats are no better than the humble integers — often worse.
That matches a 2025 study's conclusion that "FP4 is not an automatic upgrade over INT4"
([Egiazarian et al.](https://arxiv.org/abs/2509.23202)); what the float formats buy is hardware
support, which [section 4.3](/post/whats-in-a-model-file?section=sec-4-3) covers.

## Integers or floats?

The integer grid is evenly spaced. A 4-bit *float* (E2M1) can represent only
0, ±0.5, ±1, ±1.5, ±2, ±3, ±4 and ±6 times its scale: dense near zero, sparse far out.
In principle that suits trained weights, which are roughly bell-shaped with most values near zero;
in practice, inside a block of 16 or 32, the gain is small, as the quantizer shows. Switch the quantizer to NVFP4 or MXFP4 and the dashed lines — the values the block can
represent — bunch up around the middle. The same idea taken further gives *non-uniform* codebooks:
bitsandbytes' NF4 places its 16 levels at the quantiles of a normal distribution
([QLoRA](https://arxiv.org/abs/2305.14314)), and GGUF's IQ4_NL uses a fixed table of 16 unevenly
spaced values.

## Rounding smarter than to-the-nearest

Everything above is *round-to-nearest*: each weight independently goes to the closest level. The
methods that matter in practice change which way weights round, using data about how the model is
used.

| Method | The idea | Where you meet it |
|---|---|---|
| Importance matrix | Run calibration text through the model; weight each weight's rounding error by how much the activations use it | GGUF files marked `imatrix` or `i1` |
| GPTQ | Quantize one column at a time and adjust the remaining columns to cancel the error just introduced, using second-order information ([Frantar et al. 2022](https://arxiv.org/abs/2210.17323)) | `-GPTQ` repositories; W4A16 |
| AWQ | Scale up the roughly 1% of weight channels that multiply the largest activations before quantizing, so they lose less ([Lin et al. 2023](https://arxiv.org/abs/2306.00978)) | `-AWQ` repositories |
| QAT | Train, or post-train, with quantization simulated in the forward pass, so the weights learn to survive it | Gemma 3 QAT, Kimi K2 Thinking, gpt-oss |

The file format does not care which method chose the integers; a Q4_K tensor made with an importance
matrix reads exactly like one made without. The difference shows up only in quality.

## Why a model survives this at all

Rounding every weight in every layer should compound. It mostly does not, and a September 2026
preprint offers a mechanism: in pretrained networks, "the error a layer newly introduces tends to
oppose the error it inherits", so errors partially cancel along the residual stream — a property that
develops during training and is absent from randomly initialised networks of the same shape, whose
hidden states drift 4–8 times further under the same rounding
([Chen et al. 2026](https://arxiv.org/abs/2609.11716)). The output layer then preserves the ranking
of the most likely tokens better than their exact probabilities. Quantization works because training
makes models robust to exactly this kind of noise — up to a point that [section 4.4](/post/whats-in-a-model-file?section=sec-4-4)
measures.

## Weights, activations, cache

Names like **W4A16** say which tensors are quantized: here weights in 4 bits, activations — the
values flowing between layers — in 16. Quantizing weights shrinks the file and speeds up generation,
because producing each token means reading every active weight from memory once, and memory
bandwidth, not arithmetic, is the bottleneck. Quantizing activations as well (W8A8, W4A4) speeds up
the arithmetic, which matters when serving many users at once — but activations are harder: the famous
outliers LLM.int8() found in models above about 6.7B parameters are in activations, not weights
([Dettmers et al. 2022](https://arxiv.org/abs/2208.07339)). The attention cache can be quantized
separately again (llama.cpp's `--cache-type-k q8_0`), which matters for long contexts
([section 6.1](/post/whats-in-a-model-file?section=sec-6-1) has a calculator).
