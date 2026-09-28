A model file is input from a stranger, parsed by complex software, on a machine that usually holds
credentials. There are five distinct ways it can hurt you, and the formats differ in which of them
they rule out.

## Five ways a model file attacks

<figure class="fig">
<span class="fig-title">Figure 5.3a &#183; What a model file can do to the machine that loads it</span>
<div class="fig-stack">
<div class="fig-layer fig-layer--hi"><b>Run code by design</b><span>The format contains instructions and the loader follows them. Pickle&#8217;s import-and-call; Keras configs naming arbitrary functions; TensorFlow graphs with file and network operations; TorchScript.<span class="fig-tags"><i class="fig-tag">.pt / .bin / .ckpt</i><i class="fig-tag">.keras / .h5</i><i class="fig-tag">SavedModel</i><i class="fig-tag">joblib, dill</i></span></span></div>
<div class="fig-layer"><b>Break the parser</b><span>A malformed length or count overflows a buffer in the C, C++ or Go code reading the header.<span class="fig-tags"><i class="fig-tag">GGUF: many CVEs 2024&#8211;26</i><i class="fig-tag">ONNX: path traversal</i></span></span></div>
<div class="fig-layer"><b>Smuggle a program in metadata</b><span>A field meant as data is executed by a template engine or a custom-op loader.<span class="fig-tags"><i class="fig-tag">GGUF chat templates</i><i class="fig-tag">ONNX custom ops</i></span></span></div>
<div class="fig-layer"><b>Ship code beside the weights</b><span>The weights are clean; the repository&#8217;s <code>modeling_*.py</code> (via <code>trust_remote_code</code>) or a &#8220;loader script&#8221; in the README is not.<span class="fig-tags"><i class="fig-tag">any format</i></span></span></div>
<div class="fig-layer"><b>Behave maliciously</b><span>Nothing executes on load; the model itself has been trained or edited to misbehave on a trigger &#8212; or only after it is quantized.<span class="fig-tags"><i class="fig-tag">any format</i></span></span></div>
</div>
<figcaption>Safetensors and GGUF rule out the first layer by construction. Nothing at the file-format level rules out the last two.</figcaption>
</figure>

## It has happened

<figure class="fig">
<span class="fig-title">Figure 5.3b &#183; Documented incidents and bypasses</span>
<div class="fig-tl">
<div class="fig-tl-row"><i>Feb 2024</i><span><b>About 100 malicious models on the Hub</b> (JFrog), 95% of them PyTorch; one, <code>baller423/goober2</code>, opened a reverse shell to an address on a Korean research network when loaded. <em><a href="https://www.bleepingcomputer.com/news/security/malicious-ai-models-on-hugging-face-backdoor-users-machines/">coverage</a></em></span></div>
<div class="fig-tl-row"><i>Feb 2024</i><span><b>The safety converter as the attack</b> (HiddenLayer): a pickle submitted to Hugging Face&#8217;s own safetensors conversion service could steal the bot&#8217;s token and open pull requests on any repository. <em><a href="https://www.hiddenlayer.com/research/silent-sabotage">post</a></em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>Feb 2024</i><span><b>GGUF parser heap overflows</b>, found independently by Databricks and Cisco Talos: &#8220;A specially crafted .gguf file can lead to code execution.&#8221; <em><a href="https://talosintelligence.com/vulnerability_reports/TALOS-2024-1913">Talos</a></em></span></div>
<div class="fig-tl-row"><i>Apr 2024</i><span><b>One pickle, many tenants</b> (Wiz): a malicious model run through Hugging Face&#8217;s Inference API gave code execution in the service, and from there access to other customers&#8217; models. Fixed with Hugging Face. <em><a href="https://www.wiz.io/blog/wiz-and-hugging-face-address-risks-to-ai-infrastructure">post</a></em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>May 2024</i><span><b>&#8220;Llama Drama&#8221;</b>: llama-cpp-python rendered a GGUF&#8217;s Jinja chat template without a sandbox &#8212; remote code execution from a file with no pickle in it. <em><a href="https://github.com/advisories/GHSA-56xg-wfcc-g829">CVE-2024-34359</a></em></span></div>
<div class="fig-tl-row"><i>Feb 2025</i><span><b>nullifAI</b> (ReversingLabs): deliberately broken pickles whose payload ran before the parse error, so the Hub&#8217;s scanner &#8212; which validated first &#8212; never flagged them. <em><a href="https://www.reversinglabs.com/blog/rl-identifies-malware-ml-model-hosted-on-hugging-face">post</a></em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>2025</i><span><b>Every safety flag bypassed at least once</b>: <code>torch.load(weights_only=True)</code> (CVE-2025-32434), Keras <code>safe_mode</code> four times (CVE-2025-1550, -8747, -9905, -9906), picklescan seven times. <em>Safety flags are software.</em></span></div>
<div class="fig-tl-row"><i>May 2026</i><span><b>A fake OpenAI model reached #1 trending</b> with about 244,000 downloads in under a day. Its weights were irrelevant: the README told users to run a loader script that installed an infostealer. <em><a href="https://www.hiddenlayer.com/research/malware-found-in-trending-hugging-face-repository-open-oss-privacy-filter">HiddenLayer</a></em></span></div>
</div>
<figcaption>JFrog&#8217;s 2025 supply-chain report counted a 6.5-fold increase in malicious models on Hugging Face during 2024. Scanning is a moving target: Protect AI flagged 352,000 unsafe or suspicious issues across 51,700 models in six months (<a href="https://huggingface.co/blog/pai-6-month">report</a>) &#8212; issues, not all of them confirmed attacks.</figcaption>
</figure>

## Benign at 16 bits, malicious at 4

The strangest attack needs no code at all, and it is specific to the subject of this essay. Every
quantized weight corresponds to a small interval of full-precision values that all round to the same
integer. An attacker can train a malicious model, then nudge its full-precision weights back towards
benign behaviour *while keeping every weight inside its rounding interval*. The upload looks clean and
scores well. When a well-meaning third party quantizes it to GGUF, the rounding undoes the nudge.

Researchers at ETH Zürich did exactly this for the K-quant types llama.cpp and Ollama use, on Qwen2.5
and Llama 3.1 models: across nine GGUF types, the gap between the full-precision and quantized
behaviour reached **88.7%** for generating insecure code and **85.0%** for injecting targeted content
— their example made the model recommend McDonald's ([Egashira et al., ICML 2025](https://arxiv.org/abs/2505.23786)).
A signature on the file does not help, since the file is exactly what the attacker published. The
defence they found is almost comically simple: add tiny Gaussian noise (standard deviation about
0.001) to the weights before quantizing, which knocks weights out of their engineered intervals while
barely changing the model.

## What each format rules out

| Format | Code on load, by design | Residual risks |
|---|---|---|
| Pickle (`.pt`, `.bin`, `.ckpt`, joblib) | **Yes** | restricted loaders and scanners, all bypassed at some point |
| Keras `.keras`, `.h5`; TF SavedModel | **Yes** (config imports, lambdas, graph ops) | `safe_mode` bypassed four times in 2025; upgrade to Keras 3.11.3 or later |
| TorchScript | **Yes** (a serialised program) | treat as executable |
| ONNX | No, in the default path | path traversal in external data (fixed); custom-op libraries are native code |
| GGUF | No | parser memory bugs in llama.cpp and Ollama; the Jinja template; quantization-triggered behaviour |
| safetensors | No | the repository's other files; `trust_remote_code`; behaviour |

## A defensive routine

1. **Load only weights-only formats from strangers** — safetensors or GGUF. If a model exists only as
   a pickle, convert it in a disposable sandbox, not on your workstation.
2. **Keep loaders patched.** Most GGUF CVEs are fixed within days; old llama.cpp, Ollama and
   llama-cpp-python builds are the real exposure. PyTorch must be 2.6 or later for the safe default to
   be safe.
3. **Pin what you trust.** Reference repositories by commit hash, and never set `trust_remote_code`
   on a repository whose Python you have not read at that commit. Renamed and deleted organisations
   on the Hub have been re-registered by others ([Legit Security](https://www.legitsecurity.com/blog/tens-of-thousands-of-developers-were-potentially-impacted-by-the-hugging-face-aijacking-attack), [Unit 42](https://unit42.paloaltonetworks.com/model-namespace-reuse/)).
4. **Prefer the original publisher's file, or quantize it yourself** from their full-precision weights
   — and if you quantize a stranger's weights for others, add the noise.
5. **Verify signatures where they exist.** OpenSSF Model Signing 1.0 (April 2025) signs a manifest of
   per-file hashes with Sigstore, and NVIDIA signs its NGC models with it. A signature proves who
   published the files and that they are unchanged — not that the model is benign
   ([Sigstore](https://blog.sigstore.dev/model-transparency-v1.0/)).
6. **Run untrusted models in a sandbox**, as PyTorch's and TensorFlow's own security policies advise.

The playground's inspector includes a harmless pickle that calls `print()`. Open it and you can see
the import-and-call instructions a scanner looks for — the whole attack, in six opcodes, without
anything running ([playground](/post/whats-in-a-model-file?section=sec-6-2)).
