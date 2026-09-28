Download an open model and you are asked to choose: `.safetensors` or `.gguf`, `Q4_K_M` or `IQ4_XS`,
`-AWQ` or `-FP8-dynamic`, `-MLX-4bit` or `-onnx`. The same model can exist in a dozen files that differ
in size by a factor of eight, run on different programs, and — in one case — can take over the machine
that opens it. This essay explains all of it: why so many formats exist, what is inside each, how they
compare, what their names mean, and how to choose.

## The short answer

A model file is the model's learned numbers plus whatever else its authors wrote down. Formats differ
because they make different promises — to be safe to open, to load instantly, to run without the
original code, to be small, to be fast on one particular chip — and no single file can keep all of them
at once.

<figure class="fig">
<span class="fig-title">Figure 0.1 &#183; The life of a model&#8217;s bytes</span>
<div class="fig-steps">
<div class="fig-step"><b>Train</b><em>PyTorch checkpoints and sharded distributed checkpoints: weights plus optimizer state, several times the model&#8217;s size.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step fig-step--hi"><b>Release</b><em>safetensors, with <code>config.json</code> and a tokenizer. The master copy every other file is made from &#8212; now often already FP8 or 4-bit.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>Derive</b><em>GGUF for local use; GPTQ, AWQ, FP8, NVFP4 for GPU servers; MLX for Macs; ONNX, LiteRT, Core ML, ExecuTorch for apps and phones.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>Run</b><em>vLLM, SGLang, TensorRT-LLM; llama.cpp, Ollama, LM Studio; mlx-lm; ONNX Runtime; the phone&#8217;s own runtime.</em></div>
</div>
<figcaption>Each arrow is a conversion, and each conversion is where things go wrong (section 5.2).</figcaption>
</figure>

## If you only need the gist

| Format | In one line | Reach for it when |
|---|---|---|
| **safetensors** | named tensors and a JSON header; cannot run code | sharing a model; GPU serving; fine-tuning |
| **GGUF** | one file: weights, architecture, tokenizer, template, quantization | running a model on your own computer |
| **PyTorch `.pt` / `.bin`** | a pickle: a small program that rebuilds the tensors | your own training checkpoints only |
| **ONNX** | the computation graph plus weights | running inside a non-Python app, on any chip |
| **MLX** | safetensors laid out for Apple's framework | a Mac |
| **LiteRT, Core ML, ExecuTorch** | graphs compiled for phones and their NPUs | an app on a device |
| **TensorRT engine** | machine code for one GPU and one library version | never as a download; build it where it runs |
| **GPTQ, AWQ, FP8, NVFP4** | not formats but *schemes*, stored inside safetensors | a GPU server short of memory |

And for the most common question: **Q4_K_M** is a GGUF recipe that stores most weights in about 4.5
bits and the most sensitive ones in 6.6, averaging just under 5 bits per weight. It is the default for a
reason, and [section 4.2](/post/whats-in-a-model-file?section=sec-4-2) shows what it and its neighbours
cost.

## How this essay is organised

- **Part I** asks why there are so many formats: what a file holds ([1.1](/post/whats-in-a-model-file?section=sec-1-1)),
  the five questions every format answers ([1.2](/post/whats-in-a-model-file?section=sec-1-2)) and how
  we got here ([1.3](/post/whats-in-a-model-file?section=sec-1-3)).
- **Part II** takes the formats one at a time: pickle ([2.1](/post/whats-in-a-model-file?section=sec-2-1)),
  safetensors ([2.2](/post/whats-in-a-model-file?section=sec-2-2)), GGUF ([2.3](/post/whats-in-a-model-file?section=sec-2-3)),
  the graph formats ([3.1](/post/whats-in-a-model-file?section=sec-3-1)), the on-device formats
  ([3.2](/post/whats-in-a-model-file?section=sec-3-2)) and compiled engines ([3.3](/post/whats-in-a-model-file?section=sec-3-3)).
- **Part III** is about the numbers inside: how quantization works ([4.1](/post/whats-in-a-model-file?section=sec-4-1)),
  GGUF's types decoded ([4.2](/post/whats-in-a-model-file?section=sec-4-2)), the GPU formats
  ([4.3](/post/whats-in-a-model-file?section=sec-4-3)) and what it all costs ([4.4](/post/whats-in-a-model-file?section=sec-4-4)).
- **Part IV** covers living with formats: names ([5.1](/post/whats-in-a-model-file?section=sec-5-1)),
  conversions ([5.2](/post/whats-in-a-model-file?section=sec-5-2)) and security ([5.3](/post/whats-in-a-model-file?section=sec-5-3)).
- **Part V** is practical: choosing ([6.1](/post/whats-in-a-model-file?section=sec-6-1)), the
  [playground](/post/whats-in-a-model-file?section=sec-6-2) and what comes next ([6.3](/post/whats-in-a-model-file?section=sec-6-3)).

The **playground** has four tools that run in your browser: an inspector that reads the header of any
model file — on your disk or on Hugging Face — without downloading the weights; a quantizer you can
watch round 32 weights; a decoder for model names; and a memory and speed calculator. They appear in the
sections they illustrate and all together in [section 6.2](/post/whats-in-a-model-file?section=sec-6-2).

Every number in this essay was checked against a primary source — a specification, source code, a
paper, a vendor's documentation, or a file header read directly — and the charts that describe real
files were made by reading those files. Sources are linked where they are used and collected in the
[references](/post/whats-in-a-model-file?section=sec-7-1).
