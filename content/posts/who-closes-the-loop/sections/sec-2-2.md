Every argument about how far coding agents can go eventually becomes an argument about one
number: the probability that a long chain of steps contains no fatal mistake. This section is
the arithmetic of that chain — why it is so unforgiving, what the best measurements say about
it, and which parts of it a harness can change.

## Small error rates, long chains

Suppose each step of a task goes right with probability $r$, independently, and a single bad step
sinks the task. After $n$ steps the task survives with probability $r^n$. That exponent is merciless:

<figure class="fig">
<span class="fig-title">Figure 2.2a &#183; Chance a task survives <i>n</i> steps, at a fixed per-step reliability</span>
<div class="fig-panel">
<span class="fig-sub">Per-step reliability 99% &#8212; one mistake in a hundred</span>
<div class="fig-row fig-row--bar"><span class="fig-name">10 steps</span><span class="fig-track"><i class="fig-bar" style="width:90.4%" title="0.99^10 = 90.4%"></i><i class="fig-blab" style="left:90.4%">90%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">50 steps</span><span class="fig-track"><i class="fig-bar" style="width:60.5%" title="0.99^50 = 60.5%"></i><i class="fig-blab" style="left:60.5%">61%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">100 steps</span><span class="fig-track"><i class="fig-bar" style="width:36.6%" title="0.99^100 = 36.6%"></i><i class="fig-blab" style="left:36.6%">37%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">300 steps</span><span class="fig-track"><i class="fig-bar" style="width:4.9%" title="0.99^300 = 4.9%"></i><i class="fig-blab" style="left:4.9%">5%</i></span><span class="fig-val">&#160;</span></div>
</div>
<div class="fig-panel">
<span class="fig-sub">Per-step reliability 99.9% &#8212; one mistake in a thousand</span>
<div class="fig-row fig-row--bar"><span class="fig-name">10 steps</span><span class="fig-track"><i class="fig-bar" style="width:99%" title="0.999^10 = 99.0%"></i><i class="fig-blab" style="left:88%">99%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">50 steps</span><span class="fig-track"><i class="fig-bar" style="width:95.1%" title="0.999^50 = 95.1%"></i><i class="fig-blab" style="left:85%">95%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">100 steps</span><span class="fig-track"><i class="fig-bar" style="width:90.5%" title="0.999^100 = 90.5%"></i><i class="fig-blab" style="left:90.5%">90%</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">300 steps</span><span class="fig-track"><i class="fig-bar" style="width:74.1%" title="0.999^300 = 74.1%"></i><i class="fig-blab" style="left:74.1%">74%</i></span><span class="fig-val">&#160;</span></div>
</div>
<figcaption>Illustrative, assuming independent steps and no recovery: $r^n$. A tenfold improvement in per-step error rate turns a coin-flip at a hundred steps into a nine-in-ten. Real agents are not this simple &#8212; they can notice and repair mistakes &#8212; which is exactly the lever discussed below.</figcaption>
</figure>

The toy model already explains two things practitioners see every day. An agent that is
"almost always right" at each action still fails most long tasks. And small improvements in
per-step reliability produce large jumps in how long a task can be before failure becomes likely.

## A half-life for agents

Toby Ord turned this intuition into a model that fits the data surprisingly well
([Ord 2025](https://arxiv.org/abs/2505.05115)). Measure a task's length by how long a skilled
human takes, and suppose an agent has a **constant hazard**: a fixed chance of a fatal error in
every minute of human-equivalent work. Then success decays exponentially, and each agent has a
half-life:

$$
S(t) = e^{-\lambda t} = 2^{-t / T_{50}}, \qquad T_{50} = \frac{\ln 2}{\lambda}
$$

The consequence that matters is how the horizon shrinks when you demand more reliability. The
task length an agent can finish with probability $p$ is a fixed fraction of its 50% horizon:

$$
T_p = \frac{\ln p}{\ln 0.5} \cdot T_{50}
$$

<figure class="fig">
<span class="fig-title">Figure 2.2b &#183; How long a task can be, as the required success rate rises</span>
<div class="fig-panel">
<span class="fig-sub">Task length, as a share of the 50% horizon (constant-hazard model)</span>
<div class="fig-row fig-row--bar"><span class="fig-name">50% success</span><span class="fig-track"><i class="fig-bar" style="width:100%" title="T50"></i><i class="fig-blab" style="left:86%">1</i></span><span class="fig-val">T&#8325;&#8320;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">80% success</span><span class="fig-track"><i class="fig-bar" style="width:32.2%" title="ln0.8/ln0.5 = 0.322"></i><i class="fig-blab" style="left:32.2%">&#8776; 1/3</i></span><span class="fig-val">0.32</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">90% success</span><span class="fig-track"><i class="fig-bar" style="width:15.2%" title="ln0.9/ln0.5 = 0.152"></i><i class="fig-blab" style="left:15.2%">&#8776; 1/7</i></span><span class="fig-val">0.15</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">99% success</span><span class="fig-track"><i class="fig-bar" style="width:1.45%" title="ln0.99/ln0.5 = 0.0145"></i><i class="fig-blab" style="left:1.45%">&#8776; 1/70</i></span><span class="fig-val">0.014</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">99.9% success</span><span class="fig-track"><i class="fig-bar" style="width:0.4%" title="ln0.999/ln0.5 = 0.00144"></i><i class="fig-blab" style="left:0.4%">&#8776; 1/700</i></span><span class="fig-val">0.0014</span></div>
</div>
<figcaption>After Ord 2025. &#8220;Each additional nine&#8221; of reliability divides the usable horizon by about ten. An agent with an eight-hour 50% horizon can be trusted at 99% only on tasks of about seven minutes.</figcaption>
</figure>

Ord notes that METR measured an 80%-to-50% horizon ratio of about **0.25** for Claude 3.7 Sonnet,
close to the model's 0.32. A later fit with a Weibull curve, $S(t) = \exp(-(t/\lambda)^\kappa)$,
found frontier models with $\kappa \approx 0.6$–$0.9$ and humans at about **0.37**
([Hamilton 2026](https://gushamilton.github.io/lab/2026/01/23/petos-paradox-ai-agents/)). A
$\kappa$ below one means the hazard *falls* the longer a task has survived — you get better at a
task once you are deep into it. Humans have much more of that property than agents do. In harness
terms, humans **recover**; agents mostly do not.

## What the measurements say

METR's time-horizon work is the standard measurement
([Kwa et al. 2025](https://arxiv.org/abs/2503.14499)). It fits, for each agent, a logistic curve in
the log of task length:

$$
p_{\text{success}} = \sigma\big( \beta \cdot (\log h - \log t) \big)
$$

where $t$ is the human time a task takes and $h$ is the agent's **50% time horizon**. The
headline is the trend: the horizon "doubled every 207 days" over 2019–2025, about seven months. Its
January 2026 revision measured faster recent growth — a doubling time of **131 days** since 2023
and **89 days** since 2024 ([METR 2026](https://metr.org/blog/2026-1-29-time-horizon-1-1/)). By
February 2026 METR put Claude Opus 4.6 at roughly **14.5 hours**, with a confidence interval of 6 to
98 hours and the warning that the measurement was "extremely noisy because our current task suite
is nearly saturated."

METR's own limitations note is the right companion to those numbers. Error bars are "a factor of
~2 in each direction"; the horizon "is not the length of time AIs can work independently"; and
"reliability-critical and poorly verifiable tasks require 98%+ success probabilities" — which, by
the half-life arithmetic above, means horizons tens of times shorter than the 50% figure
([METR 2026](https://metr.org/notes/2026-01-22-time-horizon-limitations/)).

## Two ways to count success

Benchmarks and users count success differently, and the gap between them is the gap between
**capability** and **reliability**.

The coding literature's standard metric, from the Codex paper
([Chen et al. 2021](https://arxiv.org/abs/2107.03374)), is **pass@k**: the probability that at
least one of $k$ attempts succeeds. With $n$ samples of which $c$ pass, the unbiased estimator is

$$
\text{pass@}k = \mathbb E \left[ 1 - \frac{\binom{n-c}{k}}{\binom{n}{k}} \right]
$$

τ-bench introduced the opposite question ([Yao et al. 2024](https://arxiv.org/abs/2406.12045)):
**pass^k**, the probability that *all* $k$ attempts succeed,

$$
\text{pass}^k = \mathbb E \left[ \frac{\binom{c}{k}}{\binom{n}{k}} \right]
$$

If a single attempt succeeds with probability $p$, these are $1-(1-p)^k$ and $p^k$ — one rises
towards certainty with more tries, the other decays towards zero. Anthropic's evaluation guide gives
the practical example: a **75%** per-trial success rate becomes about **42%** when three trials must
all succeed ([Anthropic 2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).
In τ-bench's retail domain, a strong 2024 agent passed about 61% of tasks once and **under 25%**
eight times in a row.

A developer who runs an agent every day experiences pass^k. A leaderboard reports pass@1, and a
research paper chasing a headline may report pass@k. None of the three is wrong; they answer
different questions, and a claim that does not say which it is answering is not yet a claim.

## Sampling is cheap; choosing is hard

The flip side of pass@k is that if you can **generate many attempts and pick the right one**, you
can buy capability with compute. AlphaCode was the first large demonstration in code, sampling up
to a million programs per problem and filtering them on the example tests
([Li et al. 2022](https://arxiv.org/abs/2203.07814)). *Large Language Monkeys* measured the law for
agents ([Brown et al. 2024](https://arxiv.org/abs/2407.21787)): coverage — the fraction of problems
solved by at least one sample — follows an exponentiated power law, $\log c \approx a k^{b}$, over
four orders of magnitude. On SWE-bench Lite, one open model went from **15.9%** with a single
sample to **56%** with 250.

But coverage assumes an oracle that knows which sample is right. Without one, you must *select*,
and selection is where the gains leak away. The same paper found majority voting and reward-model
ranking "plateau around 100 samples" while coverage kept rising.
[CodeMonkeys](https://arxiv.org/abs/2501.14723) put numbers on the leak for SWE-bench Verified:

<figure class="fig">
<span class="fig-title">Figure 2.2c &#183; What an oracle would get, and what a selector actually got &#183; SWE-bench Verified</span>
<div class="fig-key"><span><i class="fig-m fig-m--cx"></i>random pick</span><span><i class="fig-m fig-m--pi"></i>learned selector</span><span><i class="fig-m fig-m--cc"></i>oracle (coverage)</span></div>
<div class="fig-panel">
<span class="fig-sub">% of tasks resolved</span>
<div class="fig-row"><span class="fig-name">CodeMonkeys</span><span class="fig-track"><i class="fig-span" style="left:21.6%;width:48.0%"></i><i class="fig-pt fig-pt--cx" style="left:21.6%" title="Random choice among candidates: 45.8%"></i><i class="fig-pt fig-pt--pi" style="left:44.8%" title="CodeMonkeys selector: 57.4%"></i><i class="fig-pt fig-pt--cc" style="left:69.6%" title="Oracle coverage: 69.8%"></i></span><span class="fig-val">12.4 pts lost</span></div>
<div class="fig-row"><span class="fig-name">Ensemble of top systems</span><span class="fig-track"><i class="fig-span" style="left:62.4%;width:29.2%"></i><i class="fig-pt fig-pt--pi" style="left:62.4%" title="Ensemble selector: 66.2%"></i><i class="fig-pt fig-pt--cc" style="left:91.6%" title="Ensemble oracle coverage: 80.8%"></i></span><span class="fig-val">14.6 pts lost</span></div>
<div class="fig-row fig-row--scale"><span></span><span class="fig-track"><i class="fig-tick" style="left:0%"></i><i class="fig-tlab" style="left:0%">35%</i><i class="fig-tick" style="left:40%"></i><i class="fig-tlab" style="left:40%">55%</i><i class="fig-tick" style="left:80%"></i><i class="fig-tlab" style="left:80%">75%</i></span><span class="fig-val">oracle &#8722; selected</span></div>
</div>
<figcaption>Ehrlich et al. 2025. The selector recovers about half the distance between random choice and the oracle. The ensemble row combines leading leaderboard submissions; its best single member scored 62.8%. The run cost about $2,300 for the full benchmark.</figcaption>
</figure>

The lesson generalises beyond best-of-$n$. **When generation is cheap, the verifier sets the
ceiling.** Training better verifiers helps — SWE-Gym's agent-plus-verifier reached 32.0% on
Verified ([Pan et al. 2024](https://arxiv.org/abs/2412.21139)) and R2E-Gym's hybrid of
execution-based and execution-free verifiers reached **51%** where either alone reached about 43%
([Jain et al. 2025](https://arxiv.org/abs/2504.07164)) — but the gap between what the agents can
produce and what anyone can reliably recognise as correct persists.

## Where the harness enters the equation

Return to the chain. The naive model assumes a mistake is fatal. A harness can make it survivable
by **detecting** errors and letting the agent **recover** from them. If a harness catches a
fraction $d$ of step errors in time to repair them — a lint check on edit, a test run after every
change, a type checker, a reviewer at the boundary — then the effective per-step reliability
becomes

$$
r_{\text{eff}} = 1 - (1 - r)(1 - d)
$$

With $r = 0.99$, catching half of all mistakes lifts a hundred-step task from **37%** to **61%**;
catching nine in ten lifts it to **90%**. This is an illustrative model, not a measurement, but it
explains why the most effective harness investments of 2025–26 are sensors rather than prompts:
every check that turns a silent error into a visible one moves the agent up a curve that is
exponential in task length.

It also explains the two ways harnesses make things worse. A **flaky** tool is a sensor that
lies — it lowers $r$ and raises false alarms at the same time — which is why Cursor treats "any
unknown error" as "a bug in the harness" and drove tool calls to "2 or often 3 9s of reliability"
([Cursor 2026](https://cursor.com/blog/continually-improving-agent-harness)). And a check the agent
can **satisfy without being right** — a test it can edit, a grader it can read — does not raise $d$
at all. That is the subject of [section 4.3](/post/who-closes-the-loop?section=sec-4-3).

## Two more laws the harness cannot repeal

**Goodhart, formally.** Skalse et al. call a proxy reward *unhackable* if raising the proxy can never
lower the true objective, and prove that over all stochastic policies two rewards are unhackable
only if one of them is constant ([Skalse et al. 2022](https://arxiv.org/abs/2209.13085)). A test
suite is a proxy for "the code does what the user meant." The theorem says there is always, in
principle, a policy that scores better on the tests and worse on the intent. Optimise hard enough
and something will find it.

**Amdahl, applied to people.** If a fraction $H$ of the end-to-end work of shipping software still
needs human judgment — specifying, reviewing, deciding — then even an infinitely fast agent speeds
the whole up by at most

$$
S_{\max} = \frac{1}{H}
$$

a point argued directly for agents by Kyle Mathews
([Electric 2026](https://electric.ax/blog/2026/02/19/amdahls-law-for-ai-agents)). OpenAI's
agent-first team reached the same conclusion from practice: once agents produced code faster than
people could read it, "human attention" became the bottleneck, and they pushed almost all review
"towards being handled agent-to-agent" ([OpenAI 2026](https://openai.com/index/harness-engineering/)).
One vendor's telemetry across more than 10,000 developers shows what happens when review does not
scale: high-adoption teams merged **98%** more pull requests, while review time rose **91%** and
pull-request size **154%** ([Faros AI 2025](https://www.faros.ai/ai-productivity-paradox)).

Put the pieces together and you have the research programme of the whole field. Raise $r$ with
better models. Raise $d$ with better sensors. Keep the verifier ungameable. And shrink $H$ without
losing what the human was there to catch.
