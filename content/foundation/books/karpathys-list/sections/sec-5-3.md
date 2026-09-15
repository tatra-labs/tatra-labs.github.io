**Yao, Yu, Zhao, Shafran, Griffiths, Cao & Narasimhan · 2023 · [arXiv:2305.10601](https://arxiv.org/abs/2305.10601)**

Chain-of-thought is a single path through a problem, written left to right and never revisited. **If the third step is wrong, everything after it elaborates the error**, and the model has no way to notice or to go back. Tree of Thoughts asks what happens if you let it branch, and the paper is explicit about its debt to Newell and Simon's account of problem-solving as search through a space of states.

Four components, each answering a question the previous one raises.

**Thought decomposition** — pick a unit of progress suited to the problem, an equation or a paragraph plan or a candidate word, rather than a single token. You cannot branch usefully at every token; the unit has to be big enough to be worth evaluating.

**A thought generator** — sample or propose several possible next thoughts from wherever you currently are.

**A state evaluator** — ask the model itself to judge how promising each partial state looks, either by scoring them directly or by having it vote among candidates.

**A search algorithm** — walk the resulting tree breadth-first or depth-first, keeping the best few states at each level and pruning the rest.

**The evaluator is the load-bearing piece and the genuinely new one.** [AlphaGo](/foundation/book/karpathys-list?section=sec-5-1) had a value network trained on millions of self-play outcomes to tell it whether a position was good. There is no such thing for text, so Tree of Thoughts substitutes the model's own judgement of a partial solution. That works when partial progress is checkable — in the Game of 24, where you combine four numbers to make `24`, the model can assess reasonably well whether the numbers it has left can still get there.

The headline result is on exactly that task: GPT-4 with chain-of-thought solved `4%` of Game of 24 problems, and with Tree of Thoughts `74%`. On mini crosswords, word-level success rose from around `16%` to `60%`. Those are enormous gaps, and they are honest — this is the clearest demonstration that a single greedy pass leaves a great deal on the table whenever you can tell a bad partial answer from a good one.

> Deliberation needs three things: a unit of progress smaller than the answer, a way to generate several, and a way to tell which is promising — and for text the third has to come from the model itself.

**What did not survive:** the algorithm, quite thoroughly. The cost is the obvious problem — the search issues something like a hundred times the model calls of a single chain to produce one answer, which is defensible for a puzzle and absurd for a product. The self-evaluator is the deeper one. It is the same model, with the same blind spots, asked to grade its own partial work. So on any problem where the model cannot recognise a bad state, the search prunes the right branch and explores the wrong one, confidently. That confines the method to problems with checkable intermediate structure, a much smaller set than the paper's framing suggests — and the evaluation reflects it, since Game of 24 and a set of `20` mini crosswords are narrow tasks chosen because the evaluator happens to work on them.

The reason nobody runs Tree of Thoughts in 2026 is that the behaviour got absorbed. Reinforcement learning on long reasoning traces produced models that branch, evaluate, abandon and restart **inside one linear generation** — read an o-series or R1-style trace and the backtracking is plainly there, expressed as "wait, that's wrong, let me try instead" rather than as a tree in some orchestration layer. That is cheaper, needs no external search harness, and lets the model learn its own evaluator as part of the policy instead of improvising one at inference time. What Tree of Thoughts contributed was the argument that deliberate search over intermediate states is the missing capability. It was right about that, and wrong that the search should live outside the model.
