**Lilian Weng · 2024 · [Lil'Log](https://lilianweng.github.io/posts/2024-07-07-hallucination/)**

The post begins by narrowing the word, which is the first useful thing anyone can do with it. "Hallucination" gets used for two distinct failures with different causes and different fixes.

**In-context hallucination** is output that contradicts material supplied in the prompt — a summary that misstates the document it was handed. **Extrinsic hallucination** is output unsupported by anything the model reliably knows: a fabricated citation, a plausible and non-existent API, a confident biography of someone who does not exist. The post is about the second, and treats it as a problem of factuality and of knowing when to decline, rather than as a mystery.

**On causes, the finding that changed practice is Gekhman et al.'s: fine-tuning a model on facts it does not already know *increases* hallucination.**

The mechanism is straightforward once stated, and worth following because it is counterintuitive. Fine-tuning teaches the model to produce confident answers in the demonstrated format. If the demonstrated answers concern facts that were absent from pretraining, what the model learns is not those facts — it cannot learn them from a handful of examples — but **the behaviour of answering confidently about things it does not know.** The examples generalise as a *style*. This inverts the naive instinct to fix knowledge gaps by adding more fine-tuning data, and it is the single most actionable result in the post.

The evaluation section is the most useful catalogue available. FActScore breaks a generation into individual factual claims and checks each against a source, which is the right granularity — a paragraph is not true or false, its claims are. SAFE has a model issue search queries for each claim and reason over what comes back. SelfCheckGPT needs no external source at all: sample several generations and check them against one another, on the logic that **a fact the model actually knows stays stable across samples while a fabricated one wanders.** That makes inconsistency a cheap proxy for unreliability, which is a genuinely useful thing to have when you have no reference to check against.

Mitigations divide into grounding and calibration. Retrieval-based methods attribute or repair claims after the fact; chain-of-verification has the model draft, then generate questions against its own draft, answer them independently, and revise. The calibration line asks whether models know what they do not know — and finds they partly do. Internal signals correlate with correctness well enough to be usable, **which means the failure is often not ignorance but the absence of any incentive to admit it.**

> A model fine-tuned on facts it never learned does not acquire the facts; it acquires the habit of answering as though it had.

**What has sharpened since.** In 2025 Kalai and colleagues at OpenAI made that incentive argument explicit and formal: **standard benchmarks reward guessing.** Under all-or-nothing scoring, saying "I don't know" scores zero with certainty, while a guess has some chance of scoring one. So a model optimised against such benchmarks is being trained to bluff whenever its confidence is above zero.

On this account hallucination is not primarily a knowledge defect or a decoding artifact. It is the rational strategy under the scoring rule the field chose — and the remedy is therefore at the level of evaluation design: scoring rules that give credit for a well-calibrated abstention, and confidence thresholds stated as part of the task.

That is a satisfying convergence with the rest of this guide. It is the same shape as [reward hacking](/foundation/book/wengs-guide?section=sec-4-1): a measure that does not penalise the failure mode, optimised hard, producing a model that exploits the gap. And it explains why [retrieval](/foundation/book/karpathys-list?section=sec-6-1) reduces hallucination without solving it — grounding supplies evidence, and does nothing at all about a system whose training taught it that an unsupported answer beats no answer.
