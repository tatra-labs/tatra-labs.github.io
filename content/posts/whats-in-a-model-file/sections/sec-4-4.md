Every quantized file is a slightly different model. How different depends on the scheme, the model
and — most of all — on what you measure. This section is about measuring it honestly, because the
most repeated number on the subject has no source.

## "Q4 keeps 95% of the quality" — of what?

A figure like "Q4_K_M retains 94–96% of FP16 performance" circulates widely and traces back to no
published measurement. The real numbers depend on the yardstick, and the yardsticks disagree by a lot.

<figure class="fig">
<span class="fig-title">Figure 4.4a &#183; Five ways to score the same Q4_K_M file (Llama 3 8B)</span>
<div class="fig-stack">
<div class="fig-layer"><b>Perplexity</b><span><b>+2.8%</b> (6.23 &#8594; 6.41). How surprised the model is by real text, on average. Cheap, and blind to errors that cancel: a model can grow more confident on some tokens and less on others and keep the same average.</span></div>
<div class="fig-layer fig-layer--hi"><b>KL divergence</b><span><b>0.031</b> nats per token. How far the quantized model&#8217;s whole next-token distribution moves from the original&#8217;s, token by token. Nothing cancels; this is the metric the llama.cpp and Unsloth teams now report.</span></div>
<div class="fig-layer"><b>Same top token</b><span><b>91.9%</b>. How often the single most likely next token is unchanged. This is roughly where the &#8220;94&#8211;96%&#8221; figure could come from.</span></div>
<div class="fig-layer"><b>Flips</b><span>How many benchmark answers change from right to wrong or back. Can be several percent even when accuracy is unchanged (below).</span></div>
<div class="fig-layer"><b>Task accuracy</b><span>Usually <b>97&#8211;100%</b> of the original for good 4-bit schemes on standard benchmarks. The friendliest number, and the least sensitive.</span></div>
</div>
<figcaption>Perplexity, KL divergence and top-token agreement from llama.cpp&#8217;s <a href="https://github.com/ggml-org/llama.cpp/blob/master/tools/perplexity/README.md">Llama 3 8B scoreboard</a>; accuracy range from the studies below.</figcaption>
</figure>

The fourth row deserves attention. Microsoft researchers compared quantized and original models
answer by answer and found that accuracy differences of 2% or less concealed **5% to 13.6%** of
individual answers changing — right to wrong and wrong to right in nearly equal numbers
([Dutta et al. 2024](https://arxiv.org/abs/2407.09141)). They proposed KL divergence and flips as the
numbers to report, and showed the two agree (a rank correlation of 0.98 on MMLU). If you depend on a
model answering *your* questions the way it did before, accuracy is the wrong thing to check.

## Better models are harder to squeeze

One of the most consistent findings is that the same scheme damages a better-trained model more.
Llama 3 8B was trained on seven times more data than Llama 2 7B, and it packs more into each weight:

<figure class="fig">
<span class="fig-title">Figure 4.4b &#183; How often quantization changes the top token: Llama 2 7B against Llama 3 8B</span>
<div class="fig-panel">
<span class="fig-sub">Percentage of tokens whose most likely prediction changes after quantization</span>
<div class="fig-row fig-row--bar"><span class="fig-name">Q8_0 &#183; Llama 2</span><span class="fig-track"><i class="fig-bar" style="width:4.0%"></i><i class="fig-blab" style="left:4.0%">1.2%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Q8_0 &#183; Llama 3</span><span class="fig-track"><i class="fig-bar" style="width:8.1%"></i><i class="fig-blab" style="left:8.1%">2.3%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Q6_K &#183; Llama 2</span><span class="fig-track"><i class="fig-bar" style="width:8.6%"></i><i class="fig-blab" style="left:8.6%">2.5%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Q6_K &#183; Llama 3</span><span class="fig-track"><i class="fig-bar" style="width:13.8%"></i><i class="fig-blab" style="left:13.8%">4.0%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Q4_K_M &#183; Llama 2</span><span class="fig-track"><i class="fig-bar" style="width:18.5%"></i><i class="fig-blab" style="left:18.5%">5.3%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Q4_K_M &#183; Llama 3</span><span class="fig-track"><i class="fig-bar" style="width:28.1%"></i><i class="fig-blab" style="left:28.1%">8.1%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Q2_K &#183; Llama 2</span><span class="fig-track"><i class="fig-bar" style="width:50.0%"></i><i class="fig-blab" style="left:50.0%">14.4%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Q2_K &#183; Llama 3</span><span class="fig-track"><i class="fig-bar" style="width:100%"></i><i class="fig-blab" style="left:66%">28.9%</i></span><span class="fig-val">&#160;</span></div>
</div>
<figcaption>100% minus the &#8220;same top token&#8221; rate, from llama.cpp&#8217;s Llama 2 vs. Llama 3 comparison on Wikitext. At every size, the newer model loses about twice as much.</figcaption>
</figure>

The practical consequence is that quantization advice ages. Rules of thumb formed on 2023 models —
"Q4 is basically lossless" — were measured on models that had more slack in their weights than
today's.

## What the large studies found

The broadest measurement is Red Hat's "Give Me BF16 or Give Me Death?", more than 500,000 evaluations
across the Llama 3.1 family ([Kurtic et al.](https://arxiv.org/abs/2411.02355)):

| Scheme | 8B | 70B | 405B | Verdict in the paper |
|---|---|---|---|---|
| FP8 weights and activations | 101.2% | 100.0% | 99.9% | "effectively lossless across all model scales" |
| INT8 weights and activations | 101.5% | 97.3% | 98.3% | "surprisingly low (1-3%) accuracy degradation" |
| INT4 weights (GPTQ, W4A16) | 96.1% | 97.4% | 98.9% | "more competitive than expected" |

<p class="fig-note">Average recovery of the BF16 score on the harder Open LLM Leaderboard v2 tasks (Table 3). On the easier v1 tasks, INT4 recovers 98.7&#8211;99.98%.</p>

Community measurements on GGUF agree. Unsloth's MMLU runs on Gemma 3 27B put Q4_K_M at 71.23
against 71.5 for BF16, and Google's own quantization-aware Q4_0 release at 70.64 in a much smaller file
([Unsloth](https://unsloth.ai/docs/basics/dynamic-3.0-ggufs)). Four bits, done well, costs about one
percent on benchmarks. The trouble is in the places benchmarks do not look.

## Where it hurts more

- **Long reasoning.** A Huawei–Tsinghua study found 4-bit weight-only quantization cost reasoning
  models 0.4–2.1 points but 3-bit cost 3–7, with harder problems degrading up to four times more
  ([Liu et al. 2025](https://arxiv.org/abs/2504.04823)). A Meta FAIR paper explains part of it: at 3
  bits, reasoning models often reach the right answer mid-thought and then keep going — "they fail
  because they cannot stop thinking". In up to 52% of a 3-bit model's failures the correct answer had
  already appeared, and one 1.5B model's chains of thought grew from 5.2 thousand to 23.4 thousand
  tokens ([Lotfi et al. 2026](https://arxiv.org/abs/2606.00206)). Mild 4-bit quantization, the same
  paper notes, leaves chain length close to the original.
- **Long inputs.** On tasks with more than 64,000 tokens of input, 4-bit methods lost up to 59% in one
  study, with large differences between methods and models ([Mekala et al. 2025](https://arxiv.org/abs/2505.20276)).
  GPTQ at 4 bits on Llama 3.1 8B barely moved on the RULER long-context benchmark (81.1 against 82.8)
  in Red Hat's runs, so this one is worth testing rather than assuming.
- **Small models and small fine-tunes.** The fewer the parameters, the less redundancy to absorb
  rounding. And rounding can erase deliberate edits smaller than one quantization step: models taught
  to forget material retained 21% of it at full precision and 83% after 4-bit quantization
  ([Zhang et al., ICLR 2025](https://arxiv.org/abs/2410.16454)). A safety or unlearning fine-tune made
  of tiny weight changes may simply not survive into the quantized file.
- **Exact matching.** There is even a theorem in the neighbourhood: for every precision *p* there is
  an equality-like function a one-layer Transformer can compute with *p* bits of arithmetic but not
  with *p* − 1 ([Chakrabarti, Pitassi and Alman 2026](https://arxiv.org/abs/2602.02707)). It is a
  constructed separation, not evidence about any real model — but it is a reminder that tasks built on
  exact comparisons are where lost bits show first.

## How to check your own file

The only number that settles it is one measured on your model and your use. A cheap protocol:

1. **KL divergence against the original.** llama.cpp computes it directly: save the 16-bit model's
   logits once with `llama-perplexity --kl-divergence-base`, then score each quantized file against
   them with `--kl-divergence`. Use text that looks like your prompts.
2. **A small task set you care about**, run with greedy decoding on both models; count the flips, not
   just the score.
3. **One long-context and one long-reasoning case** if you use either — the two places where
   averages hide the most.

If the quantized file passes those, it is the model you think it is. If you skip them, the name on the
file is the only evidence you have, and [section 4.2](/post/whats-in-a-model-file?section=sec-4-2)
showed that even the name can mean two different files.
