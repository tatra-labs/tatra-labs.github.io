Choosing a format is really choosing an engine, and choosing an engine is really answering one
question: where will the model run? Start there and the rest of this essay collapses into a table.

## Start from the machine

<figure class="fig">
<span class="fig-title">Figure 6.1a &#183; Where it runs decides the format</span>
<div class="fig-scroll">
<div class="fig-grid fig-grid--wide" style="--cols:3">
<span class="fig-cell fig-cell--hd">You are running on</span>
<span class="fig-cell fig-cell--hd">Format</span>
<span class="fig-cell fig-cell--hd">Engine</span>
<span class="fig-cell fig-cell--hd">Why</span>
<span class="fig-cell fig-cell--row">Data-centre NVIDIA GPUs, many users</span><span class="fig-cell fig-cell--alt"><b>safetensors: BF16, FP8</b><em>NVFP4 on Blackwell</em></span><span class="fig-cell">vLLM, SGLang, TensorRT-LLM</span><span class="fig-cell">continuous batching; FP8 is close to lossless at half the memory</span>
<span class="fig-cell fig-cell--row">One consumer NVIDIA or AMD GPU</span><span class="fig-cell fig-cell--alt"><b>GGUF Q4_K_M&#8211;Q6_K</b><em>or AWQ / EXL3</em></span><span class="fig-cell">llama.cpp, LM Studio, Ollama; ExLlamaV3; vLLM for AWQ</span><span class="fig-cell">fits 8&#8211;32 GB; many sizes to choose from</span>
<span class="fig-cell fig-cell--row">A Mac</span><span class="fig-cell fig-cell--alt"><b>MLX 4- or 8-bit</b><em>or GGUF</em></span><span class="fig-cell">mlx-lm, LM Studio, Ollama</span><span class="fig-cell">unified memory holds large models; both engines use the GPU</span>
<span class="fig-cell fig-cell--row">CPU only, or a GPU too small for the model</span><span class="fig-cell fig-cell--alt"><b>GGUF</b></span><span class="fig-cell">llama.cpp</span><span class="fig-cell">the engine built for CPU, and for splitting layers or experts between CPU and GPU</span>
<span class="fig-cell fig-cell--row">A phone or embedded device</span><span class="fig-cell">LiteRT, ExecuTorch, Core ML, MLC</span><span class="fig-cell">the platform&#8217;s runtime</span><span class="fig-cell">NPU access; small memory; no Python</span>
<span class="fig-cell fig-cell--row">A browser</span><span class="fig-cell">ONNX; MLC</span><span class="fig-cell">ONNX Runtime Web, transformers.js; WebLLM</span><span class="fig-cell">WebGPU; the file is downloaded to every visitor, so size is everything</span>
<span class="fig-cell fig-cell--row">An app in C#, Java or C++</span><span class="fig-cell">ONNX</span><span class="fig-cell">ONNX Runtime (GenAI for LLMs)</span><span class="fig-cell">no Python; one file across CPU, GPU and NPU</span>
<span class="fig-cell fig-cell--row">Fine-tuning</span><span class="fig-cell">safetensors BF16; NF4 for QLoRA</span><span class="fig-cell">transformers, PEFT, Unsloth</span><span class="fig-cell">training needs the full-precision original</span>
<span class="fig-cell fig-cell--row">Publishing a model</span><span class="fig-cell">safetensors BF16 + config + tokenizer</span><span class="fig-cell">&#8212;</span><span class="fig-cell">the source every other format is built from; add GGUF and FP8 as derived files</span>
</div>
</div>
<figcaption>A starting point, not a rule: each row has good alternatives, and the matrix below says which engine reads which format. Scroll sideways on a narrow screen.</figcaption>
</figure>

## Which engine reads what

<figure class="fig">
<span class="fig-title">Figure 6.1b &#183; Engines and the formats they load, September 2026</span>
<div class="fig-scroll">
<div class="fig-grid fig-grid--wide" style="--cols:6">
<span class="fig-cell fig-cell--hd">Engine</span>
<span class="fig-cell fig-cell--hd">safetensors BF16</span>
<span class="fig-cell fig-cell--hd">GPTQ / AWQ</span>
<span class="fig-cell fig-cell--hd">FP8 / NVFP4 / MXFP4</span>
<span class="fig-cell fig-cell--hd">GGUF</span>
<span class="fig-cell fig-cell--hd">MLX</span>
<span class="fig-cell fig-cell--hd">ONNX</span>
<span class="fig-cell fig-cell--row">vLLM 0.30</span><span class="fig-cell">yes</span><span class="fig-cell">yes</span><span class="fig-cell">yes</span><span class="fig-cell">plugin, &#8220;highly experimental&#8221;</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span>
<span class="fig-cell fig-cell--row">SGLang 0.5</span><span class="fig-cell">yes</span><span class="fig-cell">yes</span><span class="fig-cell">yes</span><span class="fig-cell">yes</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span>
<span class="fig-cell fig-cell--row">TensorRT-LLM</span><span class="fig-cell">yes, directly</span><span class="fig-cell">via Model Optimizer</span><span class="fig-cell">yes</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span>
<span class="fig-cell fig-cell--row">transformers 5</span><span class="fig-cell">yes</span><span class="fig-cell">yes</span><span class="fig-cell">FP8 yes</span><span class="fig-cell">dequantizes it</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span>
<span class="fig-cell fig-cell--row">llama.cpp</span><span class="fig-cell">convert first</span><span class="fig-cell">&#8212;</span><span class="fig-cell">as GGUF types</span><span class="fig-cell fig-cell--alt"><b>native</b></span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span>
<span class="fig-cell fig-cell--row">Ollama</span><span class="fig-cell">imports</span><span class="fig-cell">&#8212;</span><span class="fig-cell">NVFP4 on Macs</span><span class="fig-cell fig-cell--alt"><b>native</b></span><span class="fig-cell">yes, on Macs</span><span class="fig-cell">&#8212;</span>
<span class="fig-cell fig-cell--row">LM Studio</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span><span class="fig-cell fig-cell--alt"><b>native</b></span><span class="fig-cell">yes</span><span class="fig-cell">&#8212;</span>
<span class="fig-cell fig-cell--row">MLX / mlx-lm</span><span class="fig-cell">converts on load</span><span class="fig-cell">&#8212;</span><span class="fig-cell">own FP4/FP8 modes</span><span class="fig-cell">reads</span><span class="fig-cell fig-cell--alt"><b>native</b></span><span class="fig-cell">&#8212;</span>
<span class="fig-cell fig-cell--row">ONNX Runtime</span><span class="fig-cell">via export</span><span class="fig-cell">via GenAI builder</span><span class="fig-cell">&#8212;</span><span class="fig-cell">FP16 GGUF into the builder</span><span class="fig-cell">&#8212;</span><span class="fig-cell fig-cell--alt"><b>native</b></span>
<span class="fig-cell fig-cell--row">OpenVINO</span><span class="fig-cell">via export</span><span class="fig-cell">partial</span><span class="fig-cell">MXFP4 weights</span><span class="fig-cell">partial</span><span class="fig-cell">&#8212;</span><span class="fig-cell">reads directly</span>
</div>
</div>
<figcaption>Compiled from each engine&#8217;s documentation and source in September 2026. Two recent changes: Hugging Face&#8217;s TGI server is archived, and vLLM moved GGUF and bitsandbytes support out of its core into plugins in mid-2026. Scroll sideways on a narrow screen.</figcaption>
</figure>

## Will it fit, and how fast will it be?

Three numbers decide whether a model runs well on a machine, and all three follow from figures you
have already met.

**Weights**: parameters × bits per weight ÷ 8 ([section 1.1](/post/whats-in-a-model-file?section=sec-1-1)).
For a Mixture-of-Experts model, use the *total* parameters: every expert must be in memory even
though each token uses only a few.

**The attention cache**: for each token of context, every layer stores a key and a value vector.

$$\text{cache bytes} = 2 \times L \times h_{kv} \times d_{\text{head}} \times T \times \beta$$

for $L$ layers, $h_{kv}$ key–value heads of size $d_{\text{head}}$, $T$ tokens of context and $\beta$
bytes per number. Llama 3.1 8B stores 131 KB per token at 16 bits — 17 GB for its full 128K-token
context, more than the weights themselves. Models with grouped-query attention, sliding windows or DeepSeek's
compressed latent attention cut this sharply, and the cache can itself be quantized to 8 bits.

**Speed**: generating one token means reading every *active* weight from memory once. So memory
bandwidth sets a ceiling:

$$\text{tokens per second} \le \frac{\text{memory bandwidth}}{\text{bytes read per token}}$$

This is why a 30B-A3B Mixture-of-Experts model runs roughly as fast as a 3B dense one while needing
the memory of a 30B, and why quantization speeds up generation as well as shrinking the file: half
the bits, half the bytes to read.

<figure class="fig">
<span class="fig-title">Playground &#183; Memory and speed for a model on a device</span>
<div data-widget="memory-calculator"><p class="pg-note">The calculator needs JavaScript.</p></div>
<figcaption>Architectures from each model&#8217;s <code>config.json</code>; parameter counts from the Hub; bits per weight for the GGUF mixes measured on Llama 3.1 8B (a small model with a large vocabulary comes out higher). Bandwidth figures are the vendors&#8217; peak numbers. The speed ceiling ignores compute, so it is optimistic for long prompts and batched serving.</figcaption>
</figure>

## Rules of thumb

- **Prefer a bigger model at 4 bits to a smaller one at 8.** For a fixed memory budget, 4-bit
  precision was "almost universally optimal" across the model families tested in the k-bit scaling
  study ([Dettmers and Zettlemoyer 2022](https://arxiv.org/abs/2212.09720)). Below 4 bits the curve of
  [figure 4.2d](/post/whats-in-a-model-file?section=sec-4-2) bends, and the rule weakens.
- **Leave room for the cache.** A model that fits with 200 MB to spare will run out of memory on the
  first long conversation. Budget the context you actually use.
- **On one GPU, GGUF for flexibility, EXL3 or AWQ for speed.** On many GPUs, safetensors with FP8.
- **Use the native format when there is one.** If the model was released in FP8, MXFP4 or a QAT
  GGUF, that file *is* the model; a community re-quantization of it is a copy of a copy.
- **Measure before you trust a quant** on anything that matters — [section 4.4](/post/whats-in-a-model-file?section=sec-4-4)
  has a fifteen-minute protocol.
