The formats so far store numbers and leave the network to someone else's code. Graph formats store the
network too: every operation, in order, with its inputs and outputs. A runtime that understands the
operations can run a model it has never heard of, with no Python and no model definition. That is
the promise of ONNX, and the reason it is still the default way to put a model into a C#, Java,
JavaScript or C++ application.

## ONNX: one graph for every framework

Microsoft and Facebook announced the Open Neural Network Exchange on 7 September 2017 (its working
name was "Toffee"); AWS joined within two months, and in 2019 it moved to the Linux Foundation
([announcement](https://azure.microsoft.com/en-us/blog/microsoft-and-facebook-create-open-ecosystem-for-ai-model-interoperability/)).
An `.onnx` file is a single protocol-buffer message:

<figure class="fig">
<span class="fig-title">Figure 3.1a &#183; What an ONNX file contains</span>
<div class="fig-stack">
<div class="fig-layer"><b>Model</b><span>IR version (the file format: 14 in ONNX 1.23), producer (&#8220;pytorch 2.0.1&#8221;), and the <em>opsets</em> it uses (&#8220;ai.onnx v13&#8221;) &#8212; the versioned vocabulary of operations.</span></div>
<div class="fig-layer fig-layer--hi"><b>Graph: nodes</b><span>Each node is one operation &#8212; <code>MatMul</code>, <code>Softmax</code>, <code>Reshape</code> &#8212; naming its input and output tensors. Together they are a dataflow program.</span></div>
<div class="fig-layer"><b>Graph: initializers</b><span>The weights, as named constant tensors with a type and shape; stored inline, or in a side file.</span></div>
<div class="fig-layer"><b>Graph: inputs, outputs</b><span>The model&#8217;s signature: names, types and shapes, with symbolic dimensions such as <code>batch</code> and <code>sequence</code>.</span></div>
</div>
<figcaption>After <a href="https://github.com/onnx/onnx/blob/main/onnx/onnx.proto">onnx.proto</a>. The IR version and the opset version are independent: one versions the container, the other the operations (<a href="https://github.com/onnx/onnx/blob/main/docs/Versioning.md">Versioning.md</a>).</figcaption>
</figure>

A graph is a program, and it is instructive to look at one. GPT-2's `decoder_model.onnx`, exported
from PyTorch 2.0, has 3,095 nodes and 149 weight tensors. The operations that do the arithmetic most
people picture — matrix multiplications — are 73 of those nodes. Most of the rest is bookkeeping about
shapes:

<figure class="fig">
<span class="fig-title">Figure 3.1b &#183; The 3,095 nodes of GPT-2 as an ONNX graph</span>
<div class="fig-panel">
<span class="fig-sub">Nodes of each type in <code>openai-community/gpt2/onnx/decoder_model.onnx</code></span>
<div class="fig-row fig-row--bar"><span class="fig-name">Constant</span><span class="fig-track"><i class="fig-bar" style="width:100%"></i><i class="fig-blab" style="left:62%">1,215</i></span><span class="fig-val">shapes</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Unsqueeze</span><span class="fig-track"><i class="fig-bar" style="width:23.5%"></i><i class="fig-blab" style="left:23.5%">285</i></span><span class="fig-val">shapes</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Shape</span><span class="fig-track"><i class="fig-bar" style="width:23.0%"></i><i class="fig-blab" style="left:23.0%">280</i></span><span class="fig-val">shapes</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Gather</span><span class="fig-track"><i class="fig-bar" style="width:16.2%"></i><i class="fig-blab" style="left:16.2%">197</i></span><span class="fig-val">shapes</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Concat, Reshape</span><span class="fig-track"><i class="fig-bar" style="width:24.4%"></i><i class="fig-blab" style="left:24.4%">296</i></span><span class="fig-val">shapes</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Add, Mul, Sub, Div</span><span class="fig-track"><i class="fig-bar" style="width:22.4%"></i><i class="fig-blab" style="left:22.4%">272</i></span><span class="fig-val">math</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Slice, Squeeze</span><span class="fig-track"><i class="fig-bar" style="width:16.0%"></i><i class="fig-blab" style="left:16.0%">194</i></span><span class="fig-val">shapes</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Gemm, MatMul</span><span class="fig-track"><i class="fig-bar" style="width:6.0%"></i><i class="fig-blab" style="left:6.0%">73 &#183; the matrix multiplications</i></span><span class="fig-val">math</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">everything else</span><span class="fig-track"><i class="fig-bar" style="width:23.3%"></i><i class="fig-blab" style="left:23.3%">283</i></span><span class="fig-val">norms, softmax, tanh…</span></div>
</div>
<figcaption>Counted by the playground&#8217;s inspector, reading the file&#8217;s protobuf directly. An exporter records what the Python code did, shape arithmetic included; a runtime&#8217;s optimiser folds most of it away when it loads the graph.</figcaption>
</figure>

The inputs and outputs tell a second story. The graph takes `input_ids` and `attention_mask` and
returns `logits` — plus 24 more outputs, `present.0.key` through `present.11.value`, one key and one
value tensor per layer. That is the attention cache, which a Python model manages invisibly and a
graph must expose as ordinary tensors the application feeds back in. Exporting a language model to
any graph format means deciding how that cache flows; Hugging Face's exporter once shipped two
graphs (with and without a cache) and later merged them into one with a conditional branch, which is
why GPT-2's folder has three ONNX files of nearly identical size.

## The 2 GB wall

Protocol buffers cannot serialise a message larger than 2 GB, and most language models are larger.
ONNX's answer is *external data*: each large tensor records a file name, offset and length instead of
its bytes, and the weights go into a raw side file, page-aligned so it can be mapped
([ExternalData.md](https://github.com/onnx/onnx/blob/main/docs/ExternalData.md)). Microsoft's int4
Phi-3-mini shows the result: a 231 kB `.onnx` file holding the graph, and a 2.72 GB `.onnx.data`
holding everything else. The "single portable file" is, for any modern LLM, two files.

Two more things a graph does not carry. The **tokenizer**: an ONNX model takes token IDs, so text
processing needs separate custom operators or ONNX Runtime GenAI's own tokenizer. And the
**generation loop**: sampling, beam search and cache management live outside the graph, which is what
ONNX Runtime GenAI adds, configured by a `genai_config.json` beside the model
([docs](https://onnxruntime.ai/docs/genai/reference/config.html)).

## Quantization in a graph

Because ONNX has typed tensors and operators, it can express quantization as part of the program:
8-bit, 4-bit and FP8 element types, `QuantizeLinear` and `DequantizeLinear` nodes around the
operations that should run in low precision, and fused 4-bit matrix-multiply operators in ONNX
Runtime. The folder names of Microsoft's Phi-3 ONNX releases read like a recipe:
`cpu-int4-rtn-block-32-acc-level-4` means *for CPU, 4-bit weights, round-to-nearest, one scale per
32 weights, accuracy level 4* — the setting that lets the CPU compute in 8-bit integers for speed
([model card](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-onnx)).

## One runtime, many chips

The payoff is ONNX Runtime's *execution providers*: the same file runs on CPU, CUDA, TensorRT,
DirectML, WebGPU in a browser, Apple's Core ML, Qualcomm's QNN, Intel's OpenVINO or AMD's MIGraphX,
chosen at load time ([list](https://onnxruntime.ai/docs/execution-providers/)). This is the one place
in the ecosystem where "write once, run anywhere" is close to true — for models whose operations every
provider implements.

The risks are the mirror image. Every export is a translation, and PyTorch's exporter changed engines
in version 2.9 (October 2025), moving to the `torch.export` pipeline and raising the default opset from
18 to 20 ([release notes](https://github.com/pytorch/pytorch/releases/tag/v2.9.0)); a file written by a
new exporter can be rejected by an older runtime. Custom operators are native shared libraries, so a
model that needs one is a model that loads native code.

## TensorFlow's SavedModel and Keras

TensorFlow's own format predates ONNX and is a directory rather than a file: `saved_model.pb` holds
the graph and its named signatures, and `variables/` holds the weights as a checkpoint whose shard
names — `variables.data-00000-of-00001` and `variables.index` — date from TensorFlow 0.12
([guide](https://www.tensorflow.org/guide/saved_model)). TensorFlow's security policy is blunt about
what that means: *"TensorFlow models are expressed as programs that TensorFlow executes… using untrusted
models or graphs is equivalent to running untrusted code"*
([SECURITY.md](https://github.com/tensorflow/tensorflow/blob/master/SECURITY.md)). Its operations
include file and network I/O.

Keras, the high-level library, has its own formats. The legacy `.h5` is an HDF5 container. The
current `.keras` (default since TensorFlow 2.13, 2023) is a zip of three things: `config.json`
describing the architecture as nested class names and arguments, `metadata.json`, and
`model.weights.h5`. Loading rebuilds the model from the JSON, which is why Keras added `safe_mode` to
refuse serialised Python lambdas — and why that protection was bypassed four times in 2025 alone,
three of them by a `config.json` that named a function where a layer should be
([section 5.3](/post/whats-in-a-model-file?section=sec-5-3)). Transformers dropped TensorFlow support
entirely in version 5, so for language models these are now formats you read rather than write.

## Verdict

| Use ONNX for | Avoid it for |
|---|---|
| Shipping a model inside a non-Python application | Models whose newest operations your runtime lacks |
| One file that runs on CPU, GPU, NPU and browser via execution providers | The largest LLMs, where GGUF and safetensors engines are faster and better maintained |
| Vision, speech and classic ML models, where it is most mature | Anything whose tokenizer or generation loop you cannot supply separately |
