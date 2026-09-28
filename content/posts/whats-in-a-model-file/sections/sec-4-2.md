Open any GGUF repository and you face a column of cryptic names: `Q2_K`, `IQ3_XXS`, `Q4_K_M`,
`Q5_K_S`, `Q8_0`. They are two different things wearing one notation. Some name a **tensor type** —
a block layout with a fixed number of bytes. Others name a **recipe** that assigns a type to every
tensor in the file. This section decodes both.

## Three generations of block types

<p class="fig-note"><b>Figure 4.2a &#183; GGUF&#8217;s main tensor types.</b> Block size, bytes per block and bits per weight from the <code>static_assert</code>s in ggml&#8217;s <a href="https://github.com/ggml-org/llama.cpp/blob/master/ggml/src/ggml-common.h">ggml-common.h</a>. Also present: F32, F16, BF16, Q8_K (used only internally), and Q1_0 and Q2_0 (2026, for natively 1- and 2-bit models).</p>

| Type | Block | Bytes | Bits / weight | How a weight is rebuilt |
|---|---|---|---|---|
| **Legacy, 2023** | | | | *one scale per 32 weights* |
| Q8_0 | 32 | 34 | 8.5 | d · q |
| Q5_0 / Q5_1 | 32 | 22 / 24 | 5.5 / 6.0 | d · q, or d · q + m |
| Q4_0 / Q4_1 | 32 | 18 / 20 | 4.5 / 5.0 | d · (q − 8), or d · q + m |
| **K-quants, June 2023** | | | | *256-weight super-blocks; the scales are quantized too* |
| Q6_K | 256 | 210 | 6.5625 | 16 sub-blocks, 8-bit scales |
| Q5_K | 256 | 176 | 5.5 | 8 sub-blocks, 6-bit scales and mins |
| **Q4_K** | 256 | 144 | 4.5 | 8 sub-blocks, 6-bit scales and mins |
| Q3_K | 256 | 110 | 3.4375 | 16 sub-blocks, 6-bit scales |
| Q2_K | 256 | 84 | 2.625 | 16 sub-blocks, 4-bit scales and mins |
| **I-quants, 2024** | | | | *codebooks and non-uniform levels* |
| IQ4_XS / IQ4_NL | 256 / 32 | 136 / 18 | 4.25 / 4.5 | 16 unevenly spaced levels |
| IQ3_S / IQ3_XXS | 256 | 110 / 98 | 3.44 / 3.06 | grid points of 4 weights |
| IQ2_XXS … IQ2_S | 256 | 66–82 | 2.06–2.56 | E8-lattice points of 8 weights, plus signs |
| IQ1_S / IQ1_M | 256 | 50 / 56 | 1.56 / 1.75 | a 2,048-entry grid of −1, 0, +1 |
| **Special purpose, 2024–26** | | | | |
| TQ1_0 / TQ2_0 | 256 | 54 / 66 | 1.69 / 2.06 | ternary weights for BitNet-style models |
| MXFP4 | 32 | 17 | 4.25 | 4-bit floats, power-of-two scale (gpt-oss) |
| NVFP4 | 64 | 36 | 4.5 | 4-bit floats, one FP8 scale per 16 |

**Legacy types** are the scheme of [section 4.1](/post/whats-in-a-model-file?section=sec-4-1): 32
weights, one FP16 scale `d`, and in the `_1` variants a minimum `m` so the grid can sit off-centre.

**K-quants**, contributed by Iwan Kawrakow in June 2023 ([#1684](https://github.com/ggml-org/llama.cpp/pull/1684)),
add a second level. A super-block of 256 weights is split into sub-blocks of 32 (or 16), each with
its own scale and minimum — and those scales are themselves stored as 6-bit integers, rescaled by one
FP16 number for the whole super-block. Here is a Q4_K block, all 144 bytes of it:

<figure class="fig">
<span class="fig-title">Figure 4.2b &#183; One Q4_K super-block: 256 weights in 144 bytes</span>
<div class="fig-bytes">
<div class="fig-byte fig-byte--hd" style="--w:1.2"><b>d &#183; 2 B</b>FP16 scale for the scales</div>
<div class="fig-byte fig-byte--hd" style="--w:1.2"><b>dmin &#183; 2 B</b>FP16 scale for the mins</div>
<div class="fig-byte fig-byte--hd fig-byte--hi" style="--w:2.4"><b>scales &#183; 12 B</b>8 scales and 8 mins, 6 bits each</div>
<div class="fig-byte" style="--w:7"><b>qs &#183; 128 B</b>256 four-bit integers</div>
</div>
<figcaption>Sub-block <i>j</i> rebuilds weight <i>w</i> = (d &#183; s<sub>j</sub>) &#183; q &#8722; dmin &#183; m<sub>j</sub>. The bit budget: 1,024 bits of weights + 96 bits of sub-block scales + 32 bits of super-block scales = 1,152 bits for 256 weights, exactly 4.5 per weight &#8212; the same as Q4_0.</figcaption>
</figure>

Q4_K and Q4_0 cost the same 4.5 bits. Q4_K spends its half-bit on eight local scales *and* offsets
instead of one flat scale, and the difference is large: on Llama 3 8B, a Q4_0 file has 2.3 times the
KL divergence from the original of a Q4_K_M file only 6% bigger
([llama.cpp scoreboard](https://github.com/ggml-org/llama.cpp/blob/master/tools/perplexity/README.md)).
Nobody has documented what the "K" stands for; the super-block constant in the code is `QK_K`.

**I-quants** (2024) replace the evenly spaced grid with *codebooks*: small tables of allowed patterns.
For the 2-bit types, eight weights at a time are matched to a point of the E8 lattice — an idea
Kawrakow credits to the QuIP# paper, though the 256 points in use were picked by counting which ones real models
used ([#4773](https://github.com/ggml-org/llama.cpp/pull/4773)). They need an *importance matrix*
(section 4.1): IQ2 quantization is disabled without one, "as one gets just garbage without"
([#4897](https://github.com/ggml-org/llama.cpp/pull/4897)). The odd sizes are honest accounting: the
"2-bit" IQ2_XXS is 2.0625 bits because each 256 weights carry one 16-bit scale. And the ternary TQ1_0
packs five weights into each byte, because 3<sup>5</sup> = 243 fits under 256.

## The recipes: what _S, _M and _L mean

A file called `Q4_K_M` is not all Q4_K. The quantizer walks the tensors and assigns each a type by
rules in [`llama-quant.cpp`](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-quant.cpp),
promoting the matrices that hurt most when damaged. For the popular mixes:

| Tensor | Q3_K_M | Q4_K_S | **Q4_K_M** | Q5_K_M |
|---|---|---|---|---|
| most matrices | Q3_K | Q4_K | **Q4_K** | Q5_K |
| attention V (`attn_v`) | Q5_K in the first 2 layers | Q5_K in the first 4 | **Q6_K in half the layers** | Q6_K in half the layers |
| FFN down (`ffn_down`) | Q5_K in the first 1/16 | Q5_K in the first 1/8 | **Q6_K in half the layers** | Q6_K in half the layers |
| output layer | Q6_K | Q6_K | **Q6_K** | Q6_K |
| norms (1-D) | F32 | F32 | F32 | F32 |

"Half the layers" is a one-line rule, `use_more_bits`: the first eighth, the last eighth, and every
third layer in between. On Llama 3.1 8B it promotes 1.53 billion of the 8.03 billion parameters to
Q6_K, which is exactly why "4-bit" Q4_K_M comes out at **4.89 bits per weight**. On a small model the
effect is larger still: Llama 3.2 1B ties its input and output embeddings, so its 263-million-parameter
embedding matrix inherits the output layer's Q6_K, and the file averages **5.18** bits.

## The rule, as the file actually got it

Here is something the documentation does not say. `use_more_bits` is applied not to the layer number
but to a *counter* of how many `attn_v` (or `ffn_down`) tensors the quantizer has seen so far — so it
depends on the order the tensors sit in the file. (Mixture-of-Experts models are the exception: after
Mixtral's experts turned out to be "randomly sprinkled in the model", the code parses the layer number
from the tensor's name for them.) Some GGUFs store tensors in string order, where
`blk.10` sorts before `blk.2`. Read the tensor tables of two real Q4_K_M files and the difference is
plain:

<figure class="fig">
<span class="fig-title">Figure 4.2c &#183; Which layers got 6 bits in two real Q4_K_M files</span>
<div class="fig-panel">
<span class="fig-sub">Qwen3 8B (<code>Qwen/Qwen3-8B-GGUF</code>): tensors stored in layer order &#8212; the rule as intended</span>
<div class="pg-heat" style="grid-template-columns: 6rem repeat(36, minmax(0.75rem, 1fr))">
<span class="pg-heat-lab">layer</span><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span><span>19</span><span>20</span><span>21</span><span>22</span><span>23</span><span>24</span><span>25</span><span>26</span><span>27</span><span>28</span><span>29</span><span>30</span><span>31</span><span>32</span><span>33</span><span>34</span><span>35</span>
<span class="pg-heat-lab">attn_v, ffn_down</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h4">6</span>
<span class="pg-heat-lab">other matrices</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h1">4</span>
</div>
</div>
<div class="fig-panel">
<span class="fig-sub">Llama 3.2 1B (<code>bartowski/Llama-3.2-1B-Instruct-GGUF</code>): tensors stored in string order, 0, 1, 10, 11 &#8230; 15, 2 &#8230; 9</span>
<div class="pg-heat" style="grid-template-columns: 6.5rem repeat(16, minmax(1.4rem, 1fr))">
<span class="pg-heat-lab">layer</span><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span><span>11</span><span>12</span><span>13</span><span>14</span><span>15</span>
<span class="pg-heat-lab">intended</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h4">6</span>
<span class="pg-heat-lab">in the file</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span><span class="pg-h1">4</span><span class="pg-h1">4</span><span class="pg-h4">6</span>
</div>
</div>
<figcaption>Read from each file&#8217;s tensor table (dark cells: Q6_K; light: Q4_K). The 1B file promotes layers 8, 9 and 12 instead of 10, 13 and 14 &#8212; still half the layers, still the same size, but not the ones the rule meant: the last eighth of the network is only half covered. Open either file in the <a href="/post/whats-in-a-model-file?section=sec-6-2">playground</a> to see its full layer map.</figcaption>
</figure>

Whether it matters much is an open question — the rule is a heuristic, and the size is identical —
but it is a good illustration of this essay's theme: the same name, `Q4_K_M`, can describe
measurably different files, and only reading the file tells you which one you have.

## Names that are not in llama.cpp at all

Several suffixes you will meet are community recipes built with the quantizer's per-tensor overrides,
not types or official mixes:

- **`_L` and `_XL`** (bartowski): the standard mix, but embeddings and output kept at Q8_0 — `Q4_K_L`
  is 5.59 bits per weight on Llama 3.2 1B, against 5.18 for Q4_K_M.
- **`UD-`** (Unsloth "Dynamic"): Unsloth's own per-tensor choices, tuned by measuring each layer's
  sensitivity; `UD-Q4_K_XL` is usually a little larger than Q4_K_M.
- **`i1-`** (mradermacher): the file was made with an importance matrix.
- **`Q4_0_4_4`, `Q4_0_8_8`**: Q4_0 with weights reordered for ARM CPU kernels. Removed from the format
  in late 2024; llama.cpp now repacks at load time instead.

## Choosing one

<figure class="fig">
<span class="fig-title">Figure 4.2d &#183; What each step down costs: Llama 3 8B</span>
<div class="fig-panel">
<span class="fig-sub">Mean KL divergence from the 16-bit model on Wikitext &#8212; log scale, so each gridline is ten times worse</span>
<div class="fig-row fig-row--bar"><span class="fig-name">Q8_0</span><span class="fig-track"><i class="fig-bar" style="width:4.5%"></i><i class="fig-blab" style="left:4.5%">0.0014</i></span><span class="fig-val">8.50 b</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Q6_K</span><span class="fig-track"><i class="fig-bar" style="width:24.5%"></i><i class="fig-blab" style="left:24.5%">0.0055</i></span><span class="fig-val">6.56 b</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Q5_K_M</span><span class="fig-track"><i class="fig-bar" style="width:34.4%"></i><i class="fig-blab" style="left:34.4%">0.011</i></span><span class="fig-val">5.70 b</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Q4_K_M</span><span class="fig-track"><i class="fig-bar" style="width:49.8%"></i><i class="fig-blab" style="left:49.8%">0.031</i></span><span class="fig-val">4.89 b</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">IQ4_XS &#183; imatrix</span><span class="fig-track"><i class="fig-bar" style="width:52.0%"></i><i class="fig-blab" style="left:52.0%">0.036</i></span><span class="fig-val">4.42 b</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Q4_0</span><span class="fig-track"><i class="fig-bar" style="width:61.9%"></i><i class="fig-blab" style="left:61.9%">0.072</i></span><span class="fig-val">4.64 b</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Q3_K_M</span><span class="fig-track"><i class="fig-bar" style="width:66.9%"></i><i class="fig-blab" style="left:66.9%">0.10</i></span><span class="fig-val">4.00 b</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Q2_K</span><span class="fig-track"><i class="fig-bar" style="width:88.3%"></i><i class="fig-blab" style="left:88.3%">0.45</i></span><span class="fig-val">3.16 b</span></div>
<div class="fig-row fig-row--scale"><span>&#160;</span><span class="fig-track"><i class="fig-tick" style="left:0%"></i><i class="fig-tlab" style="left:0%">0.001</i><i class="fig-tick" style="left:33.3%"></i><i class="fig-tlab" style="left:33.3%">0.01</i><i class="fig-tick" style="left:66.7%"></i><i class="fig-tlab" style="left:66.7%">0.1</i><i class="fig-tick" style="left:100%"></i><i class="fig-tlab" style="left:100%">1</i></span><span>bits / wt</span></div>
</div>
<figcaption>KL divergence from llama.cpp&#8217;s Llama 3 8B scoreboard (RTX 4090, no importance matrix unless marked); bits per weight measured from bartowski&#8217;s files of the identically shaped Llama 3.1 8B. KL divergence measures how far the quantized model&#8217;s next-token distribution drifts from the original&#8217;s; <a href="/post/whats-in-a-model-file?section=sec-4-4">section 4.4</a> explains why it is a better yardstick than perplexity.</figcaption>
</figure>

The curve bends sharply below four bits. A practical reading:

- **Q8_0** is indistinguishable from the original for almost every purpose; use it if it fits.
- **Q6_K and Q5_K_M** cost very little; they are the right choice when you have the memory.
- **Q4_K_M** is the default for a reason: the last size before the curve steepens.
- **IQ4_XS** buys a tenth off Q4_K_M's size for a little more damage — worth it when a model just
  fails to fit.
- **Below 4 bits**, use i-quants made with an importance matrix, and prefer a smaller model at 4 bits
  over a larger one at 2, unless the larger one is much larger.
