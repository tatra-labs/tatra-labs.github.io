PyTorch's native format is the one almost every model started in, and the one you should almost never
download. Both facts come from the same design: `torch.save` serialises arbitrary Python objects, and
the way Python serialises arbitrary objects is `pickle`.

## A pickle is a program

Python's documentation puts it in a warning box: *"The `pickle` module is not secure… It is possible to
construct malicious pickle data which will execute arbitrary code during unpickling"*
([docs](https://docs.python.org/3/library/pickle.html)). The reason is structural. A pickle is a
sequence of instructions for a small stack machine, and three of them do the damage: `GLOBAL` and
`STACK_GLOBAL` import any function by name, and `REDUCE` calls it with arguments from the stack.

Any object can declare, through `__reduce__`, "to rebuild me, call this function with these
arguments". Here is the harmless version, disassembled without running it:

```python
import pickle, pickletools

class Greeting:
    def __reduce__(self):
        return (print, ("hello from inside a pickle",))   # "rebuild me by calling print(...)"

pickletools.dis(pickle.dumps(Greeting(), protocol=4))
```

```text
   11: \x8c SHORT_BINUNICODE 'builtins'
   22: \x8c SHORT_BINUNICODE 'print'
   30: \x93 STACK_GLOBAL                       ← import builtins.print
   32: \x8c SHORT_BINUNICODE 'hello from inside a pickle'
   61: \x85 TUPLE1
   63: R    REDUCE                             ← call it
   65: .    STOP
```

`pickle.loads` on those bytes prints the message. Swap `print` for `os.system` and the same six
instructions run a shell command. Two details make it worse than it looks. The instructions execute
as they are read, so a payload at the front of a deliberately corrupted file runs *before* the parser
notices the corruption — the trick that got two malicious models past Hugging Face's scanner in 2025
([ReversingLabs](https://www.reversinglabs.com/blog/rl-identifies-malware-ml-model-hosted-on-hugging-face)).
And nothing distinguishes a checkpoint from a program except what it chooses to import.

## What `torch.save` actually writes

Since PyTorch 1.6 (July 2020), `torch.save` writes a zip archive. The pickle describes the object —
a dictionary of tensors, usually — but the tensor *bytes* go into separate archive entries, one per
storage, uncompressed and aligned to 64 bytes so the file can be memory-mapped
([`inline_container.h`](https://github.com/pytorch/pytorch/blob/main/caffe2/serialize/inline_container.h)).

<figure class="fig">
<span class="fig-title">Figure 2.1a &#183; Inside a PyTorch checkpoint (the zip format, 2020&#8211;)</span>
<div class="fig-bytes">
<div class="fig-byte fig-byte--hd fig-byte--hi" style="--w:2"><b>data.pkl</b>the pickle: a program that rebuilds the dictionary</div>
<div class="fig-byte" style="--w:6"><b>data/0 … data/N</b>one raw byte blob per tensor storage, 64-byte aligned, uncompressed</div>
<div class="fig-byte fig-byte--hd" style="--w:1.4"><b>version, byteorder</b>small text records</div>
<div class="fig-byte fig-byte--hd" style="--w:1.4"><b>zip directory</b>ZIP64, at the end</div>
</div>
<figcaption>The pickle never contains tensor bytes. When it meets a storage it emits a <em>persistent ID</em> &#8212; <code>("storage", FloatStorage, "0", "cpu", 6)</code> &#8212; and the loader fetches <code>data/0</code>. Each tensor is then rebuilt by calling <code>torch._utils._rebuild_tensor_v2</code>.</figcaption>
</figure>

So even a clean checkpoint is a program. GPT-2's `pytorch_model.bin` imports three names —
`collections.OrderedDict`, `torch._utils._rebuild_tensor_v2` and `torch.FloatStorage` — and makes 322
calls to rebuild 160 tensors. You can check this yourself with the inspector in the
[playground](/post/whats-in-a-model-file?section=sec-6-2), which walks the opcodes without executing
them, the way Hugging Face's own scanner does.

That GPT-2 file is also in the *older* format, from before 2020: no zip, just five pickles in a row
followed by raw storages. It announces itself in its first bytes — `80 02 8a 0a 6c fc 9c 46 f9 20 6a
a8 50 19`, which is pickle protocol 2 followed by PyTorch's magic number `0x1950A86A20F9469CFC6C`
written as a Python integer. BERT's original checkpoint is the same. Both still serve millions of
downloads a month, so every loader still has to read them.

## Making the loader safe: `weights_only`

Since the file format cannot be fixed without breaking every checkpoint ever written, PyTorch fixed
the reader instead. `torch.load(weights_only=True)` swaps in a restricted unpickler that resolves only
an allowlist of names — `OrderedDict`, the tensor-rebuilding functions, storage and dtype types — and
refuses everything else ([`_weights_only_unpickler.py`](https://github.com/pytorch/pytorch/blob/main/torch/_weights_only_unpickler.py)).
It took four years to become the default.

| Date | Version | What changed |
|---|---|---|
| Feb 2021 | — | Issue #52181 asks for a safe default |
| Oct 2022 | 1.13 | `weights_only` added, off by default |
| Jul 2024 | 2.4 | a warning when you do not pass it; `add_safe_globals` to extend the allowlist |
| **Jan 2025** | **2.6** | **`weights_only=True` becomes the default** |
| Apr 2025 | — | CVE-2025-32434: in 2.5.1 and earlier, `weights_only=True` itself could be bypassed to run code |

<p class="fig-note">Sources: PyTorch release notes for <a href="https://github.com/pytorch/pytorch/releases/tag/v1.13.0">1.13</a>, <a href="https://github.com/pytorch/pytorch/releases/tag/v2.4.0">2.4</a> and <a href="https://github.com/pytorch/pytorch/releases/tag/v2.6.0">2.6</a>; advisory <a href="https://github.com/pytorch/pytorch/security/advisories/GHSA-53q9-r3pm-6pq6">GHSA-53q9-r3pm-6pq6</a>. NumPy made the same change to <code>np.load</code> in 2019.</p>

The last row is the lesson. The flag everyone was told to use was, for its first two and a half years,
itself exploitable. A restricted pickle loader is a security boundary written in Python against an
instruction set designed for flexibility; a format with no instructions needs no such boundary.

## Loading lazily

The zip layout made one old criticism obsolete. With `torch.load(path, mmap=True)` (PyTorch 2.1 and
later), storages are mapped rather than read, and loading a 1 GiB checkpoint took 4–5 ms with almost
no memory growth in one measurement, against 351 ms and a full gigabyte for the default path — the
same laziness as safetensors. What still separates the formats is safety, and the fact that anything
other than PyTorch can read safetensors in ten lines.

## What the extension tells you (nothing)

PyTorch never checks the extension, so the names are conventions only — and they overlap:

| Extension | Usually means | Watch for |
|---|---|---|
| `.pt`, `.pth` | a state dict or a whole pickled model | a whole model needs its class definitions importable to load |
| `.bin` | Hugging Face's legacy `pytorch_model.bin`, a state dict | may be the pre-2020 format *or* the zip; the name dates from pytorch-pretrained-BERT, 2018 |
| `.ckpt` | a training checkpoint (PyTorch Lightning's convention) | optimizer state, callbacks, and class references from the training code |
| `.tar` | the tutorial's convention for "model plus optimizer" | same as `.ckpt` |
| `.pt2` | a `torch.export` program, not a checkpoint | a zip of a serialised graph, weights and optional compiled kernels ([section 3.3](/post/whats-in-a-model-file?section=sec-3-3)) |

The `.ckpt` row explains a piece of history. Stable Diffusion v1.4's famous `sd-v1-4.ckpt` is a
PyTorch Lightning training checkpoint: its pickle contains the epoch, the global step, Lightning's
version number and a pickled `pytorch_lightning.callbacks.model_checkpoint.ModelCheckpoint` object.
You needed Lightning installed just to open the most popular image model of 2022, and a restricted
loader could not open it at all, because it legitimately imports a class from the training code
([safetensors PR in A1111](https://github.com/AUTOMATIC1111/stable-diffusion-webui/pull/4930)). That
is why the community needed a new format rather than a safer loader.

## Distributed checkpoints

At training scale no single machine holds the whole model, so no single file can either.
`torch.distributed.checkpoint` writes a directory: each rank writes its own shards as
`__{rank}_{n}.distcp` files in parallel, and a `.metadata` file maps every tensor shard to a file,
offset and length. At load time the shards can be redistributed to a different number of GPUs.
Tellingly, that metadata index is itself written with `pickle` — harmless here, because it is read
only by the job that wrote it, which is exactly the setting pickle was designed for.

## Verdict

| Use it for | Avoid it for |
|---|---|
| Checkpoints you write and read yourself, mid-training | Anything you download from someone else |
| Saving arbitrary Python state alongside weights | Sharing weights across frameworks |
| Resuming a run (optimizer, scheduler, RNG) | Serving: convert to safetensors or an inference format |
