Most people meet a model through its name, and model names have become dense: `Qwen3-235B-A22B-Instruct-2507`,
`Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf`, `qwen3.6:35b-a3b-mtp-q4_K_M`. No authority governs them. They are
conventions that publishers copy from each other, and once you know the pieces most names read like a
spec sheet.

## The anatomy of a name

<figure class="fig">
<span class="fig-title">Figure 5.1a &#183; Three real names, token by token</span>
<div class="fig-panel">
<span class="fig-sub">A Hugging Face repository</span>
<div class="pg-toks">
<span class="pg-tok"><code>Qwen/</code><i>publisher</i></span>
<span class="pg-tok"><code>Qwen3</code><i>family + generation</i></span>
<span class="pg-tok pg-tok--hi"><code>235B-A22B</code><i>total &#8211; active params</i></span>
<span class="pg-tok"><code>Instruct</code><i>tuning</i></span>
<span class="pg-tok"><code>2507</code><i>date: July 2025</i></span>
</div>
</div>
<div class="fig-panel">
<span class="fig-sub">A GGUF file inside a quantizer&#8217;s repository</span>
<div class="pg-toks">
<span class="pg-tok"><code>unsloth/</code><i>quantizer</i></span>
<span class="pg-tok"><code>Qwen3.6</code><i>family + generation</i></span>
<span class="pg-tok"><code>35B-A3B</code><i>total &#8211; active</i></span>
<span class="pg-tok"><code>UD-</code><i>Unsloth&#8217;s own mix</i></span>
<span class="pg-tok pg-tok--hi"><code>Q4_K_XL</code><i>quant recipe</i></span>
<span class="pg-tok"><code>.gguf</code><i>container</i></span>
</div>
</div>
<div class="fig-panel">
<span class="fig-sub">An Ollama tag</span>
<div class="pg-toks">
<span class="pg-tok"><code>qwen3.6</code><i>model</i></span>
<span class="pg-tok"><code>:35b</code><i>size</i></span>
<span class="pg-tok"><code>-a3b</code><i>active</i></span>
<span class="pg-tok"><code>-mtp</code><i>draft head kept</i></span>
<span class="pg-tok pg-tok--hi"><code>-q4_K_M</code><i>quant recipe</i></span>
</div>
</div>
<figcaption>All three are real. The highlighted token is the one that decides whether the model fits your machine.</figcaption>
</figure>

Read any name as answers to the same eight questions, roughly in this order:

| Question | Tokens | Examples |
|---|---|---|
| Who uploaded it? | the namespace | `meta-llama/`, `Qwen/` (the lab); `bartowski/`, `unsloth/`, `mradermacher/` (quantizers); anyone else |
| Which model? | family, generation, line, tier | `Llama-3.1`, `Qwen3.6`, `gemma-3n`, `DeepSeek-R1`, `Mistral-Small-3.2`, `Kimi-K2.6` |
| How big? | size | `8B`, `0.5B`, `35B-A3B` (total–active), `8x7B` (experts), `E4B` (effective) |
| How tuned? | tuning, skill | `Base`/`pt`, `Instruct`/`it`/`Chat`, `Thinking`, `Coder`, `VL`, `Embed` |
| Derived how? | derivation | `Distill`, `abliterated`, `REAP`, `Minitron`, a brand such as `Hermes-3-` before the base |
| When? | version, date | `v0.3`; `2507` (Qwen, Mistral: year-month); `0528` (DeepSeek: month-day) |
| Stored how? | precision, method, container | `BF16`, `FP8-dynamic`, `NVFP4`, `W4A16`, `GPTQ-Int4`, `AWQ`, `bnb-4bit`, `4bit`, `GGUF`, `int4-ov`, `q4f16_1-MLC` |
| Which piece? | file quant, shard, sidecar | `Q4_K_M`, `IQ3_XXS`, `-00001-of-00003`, `mmproj-` |

## Where names mislead

Names are written by people, and several of the conventions are traps:

- **Sizes are rounded and sometimes aren't sums.** Mixtral `8x7B` has 46.7B parameters, not 56B,
  because the experts share attention and embeddings; `gpt-oss-120b` has 116.8B; Gemma 3n `E4B` is
  "effective 4B" but 7.85B raw.
- **Four digits mean two different things.** `2507` is July 2025 in Qwen's and Mistral's names;
  `0528` is 28 May in DeepSeek's.
- **"Distill" names the teacher first.** `DeepSeek-R1-Distill-Qwen-7B` is a Qwen model (Qwen2.5-Math-7B,
  which the name does not say) trained on R1's outputs.
- **Some quant names do not exist in llama.cpp.** `Q4_K_L` and `UD-Q4_K_XL` are community recipes; the
  files' own headers record them as Q4_K_M with some tensors bumped up ([section 4.2](/post/whats-in-a-model-file?section=sec-4-2)).
- **The uploader is not the trainer.** A name can carry a lab's family name and come from anyone.
- **Old names linger.** Meta dropped the `Meta-` prefix from its Llama 3.1 repositories, Neural Magic became `RedHatAI`,
  NVIDIA renamed its `-FP4` repositories `-NVFP4`; redirects and quantizers' copies keep the old names
  alive.
- **Even the Hub's parameter count can be wrong.** It counts elements, so a packed 4-bit repository
  looks half its size: `nvidia/Nemotron-3-Embed-1B-NVFP4` displays 704.7M for a 1.14B model.

## Three names from the wild

The names that prompted this section, looked up and checked against each repository:

| Name | What it actually is |
|---|---|
| **Kimi-K2.6-519B-NVFP4** | Not from Moonshot: `0xSero/Kimi-K2.6-519B-NVFP4`, an individual's build of NVIDIA's NVFP4 version of Kimi K2.6. **519B** is exact arithmetic — K2.6's 1,026.9B parameters minus exactly half its routed experts (192 of 384 per layer, removed with Cerebras' REAP pruning) leaves 519,536,364,528, the count the Hub reports. Active parameters stay about 32B. The author warns it "falls into nonsense and repetition loops on open-ended / long-form generation". |
| **Qwopus3.6-35B-A3B-Coder-MTP-GGUF** | `Jackrong/…`, a community model: Qwen3.6-35B-A3B, fine-tuned into the Qwopus series (Qwen + Claude **Opus**-style reasoning traces, per the series' earlier cards), then a Coder stage. **MTP** means the GGUF keeps Qwen3.6's multi-token-prediction layer (its header shows 41 blocks where standard conversions have 40) so llama.cpp can use it to draft tokens and generate faster. 408,707 downloads in the last 30 days. |
| **Nemotron-3-Embed-1B-NVFP4** | NVIDIA's own: a 1.14B *embedding* model producing 2,048-dimensional vectors for retrieval, with a 32K context. It began as Mistral's Ministral 3 3B chat model, was converted to bidirectional attention, pruned twice and distilled from an 8B sibling. The NVFP4 version scores 72.00 against 72.38 for BF16 on its retrieval benchmark. |

<p class="fig-note">From each repository&#8217;s model card, <code>config.json</code> and Hub API record, read on 28 September 2026.</p>

All three show the same thing: the name told you the shape of the model and nothing about its
provenance. Two of the three come from individuals, not from the labs whose models they are built on.

## Platforms add their own grammars

| Platform | Pattern | Read it as |
|---|---|---|
| **Ollama** | `host/namespace/model:tag@digest`, mostly just `model:tag` | `llama3.1` means `registry.ollama.ai/library/llama3.1:latest`; `latest` is an alias for the default size at Q4_K_M ([source](https://github.com/ollama/ollama/blob/main/types/model/name.go)) |
| **Ollama from the Hub** | `hf.co/user/repo:quant` | picks that GGUF; without a quant, Q4_K_M if present |
| **LM Studio** | `publisher/model@q4_k_m` | the `@` selects the quantization |
| **MLX** | `mlx-community/Model-4bit`, `-8bit`, `-4bit-DWQ` | affine 4-bit, groups of 64; DWQ tuned by distillation |
| **ExLlama** | `repo-exl2` with branches `4.0bpw`, `6.0bpw` | the size is a *git branch*, not a file |
| **MLC** | `Model-q4f16_1-MLC` | 4-bit weights, 16-bit float compute, layout variant 1 |
| **ONNX (Microsoft)** | folders like `cpu-int4-rtn-block-32-acc-level-4` | CPU; int4; round-to-nearest; 32 per scale; int8 compute allowed |
| **OpenVINO** | `Model-int4-ov` | OpenVINO IR with 4-bit weights |
| **NVIDIA, Red Hat** | `Model-FP8`, `-NVFP4`, `-FP8-dynamic`, `-quantized.w4a16` | the precision, appended to the upstream name |

## Is anything standard?

Two things try. The GGUF specification has a naming convention —
`<BaseName>-<SizeLabel>-<FineTune>-<Version>-<Encoding>-<Type>-<Shard>.gguf` — and says of it, candidly,
that it "is not intended to be perfectly parsable in the field". It is barely followed: of 6,815 GGUF
files in the 400 most-downloaded GGUF repositories, 27 pass the specification's own validation regex —
and the specification's own example, `Hermes-2-Pro-Llama-3-8B-F16.gguf`, which omits a version, is not
among them. Hugging Face's model cards carry a `base_model` field and a `base_model_relation` with four
values — quantized, finetune, adapter, merge — which build the Hub's "model tree". Four values cannot
describe pruning, distillation or conversion, so derivatives are routinely mislabelled: the pruned Kimi
above calls itself "quantized".

The reliable description of a model is inside the file, not on it: GGUF's `general.*` keys,
`config.json` and its `quantization_config`, and the tensor table. The name is a hint; the header is
the evidence.

## Decode one

<figure class="fig">
<span class="fig-title">Playground &#183; Paste a name, get a reading</span>
<div data-widget="name-decoder" data-examples="0xSero/Kimi-K2.6-519B-NVFP4|Jackrong/Qwopus3.6-35B-A3B-Coder-MTP-GGUF|nvidia/Nemotron-3-Embed-1B-NVFP4|Qwen/Qwen3-235B-A22B-Instruct-2507|deepseek-ai/DeepSeek-R1-Distill-Qwen-7B|bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf|unsloth/Qwen3.6-35B-A3B-GGUF/Qwen3.6-35B-A3B-UD-Q4_K_XL.gguf|RedHatAI/Meta-Llama-3.1-8B-Instruct-quantized.w4a16|mistralai/Mixtral-8x7B-Instruct-v0.1|google/gemma-3-27b-it-qat-q4_0-gguf|mlx-community/Qwen3-30B-A3B-4bit-DWQ|llama3.1:8b-instruct-q4_K_M"><p class="pg-note">The decoder needs JavaScript.</p></div>
<figcaption>A rule-based reader of the conventions above: it knows the common tokens, not every publisher&#8217;s habits, and marks what it does not recognise with a dashed box. The size estimate is parameters &#215; bits &#247; 8.</figcaption>
</figure>
