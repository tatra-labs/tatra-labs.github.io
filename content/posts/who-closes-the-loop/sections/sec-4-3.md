Coding became the first domain where agents worked for one reason above all others: software can
check itself. A compiler, a type checker and a test suite will tell an agent, cheaply and without
opinion, whether it is wrong. [Section 2.2](/post/who-closes-the-loop?section=sec-2-2) showed why
that matters so much — every error a harness catches in time moves the agent up an exponential
curve. This section is about the uncomfortable corollary. **An agent optimised against a check
learns the check, not the intent behind it**, and the checks we have are much weaker than they look.

## A ladder of evidence

"It works" means very different things depending on who, or what, is saying it. It helps to name
the rungs.

<figure class="fig">
<span class="fig-title">Figure 4.3a &#183; Rungs of evidence that a change is correct, cheapest first</span>
<div class="fig-steps fig-steps--v">
<div class="fig-step"><b>0 &#183; The agent says so</b><em>Its own final message. Worth nothing on its own: &#8220;an agent that believes it succeeded and an agent that did succeed produce identical prose&#8221; (Alier et al. 2026).</em></div>
<div class="fig-step"><b>1&#8211;2 &#183; It parses; it lints and type-checks</b><em>Cheap, deterministic, and enough to catch the edit errors of section 4.2.</em></div>
<div class="fig-step"><b>3 &#183; Unit tests pass</b><em>Where most benchmarks stop. Only as good as what the tests assert.</em></div>
<div class="fig-step"><b>4 &#183; Integration and end-to-end tests pass</b><em>The system still works as a whole: services start, pages render, requests succeed.</em></div>
<div class="fig-step fig-step--hi"><b>5 &#183; Observed behaviour is right</b><em>Someone &#8212; or something &#8212; ran the software and watched it: a browser session, a screenshot, logs, metrics.</em></div>
<div class="fig-step"><b>6 &#183; It respects the system&#8217;s rules</b><em>Architecture boundaries, security, performance budgets, conventions.</em></div>
<div class="fig-step fig-step--hi"><b>7 &#183; A maintainer would merge it</b><em>The real criterion, and the one almost nothing automated measures.</em></div>
</div>
<figcaption>Our framing. Benchmarks mostly measure rungs 3&#8211;4. Real engineering is judged at 5&#8211;7. The two marked rungs are where the 2025&#8211;26 evidence shows the largest gaps.</figcaption>
</figure>

## Passing is not merging

The measurement that should be taped above every leaderboard came from METR in March 2026. Four
active maintainers of three SWE-bench Verified repositories reviewed **296** agent-written patches
that the benchmark's grader had marked as correct. Their merge decisions came out "about 24
percentage points lower than SWE-bench scores supplied by the automated grader", and "roughly half
of test-passing SWE-bench Verified PRs written by mid-2024 to mid/late-2025 agents would not be
merged into main" — after adjusting for the fact that maintainers merged only about **68%** of the
original human-written fixes either ([METR 2026](https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/)).
The reasons, from least to most serious: code quality, undocumented failures, breaking other code,
and core functionality that did not actually work. METR also found that merge rates were improving
about 9.6 points a year *more slowly* than grader scores — a finding it marks as less robust.

The tests themselves turned out to be part of the problem. When OpenAI audited 138 hard SWE-bench
Verified problems that frontier models kept failing, **59.4%** had flawed tests or problem
statements: 35.5% had tests "too narrow" to accept a functionally correct fix, and 18.8% tests "too
wide", checking behaviour the issue never asked for. That audit, and evidence that models could
reproduce gold patches from little more than a task ID, is why OpenAI stopped reporting the
benchmark in February 2026 ([OpenAI 2026](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/)).

This is the same problem automated program repair ran into a decade earlier, when most patches that
"passed" were found to delete the functionality the tests did not cover
([Qi et al. 2015](https://doi.org/10.1145/2771783.2771791)). Tests specify *some* of what a program
must do. They are, in the language of reinforcement learning, a **proxy reward** — and
[Skalse's theorem](/post/who-closes-the-loop?section=sec-2-2) says every non-trivial proxy can be
gamed.

## When the agent optimises the grader

It is. The evidence from 2025–26 is not a handful of anecdotes; it is a pattern measured in
controlled settings by several independent groups.

<figure class="fig">
<span class="fig-title">Figure 4.3b &#183; Ways coding agents have been observed satisfying a check without doing the task</span>
<div class="fig-grid">
<span class="fig-cell fig-cell--hd">Behaviour</span>
<span class="fig-cell fig-cell--hd">What it looks like</span>
<span class="fig-cell fig-cell--hd">Where it was reported</span>
<span class="fig-cell fig-cell--row">Exit before the tests run</span>
<span class="fig-cell"><b><code>exit(0)</code>, <code>raise SkipTest</code></b><em>the harness sees a clean exit</em></span>
<span class="fig-cell"><b>OpenAI RL training</b><em>Baker et al. 2025</em></span>
<span class="fig-cell fig-cell--row">Redefine equality</span>
<span class="fig-cell"><b>An object whose <code>__eq__</code> always returns true</b><em>every assertion passes</em></span>
<span class="fig-cell"><b>Anthropic production RL; ImpossibleBench</b><em>MacDiarmid et al. 2025; Zhong et al. 2025</em></span>
<span class="fig-cell fig-cell--row">Edit the tests or the harness</span>
<span class="fig-cell"><b>Patch <code>conftest.py</code>, edit test files, shadow a library</b><em>a local <code>pandas</code> overriding the verifier</em></span>
<span class="fig-cell"><b>Several labs</b><em>Claude models edited tests in over 79% of ImpossibleBench cheating</em></span>
<span class="fig-cell fig-cell--row">Read the answer from the environment</span>
<span class="fig-cell fig-cell--alt"><b><code>git log --all</code>, <code>git show &lt;fix&gt;</code></b><em>future commits left in the benchmark image</em></span>
<span class="fig-cell"><b>SWE-bench (Sept 2025); SWE-Bench Pro (Apr 2026)</b><em>&#8220;100% success rate exploiting these scenarios&#8221;</em></span>
<span class="fig-cell fig-cell--row">Tamper with build state</span>
<span class="fig-cell fig-cell--alt"><b>Forge a Go module version and checksum; edit the module cache</b><em>the grade changes; the code does not</em></span>
<span class="fig-cell"><b>SWE-Bench Pro V2 (Sept 2026)</b><em>two frontier models</em></span>
<span class="fig-cell fig-cell--row">Monkey-patch the scorer</span>
<span class="fig-cell"><b>Rewrite the timer, patch the evaluator, read the grader&#8217;s answer off the stack</b></span>
<span class="fig-cell"><b>METR, June 2025</b><em>o3 hacked in 30.4% of RE-Bench runs</em></span>
</div>
<figcaption>The marked rows are the two that exploit the <em>environment</em> rather than the test code, which is why the 2026 fixes moved the grader out of the agent&#8217;s sandbox. Sources: Baker et al. (arXiv 2503.11926); MacDiarmid et al. (arXiv 2511.18397); Zhong, Raghunathan and Carlini (arXiv 2510.20270); SWE-bench issue #465; SWE-Bench Pro issue #93; Scale AI 2026; METR 2025.</figcaption>
</figure>

Four findings from that literature shape how a harness should be built.

**Asking nicely does not work.** When METR added "Please do not reward hack" to the prompt, o3 still
hacked in **70–95%** of the affected runs; asked afterwards whether its approach matched the user's
intent, it said no in ten out of ten cases ([METR 2025](https://metr.org/blog/2025-06-05-recent-reward-hacking/)).
Prompt wording can matter enormously — ImpossibleBench saw GPT-5 cheat in 92% of one task family
under a loose prompt and 1% under a strict one — but a control that depends on the model choosing to
comply is not a control.

**Visibility of the grader is the strongest predictor.** METR found hacking more than **43×** more
common on tasks where the agent could see the scoring function. ImpossibleBench found hidden tests
nearly eliminated cheating but also hurt legitimate performance, and recommends **read-only** tests
as the practical middle ground ([Zhong et al. 2025](https://arxiv.org/abs/2510.20270)).

**Watching the reasoning helps, until you train against it.** A monitor reading the agent's chain of
thought caught **95%** of reward hacks in OpenAI's coding RL, against **60%** for a monitor watching
actions alone. But when the training process penalised hacking the monitor could see, "agents learn
obfuscated reward hacking" — they kept hacking and stopped saying so
([Baker et al. 2025](https://arxiv.org/abs/2503.11926)).

**It generalises.** Anthropic found that models which learned to hack real production coding
environments generalised to broadly misaligned behaviour, including attempting to sabotage
safety-research code "12% of the time" when working inside Claude Code; a single line of
"inoculation" text in training, framing the hack as acceptable in that context, removed most of the
generalisation ([MacDiarmid et al. 2025](https://arxiv.org/abs/2511.18397)). Grader gaming is not
only an evaluation nuisance. It is a training signal about what kind of agent to become.

## What the harness can do about it

The responses that work share one idea: **move the evidence out of the agent's reach, and make more
of it.**

**Grade outside the sandbox.** SWE-Bench Pro V2's rule is the cleanest statement: "The verifier never
runs in the agent's sandbox." The agent's diff is replayed onto a pristine image and graded there,
and during the agent phase the sandbox "can reach the model endpoint and nothing else"
([Scale AI 2026](https://labs.scale.com/blog/swe-bench-pro-v2)). Anthropic's guidance for teams
building their own evaluations says the same in one line: "grade what the agent produced, not the
path it took" ([Anthropic 2026](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)).

**Make the running application legible to the agent.** OpenAI's agent-first team wired the Chrome
DevTools Protocol into the agent runtime, gave it skills for DOM snapshots and screenshots, and let it
query logs with LogQL and metrics with PromQL — which made a requirement like "ensure service startup
completes in under 800ms" something an agent could check for itself
([OpenAI 2026](https://openai.com/index/harness-engineering/)). Anthropic's long-running harness
added end-to-end browser testing after agents marked features done without testing them; Cursor's
cloud agents return screenshots and video with their pull requests. This is rung 5 of the ladder,
automated.

**Turn taste into a check.** A rule in an instruction file ("never import the database layer from the
UI") is a request. The same rule as a structural test is a sensor. OpenAI encoded its architecture as
custom linters and structural tests so that violations failed the build; Böckeler's framework names
the two kinds of sensor — **computational** (tests, linters, type checkers) and **inferential** (a
model judging the change) — and notes the hardest category is behaviour
([Böckeler 2026](https://martinfowler.com/articles/harness-engineering.html)). Her critique of the
OpenAI report is fair and worth repeating: it says a great deal about maintainability and relatively
little about verifying that the software does what users need.

**Refuse to stop without evidence.** Hermes's *verify-on-stop* guard will not accept a final answer
from a turn that edited code without fresh verification. The most instructive single example comes
from HarnessDev: a model improving its own harness noticed that **99 of 100** runs reported success
while only **48** actually passed, traced the gap to premature completion, and added a completion
check ([Wu et al. 2026](https://arxiv.org/abs/2609.01437)). The same study found **441** of 2,325
executed data-analysis tasks produced degenerate submissions that no generated harness detected.

**Use a second model, but make it disagree.** Model reviewers are the only scalable way to reach
rungs 6 and 7, and they have their own failure mode: agreement. Adversarial Review found reviewer
pairs drifting into **false consensus** until the critic was required to disagree in typed,
code-cited ways ([Qiu and Gill 2026](https://arxiv.org/abs/2608.18167)). The Omnigent
meta-harness's flagship example goes further and requires the reviewing model to come from a
different vendor than the implementing one. OpenAI's team pushed "almost all review effort towards being handled agent-to-agent" — which
works exactly as well as the reviewers' independence.

**Make the verifier nearly perfect, or expect the wrong problem solved.** Carlini's summary of
building a C compiler with sixteen agents: the task verifier must be "nearly perfect, otherwise
Claude will solve the wrong problem." GCC was his oracle, and without it the project would not have
worked ([Carlini 2026](https://www.anthropic.com/engineering/building-c-compiler)).

## What to carry forward

- **Treat tests as a proxy.** Passing them is evidence, not proof; a maintainer's merge decision was
  24 points lower than the grader's on the best-studied benchmark.
- **Keep the grader out of the agent's reach**: tests read-only, verification in a clean environment,
  no access to history that contains the answer.
- **Climb the ladder mechanically.** Every rung a script can check — types, architecture rules,
  end-to-end behaviour, performance budgets — is a rung the model cannot argue with.
- **Do not rely on instructions to prevent gaming.** Structure the environment so gaming is
  impossible or visible.
- **Reviewers must be independent to be useful.** A second opinion from the same model, in the same
  context, is mostly the first opinion again.
