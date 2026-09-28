A phone changes every constraint. There is no Python, memory is shared with every other app, a slow
cold start is a bug, and the fastest hardware — the neural processing unit — is different on every
chip. The on-device formats answer the five questions of [section 1.2](/post/whats-in-a-model-file?section=sec-1-2)
the same way: carry the graph, use the file in place, quantize aggressively, and belong to one vendor's
runtime.

<figure class="fig">
<span class="fig-title">Figure 3.2 &#183; The on-device formats at a glance</span>
<div class="fig-scroll">
<div class="fig-grid fig-grid--wide" style="--cols:4">
<span class="fig-cell fig-cell--hd">Format</span>
<span class="fig-cell fig-cell--hd">On disk</span>
<span class="fig-cell fig-cell--hd">Tokenizer inside?</span>
<span class="fig-cell fig-cell--hd">Runs on</span>
<span class="fig-cell fig-cell--hd">Made by</span>
<span class="fig-cell fig-cell--row">LiteRT</span><span class="fig-cell"><code>.tflite</code> FlatBuffer; <code>.litertlm</code> or <code>.task</code> bundles for LLMs</span><span class="fig-cell fig-cell--alt"><b>In the bundle</b><em>SentencePiece in .task / .litertlm</em></span><span class="fig-cell">Android, iOS, web, microcontrollers; GPU and NPU delegates</span><span class="fig-cell">Google (from TensorFlow, PyTorch, JAX)</span>
<span class="fig-cell fig-cell--row">Core ML</span><span class="fig-cell"><code>.mlpackage</code> directory; compiled on device</span><span class="fig-cell">No</span><span class="fig-cell">Apple CPU, GPU and Neural Engine</span><span class="fig-cell">Apple coremltools</span>
<span class="fig-cell fig-cell--row">ExecuTorch</span><span class="fig-cell"><code>.pte</code> FlatBuffer, weights in segments or a <code>.ptd</code></span><span class="fig-cell">No</span><span class="fig-cell">XNNPACK CPU, Core ML, Qualcomm, Arm, Samsung, MediaTek, Vulkan&#8230;</span><span class="fig-cell">PyTorch (<code>torch.export</code>)</span>
<span class="fig-cell fig-cell--row">MLX</span><span class="fig-cell">safetensors + <code>config.json</code></span><span class="fig-cell">HF <code>tokenizer.json</code> beside it</span><span class="fig-cell">Apple silicon (and CUDA on Linux)</span><span class="fig-cell">Apple ML research</span>
<span class="fig-cell fig-cell--row">OpenVINO IR</span><span class="fig-cell"><code>.xml</code> graph + <code>.bin</code> weights</span><span class="fig-cell fig-cell--alt"><b>Compiled into a graph</b><em>openvino_tokenizer.xml</em></span><span class="fig-cell">Intel CPU, GPU, NPU</span><span class="fig-cell">Intel</span>
<span class="fig-cell fig-cell--row">MLC / WebLLM</span><span class="fig-cell">raw <code>params_shard_*.bin</code> + a compiled kernel library per target</span><span class="fig-cell">HF <code>tokenizer.json</code></span><span class="fig-cell">browsers (WebGPU), phones, GPUs</span><span class="fig-cell">MLC project (Apache TVM)</span>
</div>
</div>
<figcaption>Sources in each subsection below. Scroll sideways on a narrow screen.</figcaption>
</figure>

## LiteRT: a file you never parse

TensorFlow Lite launched in November 2017 and was renamed **LiteRT** in September 2024, when it
began accepting models from PyTorch and JAX as well; by then it ran in "over 100K apps running on
2.7B devices", and the rename came with the promise that "no changes are being made to the .tflite
file extension or format" ([Google](https://developers.googleblog.com/tensorflow-lite-is-now-litert/)).

The format is a FlatBuffer, and that choice is the point. A FlatBuffer is laid out so that a program
can read any field by following offsets inside the bytes, without deserialising anything — so a phone
maps the file and uses it where it lies. Its four-byte identifier `TFL3` sits at bytes 4 to 7, after
the offset to the root table. GPT-2's LiteRT version in figure 1.1a is 2,175 operators over 4,456
tensors; its 8-bit variant stores 123.5 MB of INT8 weights and runs its arithmetic through the same
graph.

Language models needed more than a graph, so LiteRT added bundles: a `.task` file is a zip of the
model, a SentencePiece tokenizer and prompt metadata, and the newer `.litertlm` (magic `LITERTLM` at
byte 0) packs several models, the tokenizer and metadata behind a FlatBuffer header
([LiteRT-LM](https://github.com/google-ai-edge/LiteRT-LM)). Google launched Gemma 3n on LiteRT in May
2025, a month before any other runtime could load it — an edge format as a launch vehicle.

## Core ML: compiled where it runs

Apple's `.mlmodel` (2017) is a single protobuf. Its successor, the `.mlpackage` (2021), is a
directory, because Apple's newer "ML Program" representation keeps the program and the weights in
separate files — `model.mlmodel` and `weights/weight.bin` — and defaults to 16-bit floats
([coremltools](https://apple.github.io/coremltools/docs-guides/source/convert-to-ml-program.html)).
The device compiles the package for its own CPU, GPU and Neural Engine the first time it loads.
Language models arrived with *stateful* models in iOS 18, which let the attention cache live inside
the model instead of being passed in and out on every token; Apple's own example runs Llama 3.1 8B
with 4-bit weights at about 33 tokens per second on an M1 Max
([Apple ML research](https://machinelearning.apple.com/research/core-ml-on-device-llama)).

## ExecuTorch: PyTorch without the conversion

ExecuTorch is PyTorch's answer to all of the above, and its pitch is an argument against format
conversion itself: deploy "without the need to convert to other formats or rewrite the model",
avoiding the "numerical mismatches and loss of debug information" that conversion to ONNX, LiteRT or
llama.cpp brings ([ExecuTorch 1.0](https://pytorch.org/blog/introducing-executorch-1-0/), October
2025). You capture the model with `torch.export`, *lower* parts of it to a hardware backend, and save
a `.pte`: a FlatBuffer with the identifier `ET12` at bytes 4–7, an optional extended header, and the
constant data appended as segments or split into a separate `.ptd` file
([spec](https://github.com/pytorch/executorch/blob/main/docs/source/pte-file-format.md)). It runs the
on-device features of Instagram, WhatsApp and Ray-Ban's glasses, and Hugging Face's Lysandre Debut
says "more than 80% of the most downloaded, edge-friendly large language models on Hugging Face run
on ExecuTorch out of the box".

## MLX: a convention, not a format

Apple's MLX framework (December 2023) did not invent a file format at all. An MLX model is a
safetensors file and a `config.json`, and a 4-bit MLX model is recognisable only by its tensor names:
each weight matrix becomes a packed `weight` (eight 4-bit values per 32-bit word), plus `scales` and
`biases` with one value per group of 64 weights — 4 + 32/64 = 4.5 bits per weight — and the config
records `"quantization": {"group_size": 64, "bits": 4}`
([MLX docs](https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.quantize.html)).
MLX has since added `mxfp4`, `mxfp8` and `nvfp4` modes. Its models live under the `mlx-community`
organisation with suffixes like `-4bit`, and two desktop apps adopted it as a second engine beside
llama.cpp: LM Studio in October 2024 and Ollama in March 2026.

## OpenVINO, MLC and the long tail

Intel's **OpenVINO IR** splits a model into an `.xml` topology and a `.bin` of weights the XML refers
to by offset. It is the only format here that turns the tokenizer itself into a graph: an OpenVINO
repository such as `OpenVINO/Qwen2.5-7B-Instruct-int4-ov` ships `openvino_tokenizer.xml` and
`openvino_detokenizer.xml` next to the model ([repo](https://huggingface.co/OpenVINO/Qwen2.5-7B-Instruct-int4-ov/tree/main)).

**MLC-LLM**, which also powers WebLLM in the browser, stores weights as headerless binary shards
indexed by a JSON file, and pairs them with a kernel library compiled for each target — CUDA, Metal,
Vulkan, or WebAssembly with WebGPU. Its quantization names read `q4f16_1`: 4-bit weights, 16-bit
float activations, variant 1 ([docs](https://llm.mlc.ai/docs/compilation/configure_quantization.html)).
Further out are Tencent's NCNN (a text `.param` file whose first line is the magic number `7767517`)
and Alibaba's MNN, each with a following in mobile vision.

## Verdict

Pick the format your target platform's fastest runtime reads, and treat it as a build output, not a
source: keep the safetensors original and regenerate the device file when either side changes.

| Target | Reach for |
|---|---|
| Android, or anything Google ships | LiteRT (`.tflite`, `.litertlm`) |
| iPhone, iPad, Mac apps | Core ML, or MLX on the Mac |
| PyTorch models on many phone chips | ExecuTorch |
| Intel laptops and edge boxes | OpenVINO |
| The browser | ONNX Runtime Web, or MLC's WebLLM |
