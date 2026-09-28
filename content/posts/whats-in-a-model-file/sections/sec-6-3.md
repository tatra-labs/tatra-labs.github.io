Twelve years of format churn are settling into a shape, and 2026 made it unusually visible. Four trends
are clear enough to plan around; five problems are still open.

## What is settling

**1 · The release is the quantized file.** DeepSeek publishes only FP8 weights; OpenAI released
gpt-oss with its experts in MXFP4; Moonshot released Kimi K2 Thinking as native INT4 and reports every
benchmark at that precision; Google shipped Gemma 3 as a Q4_0 GGUF trained to survive it; NVIDIA posts
NVFP4 versions of major models on Hugging Face, and one of them, its Qwen3.6-35B-A3B build, drew 7.1
million downloads in a month. Formats now follow releases: llama.cpp added MXFP4 on gpt-oss's launch
day, NVFP4 in March 2026, and 1- and 2-bit types in April and July for models released natively at
those widths ([PRs](https://github.com/ggml-org/llama.cpp/pull/21273)). When the original is low-precision,
the question is no longer "which quantization should I use?" but "which one did the authors train for?".

**2 · Engines are converging on two inputs.** In one year, NVIDIA's TensorRT-LLM deleted its engine
builder and loads Hugging Face checkpoints directly; Hugging Face archived its own TGI server; Ollama
removed its custom engine and runs GGUF on upstream llama.cpp and safetensors on MLX; transformers
removed pickle saving; vLLM moved GGUF and bitsandbytes into plugins. What remains at the centre are
two formats — safetensors for GPU serving and training, GGUF for everything local — with device
formats at the edge, generated from the first as build products.

**3 · The standards are getting homes.** Safetensors joined the PyTorch Foundation in April 2026, and
ggml.ai, llama.cpp's company, joined Hugging Face in February. Safetensors now has native FP4, FP6 and
E8M0 element types, and ONNX added FP4, 2-bit and FP6 types across 2025–26. Both are catching up with
the hardware rather than leading it.

**4 · Distribution got cheaper.** The Hub moved 77 PB across six million repositories from Git LFS to
Xet, which stores files as roughly 64 KB content-defined chunks and deduplicates them across versions and
repositories ([Hugging Face](https://huggingface.co/blog/migrating-the-hub-to-xet)). Sibling
quantizations of one model share many chunks, the per-file limit rose from 50 GB to 500 GB, and
transformers' default shard grew from 5 GB to 50 GB. Formats no longer need to be designed around
upload limits.

## What is still open

<figure class="fig">
<span class="fig-title">Figure 6.3 &#183; Five unsolved problems, and where each one bites</span>
<div class="fig-stack">
<div class="fig-layer fig-layer--hi"><b>No shared quantization vocabulary</b><span>Ten libraries, ten sets of tensor names (figure 4.3b). A loader that does not know the convention sees integers of the wrong shape. Safetensors&#8217; roadmap promises &#8220;formalized support for quantization formats&#8221;; until then <code>config.json</code> is half the format.</span></div>
<div class="fig-layer"><b>Metadata that can lie</b><span>A file labelled NVFP4 holding FP8; a Q4_K_M whose promoted layers depend on tensor order; Hub parameter counts halved by packing. Nothing in any format checks that the description matches the bytes.</span></div>
<div class="fig-layer"><b>Tokenizers and templates</b><span>The most common conversion failures are in the smallest parts of the file: pre-tokenizers, chat templates, one field&#8217;s type. Each format stores them differently, and GGUF&#8217;s template is a program.</span></div>
<div class="fig-layer"><b>Architectures by reference</b><span>GGUF, MLX and every hand-written engine must implement each new architecture before any file of it runs &#8212; eleven weeks for Qwen3-Next. Graph formats avoid this and pay in operator coverage instead.</span></div>
<div class="fig-layer"><b>Behaviour, not bytes</b><span>Safe formats stop code on load. They cannot stop a model that is benign at 16 bits and malicious at 4, or one trained with a backdoor. Signing proves who published a file, not what it will do.</span></div>
</div>
<figcaption>Each problem is covered in more detail in sections 4.2&#8211;4.3, 5.2 and 5.3.</figcaption>
</figure>

## One more change of hands

The stewardship of these formats has become a story of its own. llama.cpp began as one developer's
side project in March 2023, became ggml.ai that June, and joined Hugging Face in February 2026. On 3
September 2026 NVIDIA announced an agreement to acquire Hugging Face, saying it "will remain an open
platform for the entire AI ecosystem" ([NVIDIA](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/)).
The code of both dominant formats is open — safetensors under the PyTorch Foundation, GGUF's reference
implementation under the MIT licence — which is the strongest guarantee a file format can have: anyone
can keep reading the files, whoever owns the company that wrote the reader.

## The one-paragraph summary

A model file is a set of answers: whether opening it can run code, whether it can be used without being
read, where the model's own code lives, how many bits each number gets, and which machine it is for.
Pickle answered all five for convenience and lost to safetensors on the first. GGUF answered them for a
laptop and became the format of local AI. The graph and device formats answered them for portability
and phones, and the compiled engines for one machine at a time — and are now being hidden behind the
servers that build them. What is left to fix is not the containers but the descriptions inside them:
what the numbers mean, whether the metadata is true, and what the model will do.
