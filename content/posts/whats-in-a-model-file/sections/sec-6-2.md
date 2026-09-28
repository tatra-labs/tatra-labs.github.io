Four tools, all running in your browser. Nothing you open is uploaded: local files are read in small
slices, and Hugging Face files are read with HTTP range requests, so inspecting a 60 GB model costs a
few megabytes of traffic. Each tool comes with experiments worth running.

## 1 · The file inspector

Drop a model file, paste a Hugging Face file URL, or pick a sample. The inspector identifies the
format from its first bytes and reads its header: GGUF (metadata, tensor table and a layer map of the
quantization mix), safetensors (tensors, dtypes and which quantization library's layout it uses),
PyTorch zip and legacy pickle (every import the pickle would make, found without running it), ONNX
(operators, weights, opset), LiteRT (operators and tensor types) and Flax msgpack.

<figure class="fig">
<span class="fig-title">Playground &#183; The file inspector</span>
<div data-widget="inspector" data-samples="GGUF · Llama 3.2 1B Q4_K_M=https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf|GGUF · Qwen3 0.6B UD-Q4_K_XL=https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-UD-Q4_K_XL.gguf|GGUF · Qwen3 0.6B Q4_K_M=https://huggingface.co/unsloth/Qwen3-0.6B-GGUF/resolve/main/Qwen3-0.6B-Q4_K_M.gguf|safetensors · gpt-oss-20b (MXFP4)=https://huggingface.co/openai/gpt-oss-20b/resolve/main/model-00000-of-00002.safetensors|safetensors · DeepSeek-V3 (FP8)=https://huggingface.co/deepseek-ai/DeepSeek-V3/resolve/main/model-00001-of-000163.safetensors|safetensors · GPTQ=https://huggingface.co/TheBloke/Llama-2-7B-GPTQ/resolve/main/model.safetensors|safetensors · MLX 4-bit=https://huggingface.co/mlx-community/Llama-3.2-1B-Instruct-4bit/resolve/main/model.safetensors|pickle · GPT-2 .bin=https://huggingface.co/openai-community/gpt2/resolve/main/pytorch_model.bin|ONNX · GPT-2=https://huggingface.co/openai-community/gpt2/resolve/main/onnx/decoder_model.onnx|LiteRT · GPT-2 INT8=https://huggingface.co/openai-community/gpt2/resolve/main/64-8bits.tflite|A pickle that calls print()=demo:pickle"><p class="pg-note">The inspector needs JavaScript.</p></div>
<figcaption>Remote reads are paced by the network: a GGUF header takes a few seconds, while the ONNX and msgpack samples need dozens of small reads scattered through the file and can take close to a minute. Gated repositories (Meta&#8217;s, for instance) refuse anonymous range requests; use a public mirror or a local file.</figcaption>
</figure>

**Try this:**

- Open **Llama 3.2 1B Q4_K_M** and look at the layer map: the Q6_K layers are 0, 1, 4, 7, 8, 9, 12 and
  15 — the string-order quirk of [section 4.2](/post/whats-in-a-model-file?section=sec-4-2). Then open
  the metadata and find `tokenizer.ggml.pre`, the key whose absence broke Llama 3 in 2024.
- Compare **Qwen3 0.6B UD-Q4_K_XL** with **Q4_K_M** from the same repository: same "4-bit" label,
  different recipes. The standard mix promotes `attn_v` and `ffn_down` in half the layers; Unsloth's
  drops five layers to IQ4_XS, raises five others to Q5_K, and keeps `attn_v` at 6 bits in 23 of 28.
- Open **gpt-oss-20b** and **DeepSeek-V3**: the inspector recognises MXFP4 and block-FP8 purely from
  tensor names — the conventions of [figure 4.3b](/post/whats-in-a-model-file?section=sec-4-3).
- Open **A pickle that calls print()**. The verdict is "would run code", from six opcodes. Then open
  the GPT-2 `.bin` and see a clean checkpoint: three imports, 322 calls, still a program.

## 2 · The quantizer

<figure class="fig">
<span class="fig-title">Playground &#183; Quantize 32 weights by hand</span>
<div data-widget="quantizer" data-scheme="NVFP4"><p class="pg-note">The quantizer needs JavaScript.</p></div>
<figcaption>Bars are the original weights, squares the stored values, dashed lines every value the block can represent. The table compares all five schemes on the same weights.</figcaption>
</figure>

**Try this:**

- Press **New weights** a few times without the outlier: the 4-bit float formats rarely beat plain
  Q4_0 integers. Then turn **One outlier** on and watch Q4_0's "rounded to zero" jump.
- Look at the byte bar under the chart for each scheme: those rows *are* the file formats, one block at
  a time.
- In MXFP4, find a block where the largest weights sit well below the top dashed line: that gap is the
  power-of-two scale rounding NVFP4 was designed to fix.

## 3 · The name decoder

<figure class="fig">
<span class="fig-title">Playground &#183; Paste a name, get a reading</span>
<div data-widget="name-decoder" data-examples="0xSero/Kimi-K2.6-519B-NVFP4|Jackrong/Qwopus3.6-35B-A3B-Coder-MTP-GGUF|nvidia/Nemotron-3-Embed-1B-NVFP4|unsloth/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf|deepseek-ai/DeepSeek-R1-0528|mistralai/Mistral-Small-3.2-24B-Instruct-2506|google/gemma-3n-E4B-it|hf.co/bartowski/Llama-3.2-1B-Instruct-GGUF:Q4_K_M"><p class="pg-note">The decoder needs JavaScript.</p></div>
<figcaption>Handles Hugging Face repositories and file paths, Ollama tags and <code>hf.co</code> pulls.</figcaption>
</figure>

**Try this:** decode `DeepSeek-R1-0528` and `Mistral-Small-3.2-24B-Instruct-2506` and compare how the
same four-digit pattern is read; then paste the name of the model you use every day.

## 4 · The memory calculator

<figure class="fig">
<span class="fig-title">Playground &#183; Memory and speed for a model on a device</span>
<div data-widget="memory-calculator"><p class="pg-note">The calculator needs JavaScript.</p></div>
<figcaption>Weights plus attention cache plus a rough runtime allowance, against the device&#8217;s memory; the speed ceiling is bandwidth divided by bytes read per token.</figcaption>
</figure>

**Try this:**

- Pick **Llama 3.1 8B** on an **RTX 4090** and slide the context to 128K: the cache overtakes the
  weights. Switch the cache to Q8_0.
- Compare **Qwen3 30B-A3B** with **Llama 3.1 8B** on the same device: more memory, but a higher speed
  ceiling, because only 3.3B parameters are read per token.
- Put **DeepSeek-V3** on a **Mac Studio M3 Ultra** at Q2_K: it fits, and compressed attention keeps
  its cache small even at long contexts.
