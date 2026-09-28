Sources are grouped by topic. Figures that describe real files — sizes, tensor tables, layer maps,
operator counts, bits per weight — were produced by reading those files' headers directly from the
Hugging Face Hub with HTTP range requests on 28 September 2026, with the same parsers that run in the
[playground](/post/whats-in-a-model-file?section=sec-6-2). Hub-wide counts (3,101,804 models; 1,394,555
tagged safetensors; 207,141 tagged GGUF) are the Hub's own filter totals on that date.

## Specifications and source code

- GGUF specification, `docs/gguf.md` — [ggml-org/ggml](https://github.com/ggml-org/ggml/blob/master/docs/gguf.md)
- ggml block types, `ggml-common.h` — [llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/ggml/src/ggml-common.h)
- Quantization mixes, `llama-quant.cpp` — [llama.cpp](https://github.com/ggml-org/llama.cpp/blob/master/src/llama-quant.cpp)
- Quantize and perplexity documentation — [quantize README](https://github.com/ggml-org/llama.cpp/blob/master/tools/quantize/README.md), [perplexity README and KLD scoreboard](https://github.com/ggml-org/llama.cpp/blob/master/tools/perplexity/README.md)
- safetensors format and README — [safetensors/safetensors](https://github.com/safetensors/safetensors); [speed benchmarks](https://huggingface.co/docs/safetensors/speed)
- PyTorch serialization container, `inline_container.h` — [pytorch](https://github.com/pytorch/pytorch/blob/main/caffe2/serialize/inline_container.h); restricted unpickler — [`_weights_only_unpickler.py`](https://github.com/pytorch/pytorch/blob/main/torch/_weights_only_unpickler.py)
- PT2 archive format — [PyTorch docs](https://docs.pytorch.org/docs/2.14/user_guide/torch_compiler/export/pt2_archive.html)
- ONNX protocol buffers — [onnx.proto](https://github.com/onnx/onnx/blob/main/onnx/onnx.proto), [Versioning.md](https://github.com/onnx/onnx/blob/main/docs/Versioning.md), [ExternalData.md](https://github.com/onnx/onnx/blob/main/docs/ExternalData.md)
- ExecuTorch `.pte` format — [pte-file-format.md](https://github.com/pytorch/executorch/blob/main/docs/source/pte-file-format.md)
- LiteRT-LM file format — [google-ai-edge/LiteRT-LM](https://github.com/google-ai-edge/LiteRT-LM)
- Ollama name grammar — [`types/model/name.go`](https://github.com/ollama/ollama/blob/main/types/model/name.go)
- Python `pickle` documentation and warning — [docs.python.org](https://docs.python.org/3/library/pickle.html)

## Formats and runtimes: documentation

- TensorRT engine compatibility — [NVIDIA](https://docs.nvidia.com/deeplearning/tensorrt/latest/inference-library/engine-compatibility.html)
- TensorRT-LLM removes the TensorRT backend — [migration guide](https://nvidia.github.io/TensorRT-LLM/legacy/tensorrt-backend-removal.html), [PR #15918](https://github.com/NVIDIA/TensorRT-LLM/pull/15918)
- ONNX Runtime — [execution providers](https://onnxruntime.ai/docs/execution-providers/), [GenAI configuration](https://onnxruntime.ai/docs/genai/reference/config.html); Phi-3 ONNX builds — [model card](https://huggingface.co/microsoft/Phi-3-mini-4k-instruct-onnx)
- TensorFlow SavedModel — [guide](https://www.tensorflow.org/guide/saved_model); security policy — [SECURITY.md](https://github.com/tensorflow/tensorflow/blob/master/SECURITY.md)
- TensorFlow Lite becomes LiteRT — [Google Developers Blog](https://developers.googleblog.com/tensorflow-lite-is-now-litert/)
- Core ML ML Programs — [coremltools](https://apple.github.io/coremltools/docs-guides/source/convert-to-ml-program.html); Llama 3.1 on Core ML — [Apple ML research](https://machinelearning.apple.com/research/core-ml-on-device-llama)
- ExecuTorch 1.0 — [PyTorch blog](https://pytorch.org/blog/introducing-executorch-1-0/)
- MLX quantization — [`mlx.core.quantize`](https://ml-explore.github.io/mlx/build/html/python/_autosummary/mlx.core.quantize.html); [mlx-lm](https://github.com/ml-explore/mlx-lm)
- MLC-LLM quantization codes — [docs](https://llm.mlc.ai/docs/compilation/configure_quantization.html)
- OpenVINO IR with compiled tokenizer — [example repository](https://huggingface.co/OpenVINO/Qwen2.5-7B-Instruct-int4-ov/tree/main)
- Qualcomm AI Hub context binaries — [FAQ](https://workbench.aihub.qualcomm.com/docs/hub/faq.html)
- llamafile — [mozilla-ai/llamafile](https://github.com/mozilla-ai/llamafile)
- Ollama removes its custom engine — [PR #16031](https://github.com/ollama/ollama/pull/16031)
- transformers v5 migration guide — [MIGRATION_GUIDE_V5.md](https://github.com/huggingface/transformers/blob/main/MIGRATION_GUIDE_V5.md)
- Conversion tools — [Optimum ONNX](https://github.com/huggingface/optimum-onnx), [llm-compressor](https://github.com/vllm-project/llm-compressor); Ultralytics engine wrapper — [source](https://github.com/ultralytics/ultralytics/blob/main/ultralytics/utils/export/engine.py)

## History and announcements

- ONNX announced — [Microsoft Azure blog, 2017](https://azure.microsoft.com/en-us/blog/microsoft-and-facebook-create-open-ecosystem-for-ai-model-interoperability/)
- GGML to GGUF — llama.cpp [#252](https://github.com/ggml-org/llama.cpp/pull/252) (GGMF), [#613](https://github.com/ggml-org/llama.cpp/pull/613) (GGJT, mmap), [#647](https://github.com/ggml-org/llama.cpp/issues/647) (the magic-number dispute), [#2398](https://github.com/ggml-org/llama.cpp/pull/2398) (GGUF), [#6135](https://github.com/ggml-org/llama.cpp/pull/6135) (gguf-split)
- K-quants, i-quants and the importance matrix — llama.cpp [#1684](https://github.com/ggml-org/llama.cpp/pull/1684), [#4773](https://github.com/ggml-org/llama.cpp/pull/4773), [#4897](https://github.com/ggml-org/llama.cpp/pull/4897); 1-bit types — [#21273](https://github.com/ggml-org/llama.cpp/pull/21273)
- safetensors in Stable Diffusion WebUI — [PR #4930](https://github.com/AUTOMATIC1111/stable-diffusion-webui/pull/4930); security audit — [Hugging Face blog](https://huggingface.co/blog/safetensors-security-audit); joins the PyTorch Foundation — [Hugging Face blog](https://huggingface.co/blog/safetensors-joins-pytorch-foundation)
- PyTorch `weights_only` — release notes [1.13](https://github.com/pytorch/pytorch/releases/tag/v1.13.0), [2.4](https://github.com/pytorch/pytorch/releases/tag/v2.4.0), [2.6](https://github.com/pytorch/pytorch/releases/tag/v2.6.0); ONNX exporter change — [2.9](https://github.com/pytorch/pytorch/releases/tag/v2.9.0)
- ggml.ai joins Hugging Face — [llama.cpp discussion #19759](https://github.com/ggml-org/llama.cpp/discussions/19759)
- NVIDIA agrees to acquire Hugging Face — [NVIDIA blog](https://blogs.nvidia.com/blog/nvidia-to-acquire-hugging-face/)
- The Hub's move to Xet storage — [Hugging Face blog](https://huggingface.co/blog/migrating-the-hub-to-xet)

## Number formats and natively quantized releases

- Microscaling data formats (MX) — [Rouhani et al. 2023](https://arxiv.org/abs/2310.10537)
- NVFP4 — [NVIDIA technical blog](https://developer.nvidia.com/blog/introducing-nvfp4-for-efficient-and-accurate-low-precision-inference/); pretraining in NVFP4 — [NVIDIA 2025](https://arxiv.org/abs/2509.25149); DeepSeek-R1 in NVFP4 — [model card](https://huggingface.co/nvidia/DeepSeek-R1-0528-FP4)
- DeepSeek-V3 FP8 weights — [model card](https://huggingface.co/deepseek-ai/DeepSeek-V3)
- gpt-oss model card (MXFP4) — [OpenAI 2025](https://arxiv.org/abs/2508.10925)
- Kimi K2 Thinking (native INT4) — [model card](https://huggingface.co/moonshotai/Kimi-K2-Thinking)
- Gemma 3 quantization-aware training — [Google Developers Blog](https://developers.googleblog.com/en/gemma-3-quantized-aware-trained-state-of-the-art-ai-to-consumer-gpus/)
- NVFP4 export holding FP8 — [Model Optimizer #868](https://github.com/NVIDIA/Model-Optimizer/issues/868)

## Quantization methods

- GPTQ — [Frantar et al. 2022](https://arxiv.org/abs/2210.17323)
- AWQ — [Lin et al. 2023](https://arxiv.org/abs/2306.00978)
- LLM.int8() — [Dettmers et al. 2022](https://arxiv.org/abs/2208.07339)
- QLoRA and NF4 — [Dettmers et al. 2023](https://arxiv.org/abs/2305.14314)
- The case for 4-bit precision — [Dettmers and Zettlemoyer 2022](https://arxiv.org/abs/2212.09720)
- Memory accounting for mixed-precision Adam (ZeRO) — [Rajbhandari et al. 2020](https://arxiv.org/abs/1910.02054)
- Unsloth Dynamic GGUFs — [Unsloth docs](https://unsloth.ai/docs/basics/dynamic-3.0-ggufs)

## What quantization costs

- Give Me BF16 or Give Me Death? — [Kurtic et al. 2024](https://arxiv.org/abs/2411.02355)
- Accuracy Is Not All You Need (flips, KL divergence) — [Dutta et al. 2024](https://arxiv.org/abs/2407.09141)
- Quantization Hurts Reasoning? — [Liu et al. 2025](https://arxiv.org/abs/2504.04823)
- Quantized reasoning models and overthinking — [Lotfi et al. 2026](https://arxiv.org/abs/2606.00206)
- Quantization and long context — [Mekala et al. 2025](https://arxiv.org/abs/2505.20276)
- MXFP4 and NVFP4 in practice — [Egiazarian et al. 2025](https://arxiv.org/abs/2509.23202)
- Unlearning undone by quantization — [Zhang et al., ICLR 2025](https://arxiv.org/abs/2410.16454)
- Every bit counts (precision and expressivity) — [Chakrabarti, Pitassi and Alman 2026](https://arxiv.org/abs/2602.02707)
- Why post-training quantization works — [Chen et al. 2026](https://arxiv.org/abs/2609.11716)

## Security

- Malicious models on the Hub (JFrog findings) — [BleepingComputer](https://www.bleepingcomputer.com/news/security/malicious-ai-models-on-hugging-face-backdoor-users-machines/)
- Hijacking the safetensors conversion service — [HiddenLayer](https://www.hiddenlayer.com/research/silent-sabotage)
- Cross-tenant access through a malicious model — [Wiz](https://www.wiz.io/blog/wiz-and-hugging-face-address-risks-to-ai-infrastructure)
- nullifAI broken-pickle evasion — [ReversingLabs](https://www.reversinglabs.com/blog/rl-identifies-malware-ml-model-hosted-on-hugging-face)
- GGUF parser vulnerabilities — [Cisco Talos](https://talosintelligence.com/vulnerability_reports/TALOS-2024-1913)
- Chat-template code execution, CVE-2024-34359 — [GitHub advisory](https://github.com/advisories/GHSA-56xg-wfcc-g829)
- `weights_only` bypass, CVE-2025-32434 — [PyTorch advisory](https://github.com/pytorch/pytorch/security/advisories/GHSA-53q9-r3pm-6pq6)
- Quantization-conditioned attacks on GGUF — [Egashira et al., ICML 2025](https://arxiv.org/abs/2505.23786)
- Pickle prevalence on the Hub (PickleBall) — [Kellas et al. 2025](https://arxiv.org/abs/2508.15987)
- Six months of Hub scanning — [Protect AI](https://huggingface.co/blog/pai-6-month)
- Namespace hijacking — [Legit Security](https://www.legitsecurity.com/blog/tens-of-thousands-of-developers-were-potentially-impacted-by-the-hugging-face-aijacking-attack), [Unit 42](https://unit42.paloaltonetworks.com/model-namespace-reuse/)
- Typosquatted model with an infostealer — [HiddenLayer](https://www.hiddenlayer.com/research/malware-found-in-trending-hugging-face-repository-open-oss-privacy-filter)
- OpenSSF Model Signing 1.0 — [Sigstore blog](https://blog.sigstore.dev/model-transparency-v1.0/)

## Conversion bugs cited in section 5.2

- Llama 3 pre-tokenizer — [#6914](https://github.com/ggml-org/llama.cpp/issues/6914), [#6920](https://github.com/ggml-org/llama.cpp/pull/6920)
- Gemma 2 soft-capping — [#8197](https://github.com/ggml-org/llama.cpp/pull/8197); Llama 3.1 RoPE factors — [#8676](https://github.com/ggml-org/llama.cpp/pull/8676); DeepSeek MLA — [#12801](https://github.com/ggml-org/llama.cpp/pull/12801)
- Qwen3-Next support — [#16095](https://github.com/ggml-org/llama.cpp/pull/16095); Qwen3 chat template — [#13178](https://github.com/ggml-org/llama.cpp/issues/13178); Gemma 3n field type — [#14450](https://github.com/ggml-org/llama.cpp/pull/14450)

## Related reading on this site

- [Where to Spend the Bits](/post/where-to-spend-the-bits) — what the bits inside FP16, BF16, FP8 and FP4 do.
