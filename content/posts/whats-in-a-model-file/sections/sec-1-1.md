A trained network is a function $f(x;\theta)$. The architecture $f$ is code; the parameters $\theta$
are numbers — billions of them, learned once at great cost and then copied everywhere. A model file
is those numbers, plus as much of $f$ as its authors decided to write down. Every difference between
formats comes from that decision.

## Same model, eleven files

The clearest way to see it is one repository. `openai-community/gpt2` on Hugging Face holds the same
124-million-parameter model, trained once in 2019, in eleven files and seven formats. They should
all be about the same size. They are not.

<figure class="fig">
<span class="fig-title">Figure 1.1a &#183; One model, eleven files: GPT-2 (124M parameters) as it sits on the Hub</span>
<div class="fig-panel">
<span class="fig-sub">File size in MB, read from the Hub API</span>
<div class="fig-row fig-row--bar"><span class="fig-name">64-8bits.tflite</span><span class="fig-track"><i class="fig-bar" style="width:12.4%"></i><i class="fig-blab" style="left:12.4%">LiteRT &#183; INT8 weights</i></span><span class="fig-val">125</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">64-fp16.tflite</span><span class="fig-track"><i class="fig-bar" style="width:24.7%"></i><i class="fig-blab" style="left:24.7%">LiteRT &#183; FP16</i></span><span class="fig-val">248</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">64.tflite</span><span class="fig-track"><i class="fig-bar" style="width:49.4%"></i><i class="fig-blab" style="left:49.4%">LiteRT</i></span><span class="fig-val">496</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">flax_model.msgpack</span><span class="fig-track"><i class="fig-bar" style="width:49.6%"></i><i class="fig-blab" style="left:49.6%">Flax</i></span><span class="fig-val">498</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">tf_model.h5</span><span class="fig-track"><i class="fig-bar" style="width:49.6%"></i><i class="fig-blab" style="left:49.6%">HDF5</i></span><span class="fig-val">498</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">model.safetensors</span><span class="fig-track"><i class="fig-bar" style="width:54.6%"></i><i class="fig-blab" style="left:54.6%">safetensors &#183; + masks</i></span><span class="fig-val">548</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">pytorch_model.bin</span><span class="fig-track"><i class="fig-bar" style="width:54.6%"></i><i class="fig-blab" style="left:54.6%">pickle &#183; + masks</i></span><span class="fig-val">548</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">decoder_model.onnx</span><span class="fig-track"><i class="fig-bar" style="width:65.1%"></i><i class="fig-blab" style="left:65.1%">ONNX &#183; + tied copy</i></span><span class="fig-val">654</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">…with_past.onnx</span><span class="fig-track"><i class="fig-bar" style="width:65.1%"></i><i class="fig-blab" style="left:65.1%">ONNX &#183; + tied copy</i></span><span class="fig-val">654</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">…merged.onnx</span><span class="fig-track"><i class="fig-bar" style="width:65.2%"></i><i class="fig-blab" style="left:65.2%">ONNX &#183; + tied copy</i></span><span class="fig-val">655</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">rust_model.ot</span><span class="fig-track"><i class="fig-bar" style="width:70.0%"></i><i class="fig-blab" style="left:70.0%">libtorch &#183; + both</i></span><span class="fig-val">703</span></div>
</div>
<figcaption>Sizes from the Hub API; contents from reading each file&#8217;s header (you can repeat this in the <a href="/post/whats-in-a-model-file?section=sec-6-2">playground</a>). 124.4M parameters at 4 bytes each is 498 MB &#8212; the HDF5 and Flax files. The rest differ only in what else they chose to keep.</figcaption>
</figure>

Every gap in that chart is a decision about what a file is for:

- **The 50 MB the PyTorch files add** are twelve copies of GPT-2's causal attention mask, a
  1024 × 1024 matrix the original code registered as a *buffer*. `torch.save` writes every buffer in
  the module's state, so the safetensors conversion inherited them: 160 tensors, 137.0M elements, of
  which 12.6M are masks. The TensorFlow and Flax code rebuilds the mask at run time and stores none.
- **The extra 154 MB in `rust_model.ot` and the ONNX files** is the token-embedding matrix
  (50,257 × 768) written a second time as the output layer. GPT-2 *ties* those two weights; a
  framework that knows about tying stores the matrix once, and one that does not stores it twice.
- **The TFLite files** are a compiled program with its weights inside, and two of them have been
  converted to smaller number formats on the way.

None of these files is wrong. They were written for different programs that load them in different
ways. That is the whole subject of this essay, in one repository.

## What is actually inside

Strip any format down and the same layers appear. Most files carry the first four; the last two
separate the specialised formats from the rest.

<figure class="fig">
<span class="fig-title">Figure 1.1b &#183; The anatomy of a model file, and which formats carry each part</span>
<div class="fig-stack">
<div class="fig-layer fig-layer--hi"><b>Tensors</b><span>Named arrays: a name (<code>blk.0.attn_q.weight</code>), an element type (BF16, F32, Q4_K…), a shape, and the raw bytes. Over 99% of every file.<span class="fig-tags"><i class="fig-tag">every format</i></span></span></div>
<div class="fig-layer"><b>Number format</b><span>How to turn the stored bits back into real numbers: plain floats, or small integers plus per-block scales, zero points or codebooks.<span class="fig-tags"><i class="fig-tag">GGUF: inside the type</i><i class="fig-tag">safetensors: extra tensors + config.json</i></span></span></div>
<div class="fig-layer"><b>Architecture</b><span>Layer count, hidden size, heads, RoPE settings, which activation. Without it the numbers are just numbers.<span class="fig-tags"><i class="fig-tag">GGUF metadata</i><i class="fig-tag">config.json beside safetensors</i><i class="fig-tag">implicit in a graph</i></span></span></div>
<div class="fig-layer"><b>Tokenizer &amp; template</b><span>Vocabulary, merge rules, the pre-tokenizer, special tokens &#8212; and the chat template that turns a list of messages into one token stream.<span class="fig-tags"><i class="fig-tag">GGUF</i><i class="fig-tag">tokenizer.json</i><i class="fig-tag">LiteRT .task / .litertlm</i><i class="fig-tag">OpenVINO</i></span></span></div>
<div class="fig-layer"><b>Computation graph</b><span>The operations themselves, in order, so a runtime needs no model code at all.<span class="fig-tags"><i class="fig-tag">ONNX</i><i class="fig-tag">SavedModel</i><i class="fig-tag">LiteRT</i><i class="fig-tag">Core ML</i><i class="fig-tag">ExecuTorch</i><i class="fig-tag">TensorRT</i></span></span></div>
<div class="fig-layer"><b>Training state</b><span>Optimizer moments, the step counter, learning-rate schedule, random-number state &#8212; everything needed to resume, nothing needed to run.<span class="fig-tags"><i class="fig-tag">.pt / .ckpt checkpoints</i><i class="fig-tag">distributed checkpoints</i></span></span></div>
</div>
<figcaption>The first two layers are the weights; the next two are what it takes to use them; the last two are what a format adds when it is built for one job.</figcaption>
</figure>

## The arithmetic that sets the size

The size of a weights file is almost exactly one multiplication:

$$\text{bytes} \approx N \times \frac{b}{8}$$

where $N$ is the number of parameters and $b$ the *average* bits stored per parameter, scales and
all. An 8-billion-parameter model is 32 GB at 32 bits, 16 GB at 16, and a little under 5 GB in the
most popular 4-bit GGUF — not 4 GB, because a "4-bit" file spends extra bits on scales and keeps its
most sensitive matrices at 6 bits ([section 4.2](/post/whats-in-a-model-file?section=sec-4-2)).

| Llama 3.1 8B, stored as | Bits per weight | File size |
|---|---|---|
| FP32 (training precision) | 32 | 32.1 GB |
| BF16 (how it was released) | 16 | 16.1 GB |
| Q8_0 (GGUF) | 8.5 | 8.54 GB |
| Q6_K (GGUF) | 6.56 | 6.60 GB |
| Q4_K_M (GGUF) | 4.89 | 4.92 GB |
| IQ4_XS (GGUF) | 4.42 | 4.45 GB |
| Q2_K (GGUF) | 3.16 | 3.18 GB |

<p class="fig-note">File sizes from <code>bartowski/Meta-Llama-3.1-8B-Instruct-GGUF</code>; bits per weight computed from each file&#8217;s tensor table.</p>

The same formula explains why training checkpoints dwarf releases. A run using mixed precision with
the Adam optimizer keeps, per parameter, a BF16 working copy, an FP32 master copy and two FP32
moment estimates — about 14 bytes, before gradients ([Rajbhandari et al. 2020](https://arxiv.org/abs/1910.02054)).
For an 8B model that is over 110 GB of checkpoint behind a 16 GB release. Formats built to
resume training and formats built to serve are solving different problems from the first byte.

## The small parts are not optional

By bytes, a model file is all tensors. By consequence, the kilobytes of architecture, tokenizer and
template matter as much. For eleven days in April 2024, every Llama 3 GGUF on the Hub split text
into tokens with GPT-2's rules instead of Llama 3's, because the converter did not record which
pre-tokenizer the model used. The files loaded, the model answered, and the answers were subtly
worse — "What is 3333+777?" came out wrong ([llama.cpp #6914](https://github.com/ggml-org/llama.cpp/issues/6914)).
Nothing about the weights was broken. [Section 5.2](/post/whats-in-a-model-file?section=sec-5-2)
collects failures of this kind; they are the most common way a conversion goes wrong.

A typical Hugging Face repository shows how the parts are spread across files when the weights format
itself carries only tensors:

```text
Qwen/Qwen2.5-7B-Instruct/
├── config.json                          architecture: layers, heads, RoPE, dtype
├── generation_config.json               default sampling settings, stop tokens
├── model-00001-of-00004.safetensors     the tensors, in four shards …
├── model-00004-of-00004.safetensors
├── model.safetensors.index.json         which tensor lives in which shard
├── tokenizer.json                       the full tokenizer pipeline
├── tokenizer_config.json                special tokens and the chat template
├── vocab.json, merges.txt               the vocabulary again, in the older layout
└── README.md                            the model card, with YAML metadata
```

A GGUF file puts every line of that listing into one file. An ONNX export keeps the tensors, turns
the architecture into a graph, and leaves the tokenizer out. Those are the trade-offs the next
section names.

## Open one yourself

The inspector below reads a model file's header in your browser — a file on your disk, or a URL on
Hugging Face, fetched with range requests so that only the header crosses the network. Try the
GPT-2 files from figure 1.1a, or any GGUF.

<figure class="fig">
<span class="fig-title">Playground &#183; What is inside this file?</span>
<div data-widget="inspector" data-samples="safetensors · GPT-2=https://huggingface.co/openai-community/gpt2/resolve/main/model.safetensors|pickle · GPT-2 .bin=https://huggingface.co/openai-community/gpt2/resolve/main/pytorch_model.bin|zip · GPT-2 .ot=https://huggingface.co/openai-community/gpt2/resolve/main/rust_model.ot|GGUF · Llama 3.2 1B Q4_K_M=https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf|LiteRT · GPT-2 INT8=https://huggingface.co/openai-community/gpt2/resolve/main/64-8bits.tflite"><p class="pg-note">The inspector needs JavaScript.</p></div>
<figcaption>Nothing is uploaded. A local file is read in 64 KB slices; a remote one with HTTP range requests. The GGUF sample reads about 8 MB of a 808 MB file, most of it vocabulary.</figcaption>
</figure>
