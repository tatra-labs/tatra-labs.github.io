At the far right of figure 1.2a the file stops describing a model and starts being one: a graph
compiled to machine code for a specific processor. These *engine* files are the fastest way to run a
model and the least portable thing in this essay, and the industry spent 2026 learning to hide them.

## TensorRT: tuned for one machine

NVIDIA's TensorRT takes a network — usually as ONNX — and builds an *engine* (a `.engine` or `.plan`
file). Building is not translation; it is search. For each layer the builder times candidate kernels,
tile sizes and precisions *on the GPU it is running on*, fuses layers, and keeps the fastest
combination. The result is excellent on that GPU and meaningless on most others. NVIDIA's
documentation spells out three separate ties
([engine compatibility](https://docs.nvidia.com/deeplearning/tensorrt/latest/inference-library/engine-compatibility.html)):

<figure class="fig">
<span class="fig-title">Figure 3.3 &#183; What a TensorRT engine is bound to, by default</span>
<div class="fig-steps">
<div class="fig-step fig-step--hi"><b>One TensorRT version</b><em>&#8220;compatible only with the version of TensorRT used to build them&#8221;; a version-compatible flag relaxes this within a major version.</em></div>
<div class="fig-step fig-step--hi"><b>One GPU type</b><em>&#8220;only compatible with the type of device where they were built&#8221;; the compute capability is recorded and checked. A hardware-compatibility flag trades speed for Ampere-and-later.</em></div>
<div class="fig-step fig-step--hi"><b>One platform</b><em>&#8220;can only be executed on the same platform (operating system and CPU architecture)&#8221;.</em></div>
</div>
<figcaption>Quotations from NVIDIA&#8217;s documentation. An engine is closer to a compiled binary than to a model file: rebuild it for every combination you deploy to.</figcaption>
</figure>

The practical rule follows: **never ship an engine as the artifact.** Ship the checkpoint or the ONNX
file, and build the engine where it will run, keyed by the GPU, driver and library version, as a
cache you can throw away. Even "`.engine`" is not one format: Ultralytics' YOLO exporter writes a
4-byte length and a JSON block *before* the TensorRT bytes, so a bare TensorRT runtime rejects its
files ([source](https://github.com/ultralytics/ultralytics/blob/main/ultralytics/utils/export/engine.py)).

## The builder that deleted itself

TensorRT-LLM, NVIDIA's LLM server, was built around that model for two years: a per-architecture
`convert_checkpoint.py` turned Hugging Face weights into a TensorRT-LLM checkpoint, and `trtllm-build`
compiled engines for a specific GPU and parallelism layout. It then gained a PyTorch backend that
loaded checkpoints directly, and made that the default in version 1.0 (September 2025). In July 2026 it
removed the engine path altogether: `trtllm-build` and the conversion scripts are gone, `tensorrt` is
no longer a dependency, and the migration guide reads "there is no separate checkpoint-conversion or
engine-build step" ([guide](https://nvidia.github.io/TensorRT-LLM/legacy/tensorrt-backend-removal.html),
[PR #15918](https://github.com/NVIDIA/TensorRT-LLM/pull/15918)).

The compilation did not disappear; it moved inside the server. Kernels are chosen, and where needed
tuned, when the server starts, the way a just-in-time compiler works. What the user handles is again a
safetensors checkpoint — often an FP8 or NVFP4 one written by NVIDIA's Model Optimizer, recognisable
by a `hf_quant_config.json` beside the weights. That file is worth checking: in one 2026 bug, an
export labelled `NVFP4` actually held FP8 weights, 6.12 bits per parameter instead of about 4, and
nothing in the format noticed ([ModelOpt #868](https://github.com/NVIDIA/Model-Optimizer/issues/868)).

## The rest of the compiled family

- **AOTInductor** (PyTorch) compiles a `torch.export` program to a shared library and, for CUDA, GPU
  binaries, and packages them into a `.pt2` archive — a zip with the exported graph, the weights and
  the compiled artifacts under `data/aotinductor/`
  ([PT2 archive](https://docs.pytorch.org/docs/2.14/user_guide/torch_compiler/export/pt2_archive.html)).
  One archive can hold builds for several targets.
- **Qualcomm QNN context binaries** are the phone equivalent: a graph prepared offline for one
  Hexagon NPU, with "the fastest load time but [it] requires SoC-specific targeting"; the portable
  alternative, a DLC file, loads more slowly ([AI Hub FAQ](https://workbench.aihub.qualcomm.com/docs/hub/faq.html)).
- **MLC** compiles one kernel library per target — CUDA, Metal, Vulkan, WebAssembly — and keeps the
  weights separate, so the same shards serve every build.

## The lesson of compiled formats

Every compiled format has settled into the same shape: portable weights, plus a disposable binary
derived from them for one machine. The binary is a cache. Treat it like one — never the only copy,
never downloaded from a stranger, always rebuildable — and the least portable format in the ecosystem
causes no trouble at all.
