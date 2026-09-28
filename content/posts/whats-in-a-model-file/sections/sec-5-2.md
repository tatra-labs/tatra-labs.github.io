Almost every file you run was converted from another one. The conversions form a star: one
full-precision original, usually BF16 safetensors, and a spoke to every format in this essay. Knowing
which spokes lose information, and what tends to break on each, is most of the practical skill.

## The map

<figure class="fig">
<span class="fig-title">Figure 5.2a &#183; From the original to everything else</span>
<div class="fig-scroll">
<div class="fig-grid fig-grid--wide" style="--cols:3">
<span class="fig-cell fig-cell--hd">From BF16 safetensors to</span>
<span class="fig-cell fig-cell--hd">Tool</span>
<span class="fig-cell fig-cell--hd">Numbers change?</span>
<span class="fig-cell fig-cell--hd">What usually breaks</span>
<span class="fig-cell fig-cell--row">GGUF</span><span class="fig-cell"><code>convert_hf_to_gguf.py</code>, then <code>llama-quantize</code></span><span class="fig-cell">only at the quantize step</span><span class="fig-cell fig-cell--alt"><b>Tokenizer and metadata</b><em>new architectures wait for llama.cpp support</em></span>
<span class="fig-cell fig-cell--row">GPTQ / AWQ / FP8 / NVFP4</span><span class="fig-cell">llm-compressor, NVIDIA Model Optimizer</span><span class="fig-cell">yes, with calibration</span><span class="fig-cell">layers that should be skipped (router, output); metadata that disagrees with the weights</span>
<span class="fig-cell fig-cell--row">MLX</span><span class="fig-cell"><code>mlx_lm.convert -q</code></span><span class="fig-cell">only with <code>-q</code></span><span class="fig-cell">architectures mlx-lm has not implemented</span>
<span class="fig-cell fig-cell--row">ONNX</span><span class="fig-cell"><code>optimum-cli export onnx</code>, <code>torch.onnx.export</code></span><span class="fig-cell">no (FP32/FP16)</span><span class="fig-cell">unsupported operators, dynamic shapes, cache plumbing, the 2 GB limit, no tokenizer</span>
<span class="fig-cell fig-cell--row">LiteRT, ExecuTorch, Core ML</span><span class="fig-cell">litert-torch, <code>torch.export</code> + backend, coremltools</span><span class="fig-cell">usually, to INT8/INT4 or FP16</span><span class="fig-cell">graph breaks on data-dependent control flow; only re-authored architectures supported</span>
<span class="fig-cell fig-cell--row">TensorRT engine</span><span class="fig-cell"><code>trtexec</code> from ONNX</span><span class="fig-cell">only if you ask for FP16/INT8</span><span class="fig-cell">plugins for missing ops; the engine works on one GPU and version</span>
<span class="fig-cell fig-cell--grp">Going back</span>
<span class="fig-cell fig-cell--row">GGUF &#8594; transformers</span><span class="fig-cell"><code>from_pretrained(…, gguf_file=…)</code></span><span class="fig-cell fig-cell--alt"><b>You get the rounded weights</b><em>not the original</em></span><span class="fig-cell">the dequantized model is bigger than the GGUF and no better</span>
</div>
</div>
<figcaption>Tools and failure modes from each project&#8217;s documentation and issue tracker; the dated cases are below. Scroll sideways on a narrow screen.</figcaption>
</figure>

Two rules follow from the map. **Always convert from the original**, never from another conversion:
quantizing a quantized file compounds the rounding, and a GGUF turned back into safetensors contains
the rounded values, expanded to a larger type. And **keep the original**. Every device format,
engine and quantized file in the star is a build product you may need to rebuild when the tools
improve — which, as the next part shows, they do constantly.

## What goes wrong, with dates

The weights themselves rarely break in conversion. The small parts do: the tokenizer, the metadata a
runtime needs, the template, the type of one field. Every case below shipped files that *loaded and
ran* and were quietly worse.

<figure class="fig">
<span class="fig-title">Figure 5.2b &#183; Conversions that loaded fine and were wrong</span>
<div class="fig-tl">
<span class="fig-tl-era">The tokenizer</span>
<div class="fig-tl-row fig-tl-row--hi"><i>Apr 2024</i><span><b>Llama 3 GGUFs used GPT-2&#8217;s pre-tokenizer.</b> The converter did not record how Llama 3 splits text before tokenizing; for eleven days every GGUF on the Hub fell back to a default &#8220;which in almost all cases is wrong&#8221;. Fixed by hashing how a tokenizer splits a test string to identify it. <em><a href="https://github.com/ggml-org/llama.cpp/pull/6920">#6920</a></em></span></div>
<span class="fig-tl-era">Settings the format could not yet express</span>
<div class="fig-tl-row"><i>Jun 2024</i><span><b>Gemma 2&#8217;s logit soft-capping</b> needed new metadata; &#8220;the gguf will need to be generated again&#8221;. <em><a href="https://github.com/ggml-org/llama.cpp/pull/8197">#8197</a></em></span></div>
<div class="fig-tl-row"><i>Jul 2024</i><span><b>Llama 3.1&#8217;s RoPE scaling factors</b> were added as a tensor four days after release; earlier files degrade beyond 8,192 tokens. <em><a href="https://github.com/ggml-org/llama.cpp/pull/8676">#8676</a></em></span></div>
<div class="fig-tl-row"><i>Apr 2025</i><span><b>DeepSeek-V3&#8217;s compressed attention (MLA)</b> arrived three and a half months after the model; GGUFs made before then work, with a far larger attention cache. <em><a href="https://github.com/ggml-org/llama.cpp/pull/12801">#12801</a></em></span></div>
<span class="fig-tl-era">Architectures the runtime did not have</span>
<div class="fig-tl-row"><i>Sep&#8211;Nov 2025</i><span><b>Qwen3-Next</b>, a hybrid of linear attention and experts, took eleven weeks to reach llama.cpp, with fixes still landing in 2026. <em><a href="https://github.com/ggml-org/llama.cpp/pull/16095">#16095</a></em></span></div>
<span class="fig-tl-era">Templates and types</span>
<div class="fig-tl-row"><i>Apr 2025</i><span><b>Qwen3&#8217;s chat template</b> used a Python slice, <code>[::-1]</code>, that llama.cpp&#8217;s small Jinja engine could not parse. The model loaded; chat failed. <em><a href="https://github.com/ggml-org/llama.cpp/issues/13178">#13178</a></em></span></div>
<div class="fig-tl-row"><i>Jul 2025</i><span><b>Gemma 3n</b> GGUFs stored one integer setting as a float for a week after launch. <em><a href="https://github.com/ggml-org/llama.cpp/pull/14450">#14450</a></em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>Feb 2026</i><span><b>A checkpoint labelled NVFP4 held FP8 weights</b> &#8212; 6.12 bits per parameter instead of about 4 &#8212; because the exporter unpacked the packed data. Nothing in the format checked. <em><a href="https://github.com/NVIDIA/Model-Optimizer/issues/868">ModelOpt #868</a></em></span></div>
</div>
<figcaption>Dates are when the problem was found or fixed. In every case a reconversion was needed, which is why a GGUF&#8217;s upload date is worth checking against the llama.cpp release that supports its model.</figcaption>
</figure>

The pattern is the one figure 1.2a predicted. A format that names the architecture instead of
containing it can only be as correct as its converter's understanding of the model, and that
understanding is written by hand, under time pressure, in the week a model is released. Graph formats
fail differently but just as often: PyTorch's newer exporter was reported to hard-code the batch size
to one for some models, and anything over 2 GB must be split into external data before protocol
buffers can write it.

## The common conversions

```bash
# Hugging Face → GGUF: convert at full precision, then quantize with an importance matrix
python convert_hf_to_gguf.py ./Qwen3-8B --outtype bf16 --outfile qwen3-8b-bf16.gguf
llama-imatrix -m qwen3-8b-bf16.gguf -f calibration.txt -o imatrix.gguf
llama-quantize --imatrix imatrix.gguf qwen3-8b-bf16.gguf qwen3-8b-Q4_K_M.gguf Q4_K_M

# Hugging Face → MLX, 4-bit with groups of 64
mlx_lm.convert --model Qwen/Qwen3-8B -q

# Hugging Face → ONNX (graph plus FP32 weights; tokenizer not included)
optimum-cli export onnx --model Qwen/Qwen3-0.6B qwen3-0.6b-onnx/
```

```python
# Hugging Face → FP8 for vLLM, with Red Hat's llm-compressor (no calibration data needed)
from llmcompressor import oneshot
from llmcompressor.modifiers.quantization import QuantizationModifier

oneshot(model="Qwen/Qwen3-8B",
        recipe=QuantizationModifier(targets="Linear", scheme="FP8_DYNAMIC", ignore=["lm_head"]),
        output_dir="Qwen3-8B-FP8-dynamic")
```

<p class="fig-note">Commands as documented by <a href="https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md">llama.cpp</a>, <a href="https://github.com/ml-explore/mlx-lm">mlx-lm</a>, <a href="https://github.com/huggingface/optimum-onnx">Optimum</a> and <a href="https://github.com/vllm-project/llm-compressor">llm-compressor</a>; flags change between versions, so check <code>--help</code>.</p>

## Checking a conversion

Four checks catch nearly every failure in figure 5.2b, and all of them compare the new file with the
original rather than with expectations:

1. **Tokenize the same strings with both** — code, numbers, emoji, several languages — and compare the
   IDs exactly. This alone would have caught the Llama 3 bug on day one.
2. **Render the chat template with both** for a conversation with a system prompt and a tool call,
   and diff the resulting text.
3. **Compare next-token distributions** on a few thousand tokens of your own text: the KL divergence
   of [section 4.4](/post/whats-in-a-model-file?section=sec-4-4). An unquantized conversion should be
   near zero; a broken one is obvious.
4. **Run one long prompt** past the model's original training context if you rely on long context —
   the place missing RoPE settings show.
