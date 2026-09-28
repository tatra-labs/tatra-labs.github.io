GGUF's types were designed for software kernels running on whatever hardware you have. GPU serving
works the other way round: the hardware defines a handful of number formats its tensor cores
multiply natively, and the file formats follow. This section covers those formats — FP8, MXFP4 and
NVFP4 — and the integer schemes that live inside safetensors files.

## FP8: the first native low precision

NVIDIA's Hopper GPUs (2022) added tensor cores for two 8-bit floats: E4M3, with more precision, for
weights and activations, and E5M2, with more range, for gradients. An FP8 model stores E4M3 weights and
a scale — per tensor, per output channel, or per block. DeepSeek went furthest: V3 was *trained* in
FP8, with one scale per 128 × 128 block of weights and one per 128 values of activations, and
DeepSeek publishes only the FP8 weights: "since FP8 training is natively adopted in our framework, we
only provide FP8 weights" ([DeepSeek-V3](https://huggingface.co/deepseek-ai/DeepSeek-V3)). The
checkpoint says so in its `config.json`:

```json
"quantization_config": {
  "quant_method": "fp8",
  "fmt": "e4m3",
  "weight_block_size": [128, 128],
  "activation_scheme": "dynamic"
}
```

— and every weight matrix has a sibling tensor, `weight_scale_inv`, holding one FP32 number per block.
FP8 is the one low-precision format that is close to free: a Red Hat study of more than 500,000
evaluations found FP8 weights-and-activations "effectively lossless across all model scales"
([Kurtic et al.](https://arxiv.org/abs/2411.02355)).

## Microscaling: MXFP4 and NVFP4

Four bits need finer scaling than eight. In September 2023 AMD, Arm, Intel, Meta, Microsoft, NVIDIA
and Qualcomm published the Open Compute Project's **Microscaling (MX)** specification: blocks of 32
elements share one 8-bit scale that is a pure power of two (E8M0). Its 4-bit member, MXFP4, stores
each element as E2M1 — a sign, two exponent bits and one mantissa bit, enough for 0, 0.5, 1, 1.5, 2, 3,
4 and 6 ([Rouhani et al.](https://arxiv.org/abs/2310.10537)). NVIDIA's own **NVFP4**, introduced with
Blackwell in 2025, keeps the same elements but halves the block to 16 and makes the scale a real
number (FP8 E4M3), with one more FP32 scale per tensor
([NVIDIA](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/)).

<figure class="fig">
<span class="fig-title">Figure 4.3a &#183; 32 weights in MXFP4 and in NVFP4</span>
<div class="fig-panel">
<span class="fig-sub">MXFP4 &#183; 17 bytes &#183; 4.25 bits per weight</span>
<div class="fig-bytes">
<div class="fig-byte fig-byte--hd" style="--w:1"><b>1 B</b>scale 2<sup>k</sup> (E8M0)</div>
<div class="fig-byte" style="--w:16"><b>16 B</b>32 values in E2M1, two per byte</div>
</div>
</div>
<div class="fig-panel">
<span class="fig-sub">NVFP4 &#183; 18 bytes &#183; 4.5 bits per weight (+ one FP32 per tensor)</span>
<div class="fig-bytes">
<div class="fig-byte fig-byte--hd fig-byte--hi" style="--w:1"><b>1 B</b>scale (E4M3)</div>
<div class="fig-byte" style="--w:8"><b>8 B</b>16 values in E2M1</div>
<div class="fig-byte fig-byte--hd fig-byte--hi" style="--w:1"><b>1 B</b>scale (E4M3)</div>
<div class="fig-byte" style="--w:8"><b>8 B</b>16 values in E2M1</div>
</div>
</div>
<figcaption>Same element format, different scaling. NVFP4 pays a quarter of a bit more for twice as many scales, each able to take any value rather than only powers of two.</figcaption>
</figure>

The difference matters more than the quarter-bit suggests. A power-of-two scale is chosen by rounding,
so a block's largest values can land far from the grid's top — MXFP4 "can potentially lose up to one
binade of dynamic range (and four samples: ±4 and ±6)", in NVIDIA's words; NVFP4's finer scale "encodes
at least 6.25% of values in a block… at near-FP8 precision" ([NVFP4 pretraining](https://arxiv.org/abs/2509.25149)).
In the same paper's experiment, a model trained in MXFP4 needed 36% more tokens to match one trained
in NVFP4. The quantizer in [section 4.1](/post/whats-in-a-model-file?section=sec-4-1) shows the effect
on a single block.

## What the claims are worth

The NVFP4 marketing number is that it loses "1% or less" against FP8. Read the fine print: that is
one model, the 671B DeepSeek-R1-0528, quantized after training and compared with third-party FP8
scores rather than an FP8 run NVIDIA made ([model card](https://huggingface.co/nvidia/DeepSeek-R1-0528-FP4)).
An independent study quantizing both weights and activations of Llama 3.1 8B found round-to-nearest
NVFP4 recovering about 94.7% of the 16-bit model's accuracy and MXFP4 about 87.8%, against 99.7% for
FP8; better rounding narrows the gap, and for large models "both formats can recover up to 98-99%"
([Egiazarian et al.](https://arxiv.org/abs/2509.23202)). So: excellent at scale, noticeably lossy on
small models, and — as the quantizer showed — no free improvement over 4-bit integers. What FP4 buys
is speed. On Blackwell, FP4 matrix multiplies run 4× faster than BF16 on GB200 and 6× on GB300
(same NVIDIA paper).

## Released in four bits

The formats became mainstream when models started shipping in them:

| Model | Released | Format | What is quantized |
|---|---|---|---|
| DeepSeek-V3, R1 | Dec 2024 – Jan 2025 | FP8, 128 × 128 blocks | the linear layers, from pretraining on |
| Gemma 3 QAT | Apr 2025 | GGUF Q4_0 | the weights, after quantization-aware training |
| gpt-oss-120b, -20b | Aug 2025 | MXFP4 | the Mixture-of-Experts weights, "90+% of the total parameter count"; attention and embeddings stay BF16 |
| Kimi K2 Thinking | Nov 2025 | INT4, groups of 32, via QAT | the experts; "all benchmark results are reported under INT4 precision" |

<p class="fig-note">Sources: <a href="https://arxiv.org/abs/2508.10925">gpt-oss model card</a>, <a href="https://huggingface.co/moonshotai/Kimi-K2-Thinking">Kimi K2 Thinking</a>, <a href="https://developers.googleblog.com/en/gemma-3-quantized-aware-trained-state-of-the-art-ai-to-consumer-gpus/">Google</a>. gpt-oss-120b&#8217;s checkpoint is 60.8 GiB, which is the point: it fits one 80 GB GPU.</p>

## The integer schemes, and how to recognise them

Safetensors has no quantization types ([section 2.2](/post/whats-in-a-model-file?section=sec-2-2)), so
every GPU quantization library encodes its scheme as ordinary tensors with conventional names, and
writes the recipe into `config.json` under `quantization_config` (or, for NVIDIA's Model Optimizer, a
separate `hf_quant_config.json`). Once you know the names, a file's tensor list tells you what it is —
the playground's inspector uses exactly these rules.

<figure class="fig">
<span class="fig-title">Figure 4.3b &#183; Reading the quantization scheme from tensor names</span>
<div class="fig-scroll">
<div class="fig-grid fig-grid--wide" style="--cols:3">
<span class="fig-cell fig-cell--hd">Scheme</span>
<span class="fig-cell fig-cell--hd">Tensors per weight matrix</span>
<span class="fig-cell fig-cell--hd">What they hold</span>
<span class="fig-cell fig-cell--hd">Bits / weight</span>
<span class="fig-cell fig-cell--row">GPTQ</span><span class="fig-cell"><code>qweight</code> I32, <code>qzeros</code> I32, <code>scales</code> F16, <code>g_idx</code> I32</span><span class="fig-cell">eight 4-bit values per int32; one scale and zero per group of 128; a map from input channel to group</span><span class="fig-cell">&#8776; 4.16</span>
<span class="fig-cell fig-cell--row">AWQ</span><span class="fig-cell"><code>qweight</code>, <code>qzeros</code>, <code>scales</code></span><span class="fig-cell">the same idea packed along the other axis; its channel scaling is folded into the weights</span><span class="fig-cell">&#8776; 4.16</span>
<span class="fig-cell fig-cell--row">bitsandbytes NF4</span><span class="fig-cell"><code>weight</code> U8, <code>weight.absmax</code>, <code>weight.quant_map</code>, <code>weight.quant_state.bitsandbytes__nf4</code></span><span class="fig-cell">4-bit codes into a 16-value normal-quantile table; one absmax per 64 weights, itself quantized</span><span class="fig-cell">&#8776; 4.13</span>
<span class="fig-cell fig-cell--row">compressed-tensors</span><span class="fig-cell"><code>weight_packed</code>, <code>weight_scale</code>, <code>weight_zero_point</code>, <code>weight_shape</code></span><span class="fig-cell">Red Hat&#8217;s llm-compressor format for vLLM: W4A16, W8A8, FP8, NVFP4, named in the config</span><span class="fig-cell">varies</span>
<span class="fig-cell fig-cell--row">FP8, block-scaled</span><span class="fig-cell"><code>weight</code> F8_E4M3, <code>weight_scale_inv</code> F32</span><span class="fig-cell">one inverse scale per 128 &#215; 128 tile (DeepSeek)</span><span class="fig-cell">&#8776; 8.0</span>
<span class="fig-cell fig-cell--row">MXFP4 (gpt-oss)</span><span class="fig-cell"><code>…_blocks</code> U8, <code>…_scales</code> U8</span><span class="fig-cell">two FP4 values per byte; one E8M0 scale per 32 &#8212; stored as plain bytes, not safetensors&#8217; F4 type</span><span class="fig-cell">4.25</span>
<span class="fig-cell fig-cell--row">NVFP4 (Model Optimizer)</span><span class="fig-cell"><code>weight</code> U8, <code>weight_scale</code> F8_E4M3, <code>weight_scale_2</code> F32, <code>input_scale</code></span><span class="fig-cell">FP4 pairs; one FP8 scale per 16; one FP32 per tensor</span><span class="fig-cell">&#8776; 4.5</span>
<span class="fig-cell fig-cell--row">MLX 4-bit</span><span class="fig-cell"><code>weight</code> U32, <code>scales</code> F16, <code>biases</code> F16</span><span class="fig-cell">eight nibbles per word; scale and offset per 64</span><span class="fig-cell">4.5</span>
<span class="fig-cell fig-cell--row">EXL2</span><span class="fig-cell"><code>q_weight</code>, <code>q_scale</code>, <code>q_groups</code>, <code>q_invperm</code></span><span class="fig-cell">a different bit width per row group, averaging a target such as 4.0</span><span class="fig-cell">any</span>
<span class="fig-cell fig-cell--row">EXL3</span><span class="fig-cell"><code>trellis</code> I16, <code>suh</code>, <code>svh</code></span><span class="fig-cell">trellis-coded 16 &#215; 16 tiles after a Hadamard rotation (from QTIP)</span><span class="fig-cell">exact, e.g. 4.0</span>
</div>
</div>
<figcaption>Read from the safetensors headers of real repositories (TheBloke/Llama-2-7B-GPTQ and -AWQ, unsloth bnb-4bit, RedHatAI, DeepSeek-V3, openai/gpt-oss-20b, mlx-community, turboderp&#8217;s exl2 and exl3). Bits per weight include scales. Scroll sideways on a narrow screen.</figcaption>
</figure>

Ten schemes, ten naming conventions, and no shared vocabulary: a loader that does not recognise the
names sees only integer tensors of the wrong shape. That is the open problem safetensors' 2026 roadmap
promises to address, and until it does, the `config.json` of a quantized repository is not optional
metadata — it is half of the format.

## Verdict

| Format | Choose it when |
|---|---|
| FP8 | You serve on Hopper or Blackwell and want the closest thing to lossless at half the memory |
| NVFP4 | You serve large models on Blackwell and have measured the loss on your task |
| MXFP4 | The model was released in it (gpt-oss), or your hardware prefers the OCP standard |
| GPTQ / AWQ W4A16 | You serve on older or consumer NVIDIA GPUs, where 4-bit weight-only kernels are mature |
| bitsandbytes NF4 | You fine-tune with QLoRA; not for fast serving |
