The usual history of AI coding is a history of models: each generation writes better code than
the last. That history is true and not very useful. A more useful one tracks a different quantity:
**who closes the feedback loop** — who looks at the result of an action and decides what to do
next. For fifty years the answer was a person. This section covers the long stretch in which that
stayed true, and the three ideas that had to exist before it could stop being true.

## The inheritance: generate, check, repeat

Automating programming is older than machine learning. Deductive program synthesis in the 1970s
tried to derive programs from formal specifications; programming-by-example systems such as
Gulwani's FlashFill (2011), which shipped in Excel, synthesised small programs from input–output
examples. The field of **automated program repair** got closest to today's agents.
[GenProg](https://doi.org/10.1109/TSE.2011.104) (Le Goues, Nguyen, Forrest and Weimer, 2012)
repaired real bugs in C programs by mutating code and keeping the variants that passed the test
suite.

The mechanism in that line of work is the one that survives: **propose a change, execute it
against an objective check, keep what passes, try again.** It also discovered, a decade early, the
problem that haunts agents now. A repair that passes the tests is not necessarily a correct
repair. When Qi, Long, Achour and Rinard re-examined the reported patches of three such systems,
they found "the overwhelming majority" were not correct and were equivalent to "a single
modification that simply deletes functionality"
([Qi et al., ISSTA 2015](https://doi.org/10.1145/2771783.2771791)) — the tests did not cover
what had been removed. What was missing was a proposal mechanism good enough to make the loop worth running
on real code. Large language models supplied it.

## 2021: the model proposes, the human closes the loop

OpenAI's Codex paper ([Chen et al., July 2021](https://arxiv.org/abs/2107.03374)) is the practical
starting point. It introduced **HumanEval** — 164 hand-written Python problems, each checked by
unit tests averaging 7.7 per problem — and the **pass@k** metric that still dominates code
evaluation. The 12-billion-parameter Codex solved **28.8%** of problems in one attempt, where GPT-3
solved none. Given 100 attempts per problem, it solved **70.2%**. The authors drew the conclusion
the whole field would spend five years exploiting: "repeated sampling from the model is a
surprisingly effective strategy."

The paper also notes that "a distinct production version of Codex powers GitHub Copilot", announced
on **29 June 2021** as "your AI pair programmer" and generally available a year later. Copilot's
interaction was simple: the developer types, the model predicts the next lines, the developer
accepts or rejects. A controlled experiment found developers with Copilot finished a small
JavaScript task **55.8% faster** ([Peng et al. 2023](https://arxiv.org/abs/2302.06590)). A security
study found about **40%** of its completions in security-relevant scenarios were vulnerable
([Pearce et al. 2021](https://arxiv.org/abs/2108.09293)).

In the language of [chapter 2](/post/who-closes-the-loop?section=sec-2-1), the model was a policy
with a loop length of one. It never saw whether its suggestion compiled, never chose which file to
look at, never ran a test. **The human was the harness.**

## 2022: let the environment choose

DeepMind's AlphaCode ([Li et al. 2022](https://arxiv.org/abs/2203.07814); *Science*, December 2022)
did something different with the same kind of model. Instead of asking for one good program, it
generated **up to a million** candidate programs per competitive-programming problem, ran them on the
problem's example tests — a filter that "removes approximately 99% of model samples" — and
clustered the survivors by behaviour so that at most ten distinct submissions were made. In
simulated Codeforces contests it ranked, on average, in the top **54.3%**: "roughly at the level of
the median competitor." A year later, AlphaCode 2 reached about the **85th percentile** and needed
roughly 100 samples to match what the original did with a million — "over 10000× more sample
efficient" ([DeepMind 2023](https://storage.googleapis.com/deepmind-media/AlphaCode2/AlphaCode2_Tech_Report.pdf)).

AlphaCode is not an agent; it never looks at the result of one attempt before making the next. But
it established the principle that later became test-time compute: **a model does not need to be
right the first time if you can cheaply generate, execute and select.** For the first time, part of
the loop — the *check* — was closed by software rather than by a person.

<figure class="fig">
<span class="fig-title">Figure 1.1 &#183; The ideas that had to exist before an agent could close its own loop</span>
<div class="fig-tl">
<span class="fig-tl-era">Generate and check</span>
<div class="fig-tl-row"><i>2011&#8211;12</i><span><b>Program synthesis and repair</b> &#8212; FlashFill; GenProg repairs C bugs by mutation and test-based selection. <em>The generate&#8211;validate loop, with a weak generator.</em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>Jul 2021</i><span><b>Codex and HumanEval</b> &#8212; 28.8% in one try, 70.2% with 100 tries; the pass@k metric. <em>A strong generator, with no loop around it.</em></span></div>
<div class="fig-tl-row"><i>Jun 2021</i><span><b>GitHub Copilot preview</b> &#8212; completion in the editor. <em>The human accepts or rejects every suggestion.</em></span></div>
<div class="fig-tl-row"><i>Feb 2022</i><span><b>AlphaCode</b> &#8212; a million samples per problem, filtered by tests, clustered to ten. <em>Software closes the check, not yet the loop.</em></span></div>
<span class="fig-tl-era">Reason and act</span>
<div class="fig-tl-row fig-tl-row--hi"><i>Oct 2022</i><span><b>ReAct</b> &#8212; interleave a thought, an action and an observation. <em>The skeleton of every harness loop since.</em></span></div>
<div class="fig-tl-row"><i>Feb 2023</i><span><b>Toolformer</b> &#8212; a 6.7B model teaches itself when to call APIs. <em>Tool use as a learned skill.</em></span></div>
<div class="fig-tl-row"><i>Mar 2023</i><span><b>Reflexion</b> &#8212; verbal self-reflection between attempts; 91% on HumanEval. <em>Learning from feedback without changing weights.</em></span></div>
<span class="fig-tl-era">The right problem</span>
<div class="fig-tl-row fig-tl-row--hi"><i>Oct 2023</i><span><b>SWE-bench</b> &#8212; 2,294 real GitHub issues; the best model resolves 1.96%. <em>Code generation stops being the hard part; finding the code becomes it.</em></span></div>
<div class="fig-tl-row"><i>Oct&#8211;Dec 2023</i><span><b>Aider</b> &#8212; a ranked repository map; edit formats measured per model. <em>The first empirical work on what an agent should see and how it should write.</em></span></div>
</div>
<figcaption>Dates are first public release. Sources: Gulwani 2011; Le Goues et al. 2012; Chen et al. 2021; GitHub 2021; Li et al. 2022; Yao et al. 2022; Schick et al. 2023; Shinn et al. 2023; Jimenez et al. 2023; Aider blog.</figcaption>
</figure>

## 2022–23: the model learns to act

Three papers supplied the conceptual pieces of an agent in about five months.

**ReAct** ([Yao et al., October 2022](https://arxiv.org/abs/2210.03629)) proposed interleaving
reasoning with action: a thought, then a tool call, then the tool's observation, then another
thought. Its argument for why that beats reasoning first and acting afterwards is the design
rationale of every harness loop since: "reasoning traces help the model induce, track, and update
action plans as well as handle exceptions, while actions allow it to interface with external
sources." With one or two examples in the prompt, it improved success on the ALFWorld household
tasks by **34 points** absolute over imitation- and RL-trained agents.

**Toolformer** ([Schick et al., February 2023](https://arxiv.org/abs/2302.04761)) showed a model
could learn *when* to call a tool — a calculator, a search engine, a calendar — from its own
self-supervised annotations, and that a 6.7-billion-parameter model doing so could beat much larger
models that did not.

**Reflexion** ([Shinn et al., March 2023](https://arxiv.org/abs/2303.11366)) closed the last gap:
learning from failure without retraining. After a failed attempt, the agent writes a short verbal
diagnosis into an episodic memory and conditions the next attempt on it. With self-generated unit
tests as its feedback signal, it reported **91%** pass@1 on HumanEval against 80% for the GPT-4
baseline it measured. Its ablation matters as much as its headline: self-reflection *without*
tests helped far less. The feedback signal was doing the work.

Reason while acting; use tools; learn from the environment's feedback. Put those together and the
model can, in principle, close its own loop. What was still missing was a problem that required it.

## 2023: the problem changes shape

**SWE-bench** ([Jimenez et al., October 2023](https://arxiv.org/abs/2310.06770); ICLR 2024) supplied
it. Instead of "write this function", it asked a system to resolve **2,294 real GitHub issues** from
12 popular Python repositories, graded by running each project's own tests on the submitted patch.
The results were humbling in a specific way. Given the issue and the files a retriever selected, the
best model, Claude 2, resolved **1.96%**. Given the files the real fix actually touched — an
"oracle" retrieval no real system has — it resolved **4.8%**.

That gap, 1.96% against 4.8%, was the first measurement of what became the field's central
difficulty. The model could often write a plausible fix; it could not find where the fix belonged,
reproduce the failure, run the tests or notice that its first attempt was wrong. Every one of those
is an *action in an environment*, and none of them fits in a single prompt. Solving SWE-bench
required a loop, and a loop required something to run it.

Two lines of practitioner work had already started building that something. Aider's October 2023
**repository map** used tree-sitter to extract the important symbols of a codebase and a
PageRank-style graph ranking to fit the most relevant ones into a token budget
([Aider 2023](https://aider.chat/2023/10/22/repomap.html)). Its December 2023 experiments on edit
formats found that GPT-4 Turbo scored **20%** on a refactoring benchmark when asked to write
search-and-replace blocks and **61%** when asked for unified diffs — "GPT is quantitatively better
at code editing when you reduce the burden of formatting edits"
([Aider 2023](https://aider.chat/2023/12/21/unified-diffs.html)). Neither result is about the
model's intelligence. Both are about what the software around it shows the model and asks it to
produce.

## What had changed by the end of 2023

The pieces were on the table: a generator strong enough to be worth looping, a loop structure
(ReAct), a feedback mechanism (tests, reflections), evidence that interface details moved results
by large margins, and a benchmark that punished anything less than a real loop. What did not yet
exist was the idea that the software running the loop was the thing to engineer. The [next
section](/post/who-closes-the-loop?section=sec-1-2) is the story of that idea — from a 2024 paper
that gave it a name to a 2026 discipline that gave it a job title.
