GGUF is the format of local AI: the file you download to run a model in llama.cpp, Ollama or LM
Studio. Where safetensors stores tensors and leaves the rest of the model scattered across a
repository, GGUF puts everything a runtime needs into one file — weights, architecture, tokenizer,
chat template and quantization — and makes the weights usable straight from disk.

## Four formats in six months

GGUF is the fourth format llama.cpp used in its first year, and each step fixed the one before.

<figure class="fig">
<span class="fig-title">Figure 2.3a &#183; From GGML to GGUF, 2023</span>
<div class="fig-steps">
<div class="fig-step"><b>GGML &#183; Mar 2023</b><em>A thin list of hyperparameters, vocabulary and tensors. No version, no alignment. The meaning of each number was hard-coded for LLaMA.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>GGMF &#183; Mar 20</b><em>Adds a version field and a score for every vocabulary entry, for a SentencePiece-style tokenizer.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>GGJT &#183; Mar 30</b><em>Aligns tensors to 32 bytes so the file can be memory-mapped: &#8220;Make loading weights 10&#8211;100x faster&#8221;.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step fig-step--hi"><b>GGUF &#183; Aug 21</b><em>Typed key&#8211;value metadata instead of a fixed list, so a new architecture or setting no longer breaks every reader.</em></div>
</div>
<figcaption>After the spec&#8217;s &#8220;Historical State of Affairs&#8221; (<a href="https://github.com/ggml-org/ggml/blob/master/docs/gguf.md">docs/gguf.md</a>) and the pull requests: <a href="https://github.com/ggml-org/llama.cpp/pull/252">#252</a>, <a href="https://github.com/ggml-org/llama.cpp/pull/613">#613</a>, <a href="https://github.com/ggml-org/llama.cpp/pull/2398">#2398</a>.</figcaption>
</figure>

The problem GGUF solved is spelled out in its spec: in the older formats "there's no way to identify
which model architecture a given model is for", "adding or removing any new hyperparameters is a
breaking change", and each architecture needed its own conversion script. The fix was to replace the
fixed list of numbers with named, typed metadata — `llama.block_count = 32` — that a reader can skip
if it does not understand it.

The history has good details. The GGJT change was contentious because its magic number, `ggjt`,
was the initials of the pull request's author; Georgi Gerganov replied that "probably this wasn't the
brightest idea… The most important goal for me for this project is to have fun and experiment"
([#647](https://github.com/ggml-org/llama.cpp/issues/647)). Those old magics were also written as
C multi-character constants, so on little-endian machines the file actually began `tjgg`. GGUF is the
first in the family to define its magic byte by byte. Its specification was drafted by Philpax in
June 2023, shipped in llama.cpp on 21 August, and merged as a document only on 1 November — after
versions 2 (64-bit counts, six days after version 1) and 3 (big-endian files, for IBM mainframes) had
already shipped.

## The layout

<figure class="fig">
<span class="fig-title">Figure 2.3b &#183; A GGUF file</span>
<div class="fig-bytes">
<div class="fig-byte fig-byte--hd" style="--w:1.3"><b>Header &#183; 24 B</b><code>GGUF</code>, version 3, tensor count, key&#8211;value count</div>
<div class="fig-byte fig-byte--hd fig-byte--hi" style="--w:2.6"><b>Metadata</b>typed key&#8211;value pairs: architecture, hyperparameters, tokenizer, chat template</div>
<div class="fig-byte fig-byte--hd" style="--w:1.6"><b>Tensor infos</b>per tensor: name, shape, type, offset</div>
<div class="fig-byte" style="--w:0.6"><b>pad</b>to 32 B</div>
<div class="fig-byte" style="--w:6"><b>Tensor data</b>each tensor aligned; offsets count from here</div>
</div>
<figcaption>Values are little-endian by default. Thirteen value types (eight integer widths, two floats, bool, string, array); a string is a 64-bit length and UTF-8 bytes. Alignment is <code>general.alignment</code>, 32 if absent.</figcaption>
</figure>

Parsing it is a loop over those regions, and the tensor table tells you the exact byte of every
weight. Here is what the header of a real file — `Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf`, 4.92 GB —
says:

```text
GGUF v3 · 292 tensors · 29 metadata keys · header 7.84 MB · tensor data at byte 7,840,640

general.architecture          = llama
general.name                  = Meta Llama 3.1 8B Instruct
general.file_type             = 15            (MOSTLY_Q4_K_M)
llama.block_count             = 32
llama.context_length          = 131072
llama.embedding_length        = 4096
llama.attention.head_count    = 32
llama.attention.head_count_kv = 8             (grouped-query attention)
llama.rope.freq_base          = 500000.0
tokenizer.ggml.model          = gpt2          (byte-level BPE)
tokenizer.ggml.pre            = llama-bpe     (which pre-tokenizer: the key added after April 2024)
tokenizer.ggml.tokens         = [128,256 strings]
tokenizer.ggml.merges         = [280,147 strings]
tokenizer.chat_template       = "{{- bos_token }} {%- if custom_tools is defined %} …"

token_embd.weight             Q4_K  [4096, 128256]
blk.0.attn_q.weight           Q4_K  [4096, 4096]
blk.0.attn_v.weight           Q6_K  [4096, 1024]
blk.0.ffn_down.weight         Q6_K  [14336, 4096]
…
```

Three things in that listing are worth noticing:

- **The header is mostly tokenizer.** It is 7.84 MB — 0.16% of the file — and almost all of it is
  128,256 vocabulary strings and 280,147 merge rules. It is why Hugging Face's browser parser fetches
  the header in 2 MB range requests and gives up at 50 MB.
- **Shapes are reversed.** GGUF lists the fastest-varying dimension first, so the embedding PyTorch
  calls `[128256, 4096]` appears as `[4096, 128256]`. Converters also rename every tensor
  (`model.layers.0.self_attn.q_proj` becomes `blk.0.attn_q`) and, for Llama, permute the Q and K
  weights to match ggml's rotary layout.
- **Types vary tensor by tensor.** `general.file_type = 15` names the *recipe* (Q4_K_M), while each
  tensor records its own type — here Q4_K, Q6_K and F32 for the norms. The recipe and the type are
  different enumerations: Q8_0 is file type 7 but tensor type 8. [Section 4.2](/post/whats-in-a-model-file?section=sec-4-2)
  decodes all of them.

The metadata is also where GGUF's expressiveness lives. llama.cpp's Python package knows 152
architectures, each a set of keys like `{arch}.expert_count`, `{arch}.rope.scaling.type` or
`{arch}.attention.sliding_window`. When a new model needs a setting that does not exist yet — Gemma 2's
logit soft-capping, Llama 3.1's rope factors, DeepSeek's compressed attention — the key is added, and
files converted before then must be reconverted ([section 5.2](/post/whats-in-a-model-file?section=sec-5-2)).

## Many files, one model

Nothing in GGUF limits file size, but hosting does: Hugging Face capped single files at 50 GB until
November 2025 (now 500 GB), so a generation of large models was published in shards named
`Model-Q4_K_M-00001-of-00003.gguf`. Each shard is a complete GGUF with its own header plus
`split.no` and `split.count` keys, and llama.cpp loads all parts when given the first
([gguf-split](https://github.com/ggml-org/llama.cpp/pull/6135)). Multimodal models add a second kind of
companion: an `mmproj-…gguf` file with the vision encoder.

## The ecosystem around one format

GGUF won because an ecosystem formed around it within months:

- **Ollama** stores models as Docker-style images. Pulling `llama3.1:8b` fetches a registry manifest
  whose layers are a plain GGUF (4,920,738,944 bytes), a chat template in Go syntax, a licence and a
  parameters file; the config blob still says `"architecture":"amd64","os":"linux"`. The tags
  `latest`, `8b` and `8b-instruct-q4_K_M` all point at the same Q4_K_M file. Ollama built its own
  engine on ggml in May 2025, then deleted it in May 2026 in favour of upstream llama.cpp for GGUF,
  keeping an MLX engine for safetensors on Apple silicon ([#16031](https://github.com/ollama/ollama/pull/16031)).
- **llamafile** (Mozilla, November 2023) hides a GGUF inside an uncompressed, page-aligned ZIP inside a
  shell script that is also a Windows executable, so one file runs on six operating systems and the
  GPU can still map the weights in place ([README](https://github.com/mozilla-ai/llamafile)).
- **The quantizers.** 207,142 repositories on the Hub carry the GGUF tag. One uploader, mradermacher,
  accounts for 70,152 of them. TheBloke, who defined the genre in 2023 with an a16z open-source grant,
  stopped uploading on 31 January 2024, after 3,863 repositories; bartowski and Unsloth are the most
  followed today.
- **Stewardship.** ggml.ai, the company Gerganov founded in 2023, joined Hugging Face on 20 February
  2026 with llama.cpp remaining MIT-licensed and community-run
  ([announcement](https://github.com/ggml-org/llama.cpp/discussions/19759)).

## Where it is weak

A GGUF cannot run code by design, but it is not inert. Its binary parser, written in C, is
attacker-controlled input: two teams found heap overflows in it in January 2024, and new ones were
still being assigned CVEs in 2026. And its metadata carries a *program* — the Jinja chat template —
which one popular Python wrapper rendered without a sandbox until May 2024, turning a model file into
remote code execution ([CVE-2024-34359](https://github.com/advisories/GHSA-56xg-wfcc-g829); more in
[section 5.3](/post/whats-in-a-model-file?section=sec-5-3)).

The other weakness is the one figure 1.2a predicts. GGUF describes an architecture by name; it does
not contain it. Every new architecture needs a hand-written C++ implementation before any GGUF of it
can run, and until then the format has nothing to offer.

## Verdict

| Use it for | Avoid it for |
|---|---|
| Running a model locally on CPU, Apple silicon, consumer GPUs, or a mix | High-throughput GPU serving (vLLM supports it only as an "experimental" plugin) |
| One self-contained file to hand to someone | Training or fine-tuning (convert from safetensors afterwards) |
| Aggressive quantization with many size choices | A brand-new architecture llama.cpp does not implement yet |
