There are dozens of model formats because a model file has to answer five questions, and no single
set of answers suits a training cluster, a laptop and a phone at once. Learn the five questions and
every format becomes a short description: its answer to each.

## 1 · Can opening it run code?

The oldest format in wide use, Python's `pickle`, is not really a data format. It is a small program
for a stack machine, and one of its instructions means *import this function and call it*. PyTorch
saved models with it for a decade, so for a decade opening a `.pt` file from a stranger meant running
a stranger’s program. Security researchers have since found live reverse shells in models uploaded to Hugging Face
([section 5.3](/post/whats-in-a-model-file?section=sec-5-3)).

Every format designed after 2020 answers *no*: the file describes numbers and never names a function
to call. That is the single largest reason the ecosystem moved to safetensors and GGUF. "No" is not
the end of the story — parsers have bugs, and GGUF carries a template language — but it removes the
attack that needed no bug at all.

## 2 · Can it be used without being read?

A 70-billion-parameter model is 140 GB at 16 bits. Reading 140 GB into memory, parsing it and copying
it to the GPU takes minutes. A format can instead lay the bytes out so the operating system can
*memory-map* the file: the program treats the file as if it were already in memory, and pages arrive
from disk only when touched, straight from the OS page cache.

That needs two properties: each tensor's bytes must be contiguous, and they must start at an aligned
address. The earliest llama.cpp format had neither. In March 2023 Justine Tunney rewrote it so that
tensors sat on 32-byte boundaries, in a pull request titled "Make loading weights 10-100x faster"
([#613](https://github.com/ggml-org/llama.cpp/pull/613)). Every format since has either been
mmap-able from the start or grown a way to be.

## 3 · Where does the architecture live?

A file of weights is useless without the function $f$ they parameterise. The formats disagree about
who is responsible for $f$, and this is the question that most divides them.

<figure class="fig">
<span class="fig-title">Figure 1.2a &#183; Where the model&#8217;s code lives: four answers, from data to binary</span>
<div class="fig-steps">
<div class="fig-step"><b>In the loader&#8217;s code</b><em>The file holds tensors only. Python code (transformers&#8217; <code>modeling_llama.py</code>, say) defines the network and pours the numbers in.</em><em><br>safetensors, pickle state dicts, .npz</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>In the runtime, named by the file</b><em>The file says &#8220;this is a <code>llama</code> with 32 blocks&#8221;; the engine has its own hand-written implementation of every architecture it supports.</em><em><br>GGUF (llama.cpp knows 152), MLX</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step fig-step--hi"><b>In the file, as a graph</b><em>The file lists the operations themselves. Any compliant runtime can execute it without knowing what model it is.</em><em><br>ONNX, LiteRT, Core ML, ExecuTorch, SavedModel</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>In the file, as machine code</b><em>The graph has been compiled to kernels for one GPU, one driver stack, one library version.</em><em><br>TensorRT engines, QNN context binaries, AOTInductor</em></div>
</div>
<figcaption>Moving right, the loader has less to know and the file more to promise. A graph format runs anywhere its operators are implemented; a compiled engine runs fastest and only on the machine type that built it.</figcaption>
</figure>

The left end is the most flexible: a new architecture needs only new Python, which is why research
and training stay there. The middle trades that for independence from Python — llama.cpp can run a
GGUF in C++ on a phone — at the price that the runtime must implement each new architecture by hand,
which for a novel design can take months ([section 5.2](/post/whats-in-a-model-file?section=sec-5-2)).
The graph formats remove even that, until a model uses an operation the runtime lacks. The compiled
end squeezes out the last speed and loses portability almost entirely: by default a TensorRT engine
runs only on the GPU type, TensorRT version and operating system that built it
([NVIDIA docs](https://docs.nvidia.com/deeplearning/tensorrt/latest/inference-library/engine-compatibility.html)).

## 4 · How many bits per number?

Training uses 16- and 32-bit floats. Serving can use far fewer: 8, 4, even 2 bits per weight, with a
little extra spent on scale factors ([Part III](/post/whats-in-a-model-file?section=sec-4-1)). A
format either *knows* about these schemes or tolerates them.

GGUF knows: each tensor's type is a quantization scheme (`Q4_K`, `IQ3_S`, `MXFP4`…), with its block
structure defined by the format itself. Safetensors only tolerates: its element types are plain
numbers, so a 4-bit model is stored as packed integers in ordinary tensors with names like `qweight`
and `scales`, and the recipe for reading them lives in a separate `config.json`
([section 4.3](/post/whats-in-a-model-file?section=sec-4-3)). Both work. Only one of them lets a
program that has never heard of your quantization library understand the file.

## 5 · Who is it for?

Finally, every format has a home runtime, and often a home chip. LiteRT FlatBuffers are built to be
used in place on a phone with a few hundred megabytes to spare. Core ML packages are compiled for
Apple's Neural Engine. NVFP4 checkpoints assume Blackwell tensor cores. A format's home determines
which of the four previous answers it can afford.

## The answers, side by side

<figure class="fig">
<span class="fig-title">Figure 1.2b &#183; Ten formats, five questions</span>
<div class="fig-scroll">
<div class="fig-grid fig-grid--wide" style="--cols:5">
<span class="fig-cell fig-cell--hd">Format</span>
<span class="fig-cell fig-cell--hd">Runs code on open?</span>
<span class="fig-cell fig-cell--hd">Use in place (mmap)?</span>
<span class="fig-cell fig-cell--hd">Where the model lives</span>
<span class="fig-cell fig-cell--hd">Quantization</span>
<span class="fig-cell fig-cell--hd">Home</span>
<span class="fig-cell fig-cell--row">Pickle (.pt, .bin, .ckpt)</span><span class="fig-cell fig-cell--alt"><b>Yes, by design</b><em>blocked by default since PyTorch 2.6</em></span><span class="fig-cell">zip form, since 2.1<em> legacy form, no</em></span><span class="fig-cell">loader&#8217;s code</span><span class="fig-cell">whatever the objects hold</span><span class="fig-cell">PyTorch training</span>
<span class="fig-cell fig-cell--row">safetensors</span><span class="fig-cell"><b>No</b></span><span class="fig-cell"><b>Yes</b></span><span class="fig-cell">loader&#8217;s code (+ config.json)</span><span class="fig-cell">by convention<em> packed ints + config.json</em></span><span class="fig-cell">everything on Hugging Face; GPU serving</span>
<span class="fig-cell fig-cell--row">GGUF</span><span class="fig-cell"><b>No</b><em> but it carries a Jinja template</em></span><span class="fig-cell"><b>Yes</b><em> 32-byte aligned</em></span><span class="fig-cell">runtime, named in metadata</span><span class="fig-cell"><b>Native</b><em> 30+ block types</em></span><span class="fig-cell">llama.cpp, Ollama, LM Studio</span>
<span class="fig-cell fig-cell--row">MLX repo</span><span class="fig-cell">No</span><span class="fig-cell">Yes<em> safetensors inside</em></span><span class="fig-cell">runtime (mlx-lm)</span><span class="fig-cell">by convention<em> scales and biases tensors</em></span><span class="fig-cell">Apple silicon</span>
<span class="fig-cell fig-cell--row">ONNX</span><span class="fig-cell">No<em> unless custom-op libraries</em></span><span class="fig-cell">weights in a side file can be</span><span class="fig-cell fig-cell--alt"><b>Graph in the file</b></span><span class="fig-cell">INT8/INT4/FP8 types, quantize ops</span><span class="fig-cell">ONNX Runtime, everywhere</span>
<span class="fig-cell fig-cell--row">SavedModel, .keras</span><span class="fig-cell"><b>Effectively yes</b><em> &#8220;models are programs&#8221;</em></span><span class="fig-cell">No</span><span class="fig-cell">graph / config in the file</span><span class="fig-cell">limited</span><span class="fig-cell">TensorFlow, Keras</span>
<span class="fig-cell fig-cell--row">LiteRT (.tflite)</span><span class="fig-cell">No</span><span class="fig-cell"><b>Yes</b><em> FlatBuffer, read in place</em></span><span class="fig-cell">graph in the file</span><span class="fig-cell">INT8, FP16, INT4</span><span class="fig-cell">Android, embedded</span>
<span class="fig-cell fig-cell--row">Core ML (.mlpackage)</span><span class="fig-cell">No</span><span class="fig-cell">compiled on device</span><span class="fig-cell">program in the package</span><span class="fig-cell">FP16, palettes, INT4/8</span><span class="fig-cell">Apple devices</span>
<span class="fig-cell fig-cell--row">ExecuTorch (.pte)</span><span class="fig-cell">No</span><span class="fig-cell">Yes<em> FlatBuffer + segments</em></span><span class="fig-cell">lowered program in the file</span><span class="fig-cell">via torchao, per backend</span><span class="fig-cell">phones, wearables</span>
<span class="fig-cell fig-cell--row">TensorRT engine</span><span class="fig-cell">native kernels<em> trust the builder</em></span><span class="fig-cell">loaded whole</span><span class="fig-cell">compiled machine code</span><span class="fig-cell">baked in (FP8, FP4, INT8)</span><span class="fig-cell fig-cell--alt"><b>One GPU type</b><em>one TensorRT version, one OS</em></span>
</div>
</div>
<figcaption>The highlighted cells are each format&#8217;s defining trait. Details and sources are in the sections on each format (Part II). Scroll sideways on a narrow screen.</figcaption>
</figure>

Read the table by column and the history of the field falls out of it. The first column went from
*yes* to *no* between 2022 and 2025. The second became *yes* almost everywhere. The third is still
genuinely split, because each answer is right for someone. The fourth is where the action is now:
since 2025 the largest open models have been *released* already quantized, so the number format is
no longer something a community adds later but part of the original artifact
([section 6.3](/post/whats-in-a-model-file?section=sec-6-3)).

## What to carry forward

- A format is a set of answers: code or data, used in place or parsed, where $f$ lives, how many
  bits, and for which machine.
- The most useful single fact about any format is where it puts the architecture. It decides who
  must do work when a new model appears.
- "Safe" means *opening the file cannot run code by design*. It does not mean the model is benign, or
  that the parser has no bugs.
