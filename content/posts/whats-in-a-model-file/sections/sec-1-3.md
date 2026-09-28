The formats did not arrive by design. Each was a fix for whatever had just gone wrong: a model too big
to load, a file too dangerous to open, a phone too small to run anything. Three shifts drove them,
and the timeline falls into four eras.

<figure class="fig">
<span class="fig-title">Figure 1.3 &#183; Twelve years of model files</span>
<div class="fig-tl">
<span class="fig-tl-era">Each framework its own file, 2014&#8211;2019</span>
<div class="fig-tl-row"><i>Jun 2014</i><span><b>Caffe&#8217;s <code>.caffemodel</code></b> &#8212; a protobuf of layers and weights. <em>The model file as a framework&#8217;s private save format.</em></span></div>
<div class="fig-tl-row"><i>Feb 2017</i><span><b>TensorFlow SavedModel</b> &#8212; a directory: the graph as a protobuf, the weights as a checkpoint. <em>The file is the program.</em></span></div>
<div class="fig-tl-row"><i>Jun 2017</i><span><b>Core ML</b> &#8212; Apple&#8217;s <code>.mlmodel</code>. <em>A format defined by the device, not the framework.</em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>Sep 2017</i><span><b>ONNX</b> &#8212; Microsoft and Facebook publish one graph format for every framework (working name &#8220;Toffee&#8221;). <em>The first attempt at a common language.</em></span></div>
<div class="fig-tl-row"><i>Nov 2017</i><span><b>TensorFlow Lite</b> &#8212; FlatBuffers a phone can use without parsing. <em>Size and load time become the design goals.</em></span></div>
<div class="fig-tl-row"><i>Nov 2018</i><span><b><code>pytorch_model.bin</code></b> &#8212; the name is born in pytorch-pretrained-BERT. <em>A pickle with a generic extension becomes the default way to share a model.</em></span></div>
<span class="fig-tl-era">Models get shared, and pickles get noticed, 2020&#8211;2022</span>
<div class="fig-tl-row"><i>Jul 2020</i><span><b>PyTorch 1.6</b> &#8212; <code>torch.save</code> writes an aligned zip instead of a raw pickle stream. <em>Still a pickle inside.</em></span></div>
<div class="fig-tl-row"><i>Aug 2022</i><span><b>Stable Diffusion&#8217;s <code>.ckpt</code></b> &#8212; the most-shared model of the year is a PyTorch Lightning training checkpoint. <em>Millions of people download pickles from strangers.</em></span></div>
<div class="fig-tl-row"><i>Oct 2022</i><span><b><code>weights_only</code></b> &#8212; PyTorch 1.13 adds a restricted loader. It is off by default.</span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>Nov 2022</i><span><b>safetensors</b> &#8212; Hugging Face&#8217;s JSON-header-plus-bytes format lands in the most popular Stable Diffusion UI. <em>Weights that cannot run code.</em></span></div>
<span class="fig-tl-era">Everyone runs models at home, 2023&#8211;2024</span>
<div class="fig-tl-row"><i>Mar 2023</i><span><b>llama.cpp and GGML</b> &#8212; LLaMA in C++ on a laptop; within three weeks, a new format that can be memory-mapped. <em>Local inference needs its own file.</em></span></div>
<div class="fig-tl-row"><i>Jun 2023</i><span><b>K-quants</b> &#8212; 2- to 6-bit block types with per-tensor mixes like Q4_K_M. <em>Quantization moves into the format.</em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>Aug 2023</i><span><b>GGUF</b> &#8212; one self-describing file: weights, architecture, tokenizer, chat template. <em>The format of local AI.</em></span></div>
<div class="fig-tl-row"><i>Sep 2023</i><span><b>OCP Microscaling spec</b> &#8212; AMD, Arm, Intel, Meta, Microsoft, NVIDIA and Qualcomm agree on block-scaled 4-, 6- and 8-bit formats.</span></div>
<div class="fig-tl-row"><i>Nov 2023</i><span><b>transformers 4.35</b> &#8212; <code>save_pretrained</code> writes safetensors by default.</span></div>
<div class="fig-tl-row"><i>Dec 2023</i><span><b>MLX</b> &#8212; Apple&#8217;s array framework; its models are safetensors with a naming convention.</span></div>
<div class="fig-tl-row"><i>Feb 2024</i><span><b>Malicious models on the Hub</b> &#8212; JFrog finds about a hundred with real payloads, one opening a reverse shell. <em>The pickle risk stops being theoretical.</em></span></div>
<div class="fig-tl-row"><i>Sep 2024</i><span><b>TFLite becomes LiteRT</b> &#8212; same file format, new name, now fed from PyTorch and JAX as well.</span></div>
<span class="fig-tl-era">The release is the quantized file, 2025&#8211;2026</span>
<div class="fig-tl-row"><i>Jan 2025</i><span><b>DeepSeek ships only FP8</b>; <b>PyTorch 2.6</b> makes <code>weights_only=True</code> the default. <em>Four years after it was first requested.</em></span></div>
<div class="fig-tl-row"><i>Apr 2025</i><span><b>Google ships Gemma 3 as Q4_0 GGUF</b>, trained to survive it. <b>OpenSSF Model Signing 1.0.</b></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>Aug 2025</i><span><b>gpt-oss</b> &#8212; OpenAI releases its open models with the experts in MXFP4; llama.cpp adds the type the same day. <em>A 4-bit format as the original artifact.</em></span></div>
<div class="fig-tl-row"><i>Oct 2025</i><span><b>ExecuTorch 1.0</b>; the Hub finishes moving 77 PB from Git LFS to chunk-deduplicated Xet storage.</span></div>
<div class="fig-tl-row"><i>Nov 2025</i><span><b>Kimi K2 Thinking</b> &#8212; a trillion-parameter model released as native INT4, every benchmark reported at INT4.</span></div>
<div class="fig-tl-row"><i>Jan 2026</i><span><b>transformers v5</b> removes the option to save pickles at all.</span></div>
<div class="fig-tl-row"><i>Feb&#8211;Apr 2026</i><span><b>ggml.ai joins Hugging Face</b>; <b>safetensors joins the PyTorch Foundation.</b> <em>The two dominant formats get institutional homes.</em></span></div>
<div class="fig-tl-row"><i>Jul 2026</i><span><b>TensorRT-LLM deletes its engine builder</b> &#8212; NVIDIA&#8217;s fastest server now loads Hugging Face checkpoints directly.</span></div>
</div>
<figcaption>Dates are first releases or merges; sources are in each format&#8217;s section and in the <a href="/post/whats-in-a-model-file?section=sec-7-1">references</a>.</figcaption>
</figure>

## The three shifts

**From research artifact to download.** Until about 2020, a model file was read by the people who
wrote it, in the framework that wrote it, so a pickle was a convenience. When the Hugging Face Hub
turned model files into something millions of strangers download, the same convenience became an
open door. The response took five years — safetensors in 2022, the default save in 2023, the default
safe *load* in PyTorch only in 2025, and the end of pickle saving in transformers in 2026 — and it is
still not complete: in March 2025, 44.9% of popular Hub repositories still contained pickle files
([PickleBall, Kellas et al. 2025](https://arxiv.org/abs/2508.15987)).

**From data centre to laptop.** A 7-billion-parameter model at 16 bits does not fit a consumer GPU
with 8 GB. Running it at home required 4-bit weights, and 4-bit weights required a format that knew
about blocks and scales and could be memory-mapped from a laptop SSD. GGML, then GGUF, was written by
the people who needed it, in weeks, and it became the second pillar of the ecosystem: 207,142 GGUF
repositories on the Hub as of this writing, a third of them uploaded by a single account
([section 2.3](/post/whats-in-a-model-file?section=sec-2-3)).

**From quantizing afterwards to training for it.** Hopper GPUs made FP8 fast in 2022; Blackwell made
4-bit floats fast in 2025. Model builders started training and post-training their models *in* those
formats, so the low-precision file stopped being a community's lossy copy and became the release
itself. DeepSeek publishes FP8. OpenAI published gpt-oss in MXFP4. Moonshot reports every Kimi K2
Thinking benchmark at INT4. When the original is 4-bit, "converting to 4 bits" is no longer a step
anyone takes.

## Why the old formats never go away

Formats are cheap to invent and expensive to retire, because files outlive the programs that wrote
them. GPT-2's repository, figure 1.1a, still serves a pre-2020 PyTorch pickle to about fifteen
million downloads a month. PyTorch still reads a `.tar` layout older than that. When llama.cpp
introduced GGUF it broke every existing file on purpose — "all existing `ggml` models will no longer
be compatible", said the pull request — and it is the exception that proves the rule. Expect every format in this essay to be readable for a long time — which is exactly why
the security properties of the old ones still matter.
