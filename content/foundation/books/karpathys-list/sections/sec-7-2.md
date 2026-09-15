**Andy Zou, Zifan Wang, Nicholas Carlini, Milad Nasr, J. Zico Kolter & Matt Fredrikson · 2023 · [arXiv:2307.15043](https://arxiv.org/abs/2307.15043)**

The [previous entry](/foundation/book/karpathys-list?section=sec-7-1) explains why hand-written jailbreaks work. This one removes the hand. It shows that adversarial suffixes — strings you append to a request — can be **found by optimisation**, that a single suffix works across many different prompts, and, the result that changed how people think about the problem, that suffixes optimised against models whose weights you can see **transfer to models you cannot.**

Three components, each solving one problem.

**The target.** "Harmful output" has no mathematical definition you could optimise toward. So the objective is something much simpler: maximise the probability that the response *begins* "Sure, here is how to...". Once a model has committed to that opening, its ordinary instinct to continue text plausibly does the rest.

**The search.** Choosing tokens is a discrete problem, so you cannot simply follow a gradient downhill. But gradients still point at which substitutions look promising at each position. Greedy Coordinate Gradient uses them to propose a shortlist of candidate swaps, then tests those candidates properly and keeps the best.

**The universality.** Optimise one suffix against many harmful prompts and several models at once, so it cannot overfit to a single request or a single set of weights.

The resulting strings are not readable. They look like corrupted text — fragments of punctuation, mismatched brackets, stray markup — and carry no meaning a human would recognise as an attack. That is what makes them hard to filter: **there is no phrasing to detect**, and the space of such strings is effectively unbounded.

Suffixes optimised on open models such as Vicuna transferred, at meaningful rates, to ChatGPT, Bard and Claude — none of which the authors could inspect. This is the direct analogue of transferable adversarial examples in image classification, and the analogy carries the field's most sobering precedent: **that problem has been studied since 2013 and remains unsolved.** A decade of defences in vision produced heuristics that raise the attacker's cost and nothing that holds. There is no reason yet to expect a different outcome here.

> Jailbreaking stopped being a creative writing exercise and became an optimisation problem, and optimisation problems do not get harder because you patched last month's solution.

**What did not survive:** the published strings, which were disclosed responsibly and blocked within weeks. That is the least interesting fact about the paper. The **method** regenerates them, at modest cost, against whatever is deployed today — and the open-weight ecosystem that makes transfer attacks possible has grown rather than shrunk since.

The defences that followed are all heuristic and all have known costs. Filtering on how gibberish-like the text is catches these suffixes and misses the fluent adversarial prompts that later work learned to produce. Paraphrasing the input breaks the optimised token sequence and also degrades legitimate prompts. Averaging over randomly perturbed copies of the input raises cost linearly in the number of copies. Adversarial training helps against the attack distribution it was trained on.

None of these is a guarantee, and the paper's framing makes clear why. RLHF and its successors optimise *average-case* behaviour on a distribution of realistic inputs. Nothing in that training procedure says anything at all about the *worst case* over all possible inputs. **Alignment as practised is a distributional property; adversarial robustness is a worst-case one.** Expecting the first to deliver the second was always a category error, and this paper is what made that concrete enough to be uncomfortable.
