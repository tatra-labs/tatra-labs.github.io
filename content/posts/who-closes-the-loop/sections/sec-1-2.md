Between the spring of 2024 and the autumn of 2026, the loop moved out of the human's hands in three
steps: first into research scaffolds, then into products developers ran on their own machines, then
into cloud workers that return a pull request. Along the way the field discovered, repeatedly and
somewhat against its own instincts, that the software around the model mattered as much as the
model — and that the best version of that software kept getting *smaller*.

## 2024: the scaffold era

The year opened with a demo. On **12 March 2024**, Cognition announced **Devin**, "the first AI
software engineer", reporting **13.86%** on a random quarter of SWE-bench against a previous best of
1.96% ([Cognition 2024](https://cognition.com/blog/swe-bench-technical-report)). The next day, an
open-source project called OpenDevin — later **OpenHands** — was created on GitHub. Within weeks the
research answers arrived, and they disagreed with each other in instructive ways.

**SWE-agent** (Princeton, April–May 2024) made the case that the interface was the lever. With GPT-4
Turbo held fixed, a purpose-built **agent–computer interface** — windowed file viewer, lint-gated
editor, capped search — resolved **12.47%** of full SWE-bench and **18.0%** of the Lite subset, where
a plain shell managed 11.0% ([Yang et al. 2024](https://arxiv.org/abs/2405.15793)).

**AutoCodeRover** (NUS, April 2024) made the case for program structure: search the abstract syntax
tree by class and method rather than grepping text, and localise faults with test coverage. It
resolved **19%** of Lite at about **$0.43** a task
([Zhang et al. 2024](https://arxiv.org/abs/2404.05427)).

**Agentless** (UIUC, July 2024) made the case against agents altogether. A fixed pipeline —
localise hierarchically, generate repairs, validate them against tests, no loop and no tool choice
— reached **27.33%** on Lite at **$0.34** in its first version and **32.00%** at **$0.70** in its
October revision, then among the best open results
([Xia et al. 2024](https://arxiv.org/abs/2407.01489)). OpenAI used it as "the go-to approach" to
show GPT-4o's coding ability. The lesson is permanent: **autonomy is a cost, not a virtue.** If you
know the right decomposition, encode it.

Then the benchmark itself was repaired. In August 2024, OpenAI and the SWE-bench authors released
**SWE-bench Verified**: 93 experienced developers screened 1,699 tasks, flagging 38.3% for
underspecified problem statements and 61.1% for tests that could reject valid solutions, and
**500** survived ([swebench.com](https://www.swebench.com/)). GPT-4o's best score went from 16% on
the original to 33.2% on Verified — "the original SWE-bench dataset underestimates agent
abilities."

The year's most important result was the least elaborate. In October 2024, Anthropic reported that
the upgraded Claude 3.5 Sonnet resolved **49%** of Verified with a scaffold of exactly **two tools**
— bash and an exact-string-replacement editor — and a design philosophy stated in one line: "give as
much control as possible to the language model itself, and keep the scaffolding minimal"
([Anthropic 2025](https://www.anthropic.com/engineering/swe-bench-sonnet)). Many successful runs
"took hundreds of turns". The model was now good enough to *be* most of the scaffold. In November,
Anthropic released the **Model Context Protocol**; in December, its essay *Building effective
agents* gave the field the workflow-versus-agent vocabulary of
[section 2.1](/post/who-closes-the-loop?section=sec-2-1), and the admission that on SWE-bench "we
actually spent more time optimizing our tools than the overall prompt."

<figure class="fig">
<span class="fig-title">Figure 1.2a &#183; The best score on SWE-bench Verified, as the official leaderboard recorded it</span>
<div class="fig-panel">
<span class="fig-sub">Record submission, % resolved (500 tasks)</span>
<div class="fig-row fig-row--bar"><span class="fig-name">Apr 2024</span><span class="fig-track"><i class="fig-bar" style="width:22.4%" title="SWE-agent + GPT-4: 22.4%"></i><i class="fig-blab" style="left:22.4%">22.4 &#183; SWE-agent</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Jun 2024</span><span class="fig-track"><i class="fig-bar" style="width:37.0%" title="Factory Code Droid: 37.0%"></i><i class="fig-blab" style="left:37.0%">37.0 &#183; Code Droid</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Oct 2024</span><span class="fig-track"><i class="fig-bar" style="width:53.0%" title="OpenHands + Claude 3.5 Sonnet: 53.0%"></i><i class="fig-blab" style="left:53.0%">53.0 &#183; OpenHands</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Jan 2025</span><span class="fig-track"><i class="fig-bar" style="width:64.6%" title="W&amp;B Programmer + o1: 64.6%"></i><i class="fig-blab" style="left:64.6%">64.6</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">May 2025</span><span class="fig-track"><i class="fig-bar" style="width:73.2%" title="Claude 4 Opus: 73.2%"></i><i class="fig-blab" style="left:73.2%">73.2</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Sep 2025</span><span class="fig-track"><i class="fig-bar" style="width:78.8%" title="TRAE + Doubao-Seed-Code: 78.8%"></i><i class="fig-blab" style="left:78.8%">78.8</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Dec 2025</span><span class="fig-track"><i class="fig-bar" style="width:79.2%" title="Sonar Foundation Agent + Claude Opus 4.5: 79.2%"></i><i class="fig-blab" style="left:79.2%">79.2</i></span><span class="fig-val">&#160;</span></div>
</div>
<div class="fig-panel">
<span class="fig-sub">The same benchmark with a fixed ~100-line bash-only harness (mini-SWE-agent)</span>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Jul 2025</span><span class="fig-track"><i class="fig-bar" style="width:64.93%" title="Claude Sonnet 4: 64.93%"></i><i class="fig-blab" style="left:64.93%">64.9 &#183; Sonnet 4</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Nov 2025</span><span class="fig-track"><i class="fig-bar" style="width:74.4%" title="Claude Opus 4.5 (medium): 74.4%"></i><i class="fig-blab" style="left:74.4%">74.4</i></span><span class="fig-val">&#160;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Feb 2026</span><span class="fig-track"><i class="fig-bar" style="width:76.8%" title="Claude Opus 4.5 (high): 76.8%"></i><i class="fig-blab" style="left:76.8%">76.8</i></span><span class="fig-val">&#160;</span></div>
</div>
<figcaption>Top panel: running maximum of submissions in the SWE-bench leaderboard data. Bottom panel: the &#8220;bash only&#8221; leaderboard, where every model runs in the same minimal harness. By late 2025 the gap between an elaborate submission and a hundred-line loop was under five points &#8212; and in February 2026 OpenAI stopped reporting the benchmark, citing flawed tests and contamination (section 5.1).</figcaption>
</figure>

## 2025: the harness becomes a product

In 2025 the scaffold left the research repository and moved onto developers' machines. The
launches came fast enough to list:

<figure class="fig">
<span class="fig-title">Figure 1.2b &#183; Two years in which the loop moved into software</span>
<div class="fig-tl">
<span class="fig-tl-era">2024 &#183; Scaffolds</span>
<div class="fig-tl-row"><i>Mar 2024</i><span><b>Devin</b> demo; <b>OpenDevin</b> (later OpenHands) created the next day.</span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>May 2024</i><span><b>SWE-agent</b> names the agent&#8211;computer interface. <em>Interface design as a measurable lever.</em></span></div>
<div class="fig-tl-row"><i>Jul 2024</i><span><b>Agentless</b>: no loop, competitive results. <em>Autonomy is a cost.</em></span></div>
<div class="fig-tl-row"><i>Aug 2024</i><span><b>SWE-bench Verified</b>: 500 human-screened tasks.</span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>Oct 2024</i><span><b>Claude 3.5 Sonnet, 49% with two tools.</b> <em>The model starts replacing the scaffold.</em></span></div>
<div class="fig-tl-row"><i>Nov 2024</i><span><b>MCP</b> released; Cursor ships an agent that picks its own context and uses the terminal.</span></div>
<span class="fig-tl-era">2025 &#183; Products</span>
<div class="fig-tl-row"><i>Feb 2025</i><span>Karpathy coins <b>&#8220;vibe coding&#8221;</b>; Copilot <b>agent mode</b>; <b>Claude Code</b> research preview.</span></div>
<div class="fig-tl-row"><i>Apr&#8211;May 2025</i><span><b>Codex CLI</b> open-sourced; Cursor <b>background agents</b>; <b>Codex</b> cloud; <b>Copilot coding agent</b>; <b>Claude Code GA</b>.</span></div>
<div class="fig-tl-row"><i>Jun&#8211;Jul 2025</i><span><b>Gemini CLI</b>; <b>Kiro</b>; <b>mini-SWE-agent</b> at 65% with ~100 lines; METR finds experienced developers 19% slower.</span></div>
<div class="fig-tl-row"><i>Aug&#8211;Sep 2025</i><span><b>AGENTS.md</b>; <b>ACP</b>; <b>GPT-5-Codex</b>, &#8220;purpose-built for Codex CLI&#8221;.</span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>Oct&#8211;Dec 2025</i><span><b>Agent Skills</b>; <b>OS sandboxing</b> cuts prompts 84%; Cursor <b>Composer</b> trained inside its own harness; long-running harness patterns; Terminal-Bench 2.0; the <b>Agentic AI Foundation</b>. <em>Claude Code passes a billion dollars of run-rate revenue.</em></span></div>
<span class="fig-tl-era">2026 &#183; Harness engineering</span>
<div class="fig-tl-row fig-tl-row--hi"><i>Feb 2026</i><span>Hashimoto&#8217;s <b>&#8220;engineer the harness&#8221;</b>; OpenAI&#8217;s <b>harness engineering</b> report; a 16-agent team builds a C compiler; OpenAI <b>stops reporting SWE-bench Verified</b>.</span></div>
<div class="fig-tl-row"><i>Mar 2026</i><span>METR: about half of test-passing patches would not be merged; <b>auto mode</b>; the <b>Claude Code source</b> is published by accident.</span></div>
<div class="fig-tl-row"><i>Apr&#8211;Jul 2026</i><span>Source-level studies of Claude Code and eleven harnesses; self-improving harnesses; <b>Antigravity CLI</b> replaces Gemini CLI for consumers; MCP goes stateless.</span></div>
<div class="fig-tl-row"><i>Aug&#8211;Sep 2026</i><span>Auto mode becomes the default; <b>SWE-Bench Pro V2</b> cuts the network and re-grades in pristine images; benchmarks for harnesses themselves appear.</span></div>
</div>
<figcaption>Dates are public release or first report. Sources are cited where each event is discussed in this essay.</figcaption>
</figure>

Three things about this wave matter more than the product names.

**The interaction changed from collaboration to delegation.** Karpathy's February tweet named the
mood — "fully give in to the vibes, embrace exponentials, and forget that the code even exists"
([Karpathy 2025](https://x.com/karpathy/status/1886192184808149383)) — but his June talk named the
design space more usefully: an **autonomy slider** running from tab-completion to full agent, and
the advice to keep AI "on a tight leash" by making verification fast
([Karpathy 2025](https://www.ycombinator.com/library/MW-andrej-karpathy-software-is-changing-again)).
By May, GitHub's agent took an issue, worked in an ephemeral Actions environment and opened a draft
pull request; OpenAI's and Cursor's did the same in cloud containers and VMs. The loop length of
[figure 2.1b](/post/who-closes-the-loop?section=sec-2-1) jumped from tens of steps to hundreds.

**Models started to be trained for a harness.** The environments that had been benchmarks became
training grounds. SWE-Gym (2,438 executable tasks), SWE-smith (50,000 synthesised tasks from 128
repositories, training a 32B model to **40.2%** on Verified) and R2E-Gym turned repositories into
reinforcement-learning environments; DeepSWE trained Qwen3-32B with RL alone to **42.2%**, and
**59%** with test-time selection ([Together 2025](https://www.together.ai/blog/deepswe)). The
frontier labs went further and trained models *inside their own harness*. OpenAI's GPT-5-Codex was
"purpose-built for Codex CLI, the Codex IDE extension, the Codex cloud environment"; Cursor's
Composer was trained by RL in "hundreds of thousands of concurrent sandboxed coding environments",
with the goal of "unification of RL environments with production environments"
([Cursor 2025](https://cursor.com/blog/composer)). From here on, model and harness are no longer
independent variables — a point [section 5.2](/post/who-closes-the-loop?section=sec-5-2) has to
reckon with.

**The best harnesses got simpler.** mini-SWE-agent, a single bash tool and a linear history, reached
**65%** on Verified in July 2025 and **76.8%** by February 2026 — within a few points of the most
elaborate submissions. Its authors' conclusion about their own earlier work: "as LMs have become
more capable, a lot of this is not needed at all." Anthropic's engineers wrote the rule down in March
2026: "Every component in a harness encodes an assumption about what the model can't do on its own,
and those assumptions are worth stress testing, both because they may be incorrect, and because
they can quickly go stale as models improve." Their own example: a context-reset mechanism built
because one model showed "context anxiety" was dropped entirely when the next model "largely removed
that behavior on its own" ([Rajasekaran 2026](https://www.anthropic.com/engineering/harness-design-long-running-apps)).
OpenAI's Hyung Won Chung had put the same idea as a research principle in a Stanford lecture:
"Add structures needed for the given level of compute and data available. Remove them later,
because these shortcuts will bottleneck further improvement"
([Chung 2024](https://www.youtube.com/watch?v=orDKvo8h71o)) — Sutton's
[bitter lesson](http://www.incompleteideas.net/IncIdeas/BitterLesson.html), applied to scaffolding.

## 2026: harness engineering gets a name

By early 2026 the practice was established enough to be named. On **5 February**, Mitchell
Hashimoto published the step of his own adoption that he called **"engineer the harness"**:
"anytime you find an agent makes a mistake, you take the time to engineer a solution such that the
agent never makes that mistake again" — an `AGENTS.md` line for simple repeat mistakes, a real tool
(a screenshot script, a filtered test runner) for the rest
([Hashimoto 2026](https://mitchellh.com/writing/my-ai-adoption-journey)). Six days later, OpenAI
published *Harness engineering*, the case study of a team that built an internal product over five
months with **zero** hand-written lines — about a million lines of code and 1,500 merged pull
requests, from three engineers growing to seven — under the motto **"Humans steer. Agents
execute."** ([OpenAI 2026](https://openai.com/index/harness-engineering/)). Birgitta Böckeler's
essays on martinfowler.com gave the discipline its most useful vocabulary: **guides** that steer an
agent before it acts, **sensors** that observe after it acts and let it self-correct, each either
*computational* (tests, linters, type checkers) or *inferential* (a model reviewing a model)
([Böckeler 2026](https://martinfowler.com/articles/harness-engineering.html)).

The rest of the year turned the harness into an object of study. The accidental publication of
Claude Code's source in March made a closed harness readable
([section 3.2](/post/who-closes-the-loop?section=sec-3-2)); source-level censuses followed; papers
appeared on harnesses that rewrite themselves and on benchmarks that evaluate the harness rather
than the model ([section 3.1](/post/who-closes-the-loop?section=sec-3-1)). The products converged
on the same shape — sandbox first, classifier at the boundary, human at the pull request — and the
benchmarks were rebuilt around the discovery that agents had learned to satisfy graders in ways
their designers had not intended ([section 5.1](/post/who-closes-the-loop?section=sec-5-1)).

## The arc in one sentence

In 2021 the model proposed and the human did everything else. By 2026 the model proposes, the
harness observes, decides, acts, checks and remembers, and the human specifies at the beginning and
judges at the end. The interesting engineering moved with the loop: **out of the weights and into
the software around them.** Everything from here to the end of the essay is about that software.
