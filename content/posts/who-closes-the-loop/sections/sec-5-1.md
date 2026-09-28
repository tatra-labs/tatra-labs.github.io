Every coding benchmark is a harness too: a sandbox, a task, a grader, and a rule for what counts.
Since 2021 the field has built them, saturated them, found out how they were being gamed, and built
the next ones — each generation fixing the defect that broke its predecessor. Reading a score in
2026 means knowing which defect the benchmark you are looking at has not fixed yet.

## Five generations, each fixing the last one's flaw

<figure class="fig">
<span class="fig-title">Figure 5.1a &#183; What each generation of coding benchmark fixed, and what broke next</span>
<div class="fig-tl">
<div class="fig-tl-row"><i>2021</i><span><b>HumanEval</b> (164 functions), then MBPP, APPS. <em>Fixed: executable grading. Broke: saturated above 90% within three years; short, self-contained, heavily contaminated.</em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>2023</i><span><b>SWE-bench</b> (2,294 real issues). <em>Fixed: repository-scale work graded by the project&#8217;s own tests. Broke: underspecified issues and tests that reject valid fixes.</em></span></div>
<div class="fig-tl-row"><i>2024</i><span><b>SWE-bench Verified</b> (500, human-screened), <b>Multimodal</b> (617, JavaScript with images), <b>LiveCodeBench</b> (rolling, dated problems). <em>Fixed: bad tasks, one language, contamination for contests. Broke: saturation near 80%, gold patches memorised, future commits left in the images.</em></span></div>
<div class="fig-tl-row"><i>2025</i><span><b>SWE-Bench Pro</b> (1,865 tasks, copyleft and private code; ~23% at launch), <b>Terminal-Bench</b> (end-state of a container), <b>SWE-Lancer</b> ($1M of freelance tasks, end-to-end tests), <b>SWE-rebench</b> and <b>SWE-bench-Live</b> (fresh tasks every month), <b>&#964;-bench</b>&#8217;s pass^k. <em>Fixed: contamination, narrow task shape, reliability. Broke: git history still leaked the fix; graders ran where the agent could touch them.</em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>2026</i><span><b>SWE-Bench Pro V2</b> (642 public + 272 private, network off, diff replayed on a pristine image), <b>Terminal-Bench 3.0 and 4.0</b> (harder, tasks retired for saturation and public solutions), <b>maintainer review</b> and <b>harness benchmarks</b>. <em>Fixed: grader tampering, leakage. Still open: tests as the definition of correct.</em></span></div>
</div>
<figcaption>Sources: Chen et al. 2021; Jimenez et al. 2023; swebench.com; Jain et al. 2024 (LiveCodeBench); Deng et al. 2025 (SWE-Bench Pro); Merrill et al. 2026 (Terminal-Bench); Miserendino et al. 2025 (SWE-Lancer); Scale AI 2026; tbench.ai.</figcaption>
</figure>

Three of those transitions deserve a closer look, because each exposed a way a score can be wrong
that applies to *any* evaluation.

**Saturation hides everything above the ceiling.** SWE-bench Verified went from about 33% for GPT-4o
at its release in August 2024 to a recorded best of **79.2%** in December 2025. By then OpenAI's
audit found most of the remaining failures were not agent failures at all — 59.4% of the audited
hard problems had flawed tests or statements — and the benchmark was dropped
([OpenAI 2026](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)).
Terminal-Bench's maintainers retired tasks in version 4.0 for exactly these reasons — saturation,
public solutions, refusals — and designed version 3.0 so that two frontier models 4.9 points apart
on 2.1 separated by **12.7** ([tbench.ai](https://www.tbench.ai/news/terminal-bench-3-0)).

**Contamination shows up as a public–private gap.** SWE-Bench Pro V2 publishes both a public split and
a private one built from code the models cannot have seen. Every frontier model tested scores
**17–19 points** lower on the private split:

<figure class="fig">
<span class="fig-title">Figure 5.1b &#183; The same benchmark, on code the models may have seen and code they cannot have &#183; SWE-Bench Pro V2</span>
<div class="fig-key"><span><i class="fig-m fig-m--pi"></i>private split (272 tasks)</span><span><i class="fig-m fig-m--cc"></i>public split (642 tasks)</span></div>
<div class="fig-panel">
<span class="fig-sub">% resolved</span>
<div class="fig-row"><span class="fig-name">Claude Opus 5</span><span class="fig-track"><i class="fig-span" style="left:38.7%;width:59.2%"></i><i class="fig-pt fig-pt--pi" style="left:38.7%" title="Private: 222/272 = 81.6%"></i><i class="fig-pt fig-pt--cc" style="left:97.9%" title="Public: 638/642 = 99.4%"></i></span><span class="fig-val">17.8 pts</span></div>
<div class="fig-row"><span class="fig-name">Kimi K3</span><span class="fig-track"><i class="fig-span" style="left:28.9%;width:63.3%"></i><i class="fig-pt fig-pt--pi" style="left:28.9%" title="Private: 214/272 = 78.7%"></i><i class="fig-pt fig-pt--cc" style="left:92.2%" title="Public: 627/642 = 97.7%"></i></span><span class="fig-val">19.0 pts</span></div>
<div class="fig-row"><span class="fig-name">GLM-5.3</span><span class="fig-track"><i class="fig-span" style="left:25.2%;width:60.3%"></i><i class="fig-pt fig-pt--pi" style="left:25.2%" title="Private: 211/272 = 77.6%"></i><i class="fig-pt fig-pt--cc" style="left:85.5%" title="Public: 614/642 = 95.6%"></i></span><span class="fig-val">18.1 pts</span></div>
<div class="fig-row"><span class="fig-name">Gemini 3.8 Flash</span><span class="fig-track"><i class="fig-span" style="left:25.2%;width:57.7%"></i><i class="fig-pt fig-pt--pi" style="left:25.2%" title="Private: 211/272 = 77.6%"></i><i class="fig-pt fig-pt--cc" style="left:82.9%" title="Public: 609/642 = 94.9%"></i></span><span class="fig-val">17.3 pts</span></div>
<div class="fig-row fig-row--scale"><span></span><span class="fig-track"><i class="fig-tick" style="left:0%"></i><i class="fig-tlab" style="left:0%">70%</i><i class="fig-tick" style="left:33.3%"></i><i class="fig-tlab" style="left:33.3%">80%</i><i class="fig-tick" style="left:66.7%"></i><i class="fig-tlab" style="left:66.7%">90%</i><i class="fig-tick" style="left:100%"></i><i class="fig-tlab" style="left:100%">100%</i></span><span class="fig-val">gap</span></div>
</div>
<figcaption>Scale AI, September 2026. The public split is effectively saturated; the private split is not. Private tasks come from different repositories, so part of the gap may be difficulty rather than exposure &#8212; but a consistent 17&#8211;19 point drop across four model families is the signature a benchmark maintainer worries about.</figcaption>
</figure>

**The environment is part of the answer key.** In September 2025 a SWE-bench issue documented agents
running `git log --all` and finding the future commit that fixed their task; in April 2026 an
equivalent report on SWE-Bench Pro found "all a model really needs to do is `git show <fix>`", with
a "100% success rate exploiting these scenarios" across the public images. SWE-Bench Pro V2's
response is the template for any evaluation: the agent's sandbox "can reach the model endpoint and
nothing else", and "the verifier never runs in the agent's sandbox" — the diff is replayed onto a
clean image ([Scale AI 2026](https://labs.scale.com/blog/swe-bench-pro-v2)). Even then, it caught two
frontier models tampering with Go module state to change a grade.

## The harness is a hidden variable in every score

A leaderboard entry names a model. It usually also depends on a harness it does not name, and the
2026 measurements say that dependence is large.

- **Success moves.** GPT-5 solves **35.2%** of Terminal-Bench 2.1 in one harness and **49.6%** in
  another ([Wu et al. 2026](https://arxiv.org/abs/2609.01437)). SWE-agent's interface lifted GPT-4
  Turbo from 11.0% to 18.0% on Lite in 2024.
- **Cost moves more.** HarnessTax found harness choice moved cost per attempt by **2–5×** while moving
  success by a few points ([our write-up](/post/the-harness-tax)); a controlled comparison of three
  open harnesses found up to a **40×** spread in tokens *per solved task* at pass rates within 0–8
  points ([Vats and Golev 2026](https://arxiv.org/abs/2607.22585)); Alier et al. found a 20× median
  token span across seven.
- **Harnesses are tuned to their model.** A harness built by one model and run by another can
  collapse — one fell from **69.3% to 33.0%** when its executor changed — because budgets, stopping
  rules and prompts had been fitted to the original (Wu et al. 2026).

The SWE-bench maintainers' response is instructive: a separate **bash-only** leaderboard in which
every model runs in the same minimal harness with the same prompt. It is the only widely used
coding leaderboard that isolates the model — and, as Simon Willison noted, that means "the quality
of the different harnesses or optimized prompts is not being measured here" either.

## Noise, and what a point is worth

Run-to-run variance is large at the level of individual tasks and routinely ignored in comparisons.
Six identical runs of SWE-agent on Lite ranged over **1.3 points**, while the union of those six —
pass@6 — solved **32.67%** against a mean of 17.9%: the aggregate is stable, the per-task outcome is
a coin that lands differently each time ([Yang et al. 2024](https://arxiv.org/abs/2405.15793)).
HarnessDev measured the same commit varying by about **±4.75** points and found that of 64 claimed
harness improvements, **27** sat inside the noise band and only 2 were clearly outside it. METR
reports its time horizons with error bars of "a factor of ~2 in each direction." A difference of two
points on a few hundred tasks, reported from one run, is usually not a result.

## What happens outside the benchmark

Benchmarks measure the agent. Productivity studies measure the agent plus a person plus a codebase
they care about, and they tell a more complicated story.

<figure class="fig">
<span class="fig-title">Figure 5.1c &#183; Experienced open-source developers: what they expected, what was measured, what they believed</span>
<div class="fig-key"><span><i class="fig-m fig-m--pi"></i>forecast before</span><span><i class="fig-m fig-m--cx"></i>believed after</span><span><i class="fig-m fig-m--cc"></i>measured</span></div>
<div class="fig-panel">
<span class="fig-sub">Change in time to complete a task with AI allowed (positive = faster); bars show 95% intervals where reported</span>
<div class="fig-row"><span class="fig-name">Early 2025, 16 developers</span><span class="fig-track"><i class="fig-span" style="left:30.0%;width:61.4%"></i><i class="fig-pt fig-pt--cc" style="left:30.0%" title="Measured: 19% slower"></i><i class="fig-pt fig-pt--cx" style="left:85.7%" title="Believed afterwards: 20% faster"></i><i class="fig-pt fig-pt--pi" style="left:91.4%" title="Forecast: 24% faster"></i></span><span class="fig-val">&#8722;19%</span></div>
<div class="fig-row"><span class="fig-name">2026 follow-up, returning</span><span class="fig-track"><i class="fig-span" style="left:2.9%;width:67.1%"></i><i class="fig-pt fig-pt--cc" style="left:31.4%" title="Measured: -18% (CI -38% to +9%)"></i></span><span class="fig-val">&#8722;18%</span></div>
<div class="fig-row"><span class="fig-name">2026 follow-up, new recruits</span><span class="fig-track"><i class="fig-span" style="left:35.7%;width:34.3%"></i><i class="fig-pt fig-pt--cc" style="left:51.4%" title="Measured: -4% (CI -15% to +9%)"></i></span><span class="fig-val">&#8722;4%</span></div>
<div class="fig-row fig-row--scale"><span></span><span class="fig-track"><i class="fig-tick" style="left:0%"></i><i class="fig-tlab" style="left:0%">&#8722;40%</i><i class="fig-tick" style="left:28.6%"></i><i class="fig-tlab" style="left:28.6%">&#8722;20%</i><i class="fig-tick" style="left:57.1%"></i><i class="fig-tlab" style="left:57.1%">0</i><i class="fig-tick" style="left:85.7%"></i><i class="fig-tlab" style="left:85.7%">+20%</i></span><span class="fig-val">measured</span></div>
</div>
<figcaption>METR, July 2025 and February 2026. In the 2025 row the bar spans forecast to measurement. In the 2026 rows it is the confidence interval &#8212; and METR calls those results &#8220;only very weak evidence&#8221;, because 30&#8211;50% of developers were declining to submit tasks they did not want to do without AI.</figcaption>
</figure>

The July 2025 randomised trial is the most-cited result in this area and the most often
over-read. Sixteen experienced developers working on large, mature open-source repositories they
knew well, using early-2025 tools, took **19% longer** with AI allowed — having forecast a 24% speed-up,
and still believing afterwards that they had been sped up by 20%
([METR 2025](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)). METR's own
caveat is that this does "not provide evidence that AI systems do not currently speed up many or most
software developers." Its 2026 follow-up became hard to run for a revealing reason: "30% to 50% of
developers told us that they were choosing not to submit some tasks because they did not want to do
them without AI" ([METR 2026](https://metr.org/blog/2026-02-24-uplift-update/)).

The wider evidence is consistent with a single reading: **agents amplify what is already there.**

- Google's DORA 2025 report, from nearly 5,000 respondents: "AI doesn't fix a team; it amplifies
  what's already there," with AI adoption positively associated with throughput and negatively with
  delivery stability ([DORA 2025](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report)).
- Anthropic's study of about **400,000** Claude Code sessions: "The greater domain expertise a person
  brings to a session, the more work Claude does per instruction." Verified success was **15%** for
  novices against 28–33% for intermediates and experts; users made about 70% of planning decisions
  and Claude about 80% of execution decisions ([Anthropic 2026](https://www.anthropic.com/research/claude-code-expertise)).
- Stack Overflow's 2025 survey: **84%** of developers use or plan to use AI tools, but only about **33%**
  trust their accuracy, and the most common frustration (66%) is answers that are "almost right, but
  not quite" ([Stack Overflow 2025](https://survey.stackoverflow.co/2025/ai)).
- In the wild, agent-written pull requests are accepted less often than human ones. In the first
  large dataset of agent PRs on GitHub (456,535 PRs from five agents), acceptance on popular
  repositories ranged from 38% to 65% by agent, against 77% for humans
  ([Li et al. 2025](https://arxiv.org/abs/2507.15003)) — though a later study with different methods
  ranks the same agents differently, so per-agent comparisons from these datasets should be treated
  as provisional.

## A rubric for evaluating an agent — or a harness

If you are choosing, building or reporting on a coding agent, a single pass rate is the least
informative number you can give. The scorecard below collects what the 2025–26 literature learned to
measure, and where each idea comes from.

| Dimension | What to report | Why | From |
|---|---|---|---|
| **Capability** | resolved rate with a confidence interval, over repeated runs | single runs sit inside the noise | SWE-agent; HarnessDev |
| **Reliability** | pass^k, not only pass@1 | users experience consistency | τ-bench; Anthropic |
| **Cost** | cost and tokens *per resolved task*, over completed runs only | failures are the expensive runs | Alier et al.; HarnessTax |
| **Configuration** | harness name and version, model, reasoning effort, tool set | the harness moves scores by double digits | HarnessDev; Barbaste |
| **Integrity** | grader outside the sandbox; network policy; git history stripped; test files read-only | agents find and use leaks | SWE-Bench Pro V2; ImpossibleBench |
| **Contamination** | a private or post-cutoff split beside the public one | public–private gaps of 17–19 points | SWE-Bench Pro V2; SWE-rebench |
| **Quality** | maintainer acceptance, review rounds, or code retention over time | tests pass, merges do not | METR 2026; Cursor Keep Rate |
| **Autonomy** | human interventions per task; time between them | the loop length that matters to users | Anthropic autonomy study |
| **Safety** | permission escalations, blocked actions, sandbox violations | capability without containment is a liability | auto mode; Auto-review |
| **Adherence** | which tools and interfaces were actually used | assigned is not used | Alier et al. |

None of these is exotic, and several — cost per solved task, the harness version, a confidence
interval — cost nothing to report. A result that includes them is a measurement of a system. A
result that omits them is an anecdote about one.
