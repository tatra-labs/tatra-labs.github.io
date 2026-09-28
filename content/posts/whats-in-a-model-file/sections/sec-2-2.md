Safetensors is the answer to pickle, and it is small enough to describe completely in one figure. It
stores named tensors and nothing else, so opening one cannot run code, and it lays them out so a
loader can map them straight from disk.

## The whole format

<figure class="fig">
<span class="fig-title">Figure 2.2a &#183; A safetensors file, byte by byte</span>
<div class="fig-bytes">
<div class="fig-byte fig-byte--hd" style="--w:1.2"><b>8 bytes</b>N, the header length, as a little-endian uint64</div>
<div class="fig-byte fig-byte--hd fig-byte--hi" style="--w:3"><b>N bytes of JSON</b>for each tensor: dtype, shape, and its start and end offsets in the buffer; optionally a <code>__metadata__</code> map of strings</div>
<div class="fig-byte" style="--w:8"><b>the byte buffer</b>every tensor&#8217;s raw bytes, back to back, little-endian, row-major, no gaps</div>
</div>
<figcaption>That is the entire specification (<a href="https://github.com/safetensors/safetensors">README</a>). The header is padded with spaces to a multiple of 8 bytes so the buffer starts aligned.</figcaption>
</figure>

The header of GPT-2's `model.safetensors` is 14,283 bytes of JSON describing 160 tensors, and an
entry looks like this:

```json
{
  "__metadata__": { "format": "pt" },
  "h.2.attn.c_attn.weight": { "dtype": "F32", "shape": [768, 2304], "data_offsets": [541012992, 548090880] },
  "h.10.ln_1.weight":       { "dtype": "F32", "shape": [768],       "data_offsets": [223154176, 223157248] }
}
```

Because the header comes first and says where everything is, any program can read a model's complete
architecture — every tensor name, shape and type — without touching the weights:

```python
import json, struct

def read_header(path):
    with open(path, "rb") as f:
        n = struct.unpack("<Q", f.read(8))[0]        # header length, uint64 little-endian
        header = json.loads(f.read(n))               # the JSON; trailing spaces are fine
    meta = header.pop("__metadata__", {})           # string → string only
    return meta, header                             # offsets count from byte 8 + n
```

Over HTTP it takes two range requests — bytes 0–7, then the header — which is how the Hub computes
the parameter counts on its model pages without downloading multi-gigabyte files.

## Every rule is a security rule

The format is short because its authors kept removing features, and each remaining rule closes an
attack:

| Rule | Why |
|---|---|
| Values in `__metadata__` must be strings | no nested JSON for a parser to trip over, no objects to reconstruct |
| The header is capped at 100 MB | a "JSON bomb" cannot exhaust memory before loading starts |
| The buffer must be fully indexed, no holes, no overlaps | no hidden bytes: a file cannot also be a valid ZIP, PDF or pickle (a *polyglot*) |
| Offsets are checked against the file length | a tensor cannot claim bytes that are not there |
| Element types are a closed list | no custom types, so no type-specific decoding code |

<p class="fig-note">The polyglot rule was tightened after the 2023 audit by Trail of Bits, commissioned by Hugging Face, EleutherAI and Stability AI. It found no flaw leading to code execution (<a href="https://huggingface.co/blog/safetensors-security-audit">blog</a>).</p>

One more quiet rule: the writer sorts tensors by element width, widest first, then by name — so an
F32 tensor called `w` lands before a BF16 tensor called `b`. Wider types first keeps every tensor
naturally aligned without padding.

The list of element types is the only part that keeps growing, and its history tracks the hardware:
`F8_E4M3` and `F8_E5M2` arrived in 2023–24 for Hopper's FP8; `F4`, `F6_E2M3`, `F6_E3M2` and the
scale type `F8_E8M0` in June 2025 for the microscaling formats of [section 4.3](/post/whats-in-a-model-file?section=sec-4-3);
AMD's FP8 variants in 2026.

## Big models: shards and an index

Large models are split into shards named `model-00001-of-00004.safetensors`, with a small
`model.safetensors.index.json` whose `weight_map` says which file holds each tensor. The shard size is
a convention, not a limit: transformers wrote 5 GB shards until version 5 (January 2026), which raised
the default to 50 GB because the Hub's new storage backend serves large files efficiently
([migration guide](https://github.com/huggingface/transformers/blob/main/MIGRATION_GUIDE_V5.md)).

## How fast is "fast"?

The documentation's famous benchmark loads GPT-2 **76.6× faster** than PyTorch on CPU and **2.1×** on
GPU ([docs](https://huggingface.co/docs/safetensors/speed)); loading BLOOM onto 8 GPUs went from 10
minutes to 45 seconds. Three caveats, two of them from the README itself:

- *"No format is really zero-copy in ML."* On CPU with the file already in the page cache, mapping
  is truly free; a GPU always needs a copy.
- The comparison was against 2022's default `torch.load`, which read everything eagerly. A zip
  checkpoint loaded with `mmap=True` is now just as lazy ([section 2.1](/post/whats-in-a-model-file?section=sec-2-1)).
- The large wins today are in parallel loading for multi-GPU serving; version 0.9 of the library
  claims a load of one very large model on eight B200s fell from over an hour to 56 seconds.

So the durable advantage is not speed. It is that the file cannot run code and that any language can
parse it: the reader above is the whole job in Python, and the same ten lines port to any language
with a JSON parser.

## What it deliberately leaves out

No graph, no tokenizer, no architecture, and no notion of quantization — its types are plain numbers.
Everything else sits beside the weights in the repository (`config.json`, `tokenizer.json`), and
quantized models are stored by *convention*: a 4-bit GPTQ layer becomes three ordinary tensors named
`qweight` (packed int32), `qzeros` and `scales`, and `config.json` explains how to combine them. Every
quantization library invented its own names ([section 4.3](/post/whats-in-a-model-file?section=sec-4-3)
has the catalogue), which is the format's main open problem. Its 2026 roadmap lists "formalized
support for quantization formats (FP8, GPTQ, AWQ)"
([PyTorch Foundation announcement](https://huggingface.co/blog/safetensors-joins-pytorch-foundation)).

Leaving things out also leaves risks in the repository. The weights cannot run code, but
`trust_remote_code=True` downloads and runs the repository's Python model definition, and converting
a pickle *into* safetensors requires unpickling it first. In 2024, researchers showed that a malicious
pickle submitted to Hugging Face's own conversion service could steal the conversion bot's token
([HiddenLayer](https://www.hiddenlayer.com/research/silent-sabotage)).

## How it won

| Date | Milestone |
|---|---|
| Feb 2022 | First commit, by Nicolas Patry at Hugging Face |
| Nov 2022 | Lands in AUTOMATIC1111's Stable Diffusion UI; the feature request was filed on 14 November, "National Pickle Day" |
| May 2023 | Trail of Bits audit published |
| Jun 2023 | transformers 4.30 prefers it when loading |
| Nov 2023 | transformers 4.35 writes it by default |
| Jan 2026 | transformers 5.0 removes the option to save pickles |
| Apr 2026 | Joins the PyTorch Foundation; the repository moves to `safetensors/safetensors` |

<p class="fig-note">Of 3,101,804 models on the Hub on 28 September 2026, 1,394,555 (45%) carry the safetensors tag, against 249,579 (8%) tagged pytorch. Most of the rest are adapters, GGUF files or other libraries&#8217; formats.</p>

## Verdict

| Use it for | Avoid it for |
|---|---|
| Sharing any model; the default on Hugging Face | Resuming training with optimizer state (store that separately) |
| GPU serving with vLLM, SGLang, TensorRT-LLM, transformers | Running without the model's code: pair it with an engine that knows the architecture |
| Loading in any language, lazily | Quantized models that must be self-describing: the recipe is in `config.json` |
