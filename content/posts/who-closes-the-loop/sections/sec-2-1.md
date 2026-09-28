A little formalism pays for itself here. It turns the loose claim that "the harness matters" into
a precise statement of *which* parts of the problem the harness owns, and it explains a result
that otherwise looks like a benchmarking accident: the same model, on the same tasks, scoring
very differently inside two different programs.

## The coding agent as a partially observed control problem

Treat one coding task as a partially observable Markov decision process. The environment has a
**state** $s_t$ that the agent never sees in full: every file in the repository, the processes
running, the installed packages, the network, the CI configuration — and, crucially, the
intended behaviour that exists only in the person who filed the issue. The agent takes an
**action** $a_t$, a tool call. The environment moves to a new state and emits an
**observation**:

$$
s_{t+1} \sim T(s_t, a_t), \qquad o_{t+1} = O(s_{t+1}, a_t)
$$

The observation is whatever the tool prints: a file's contents, a stack trace, a diff, the line
`3 passed, 1 failed`. The full history is $h_t = (o_0, a_0, o_1, \ldots, a_{t-1}, o_t)$.

So far this is textbook. The interesting part is that the language model **never sees
$h_t$**. It sees a context $C_t$ that the harness builds from the history, and it acts only
through the actions the harness exposes and permits:

$$
C_t = H(h_t), \qquad a_t \sim \pi_\theta(\cdot \mid C_t), \qquad a_t \in \mathcal A_H, \quad G(a_t) = 1
$$

Four objects in that line belong to the harness, not the model:

| Symbol | What it is | Where you meet it |
|---|---|---|
| $H$ | the **context map**: which parts of history, repository and instructions enter the window, in what form | compaction, file viewers, `AGENTS.md`, memory, subagent summaries |
| $\mathcal A_H$ | the **action space**: which tools exist and what their arguments mean | bash, `str_replace`, `apply_patch`, MCP servers, skills |
| $O$ | the **observation format**: how a tool's result is rendered back | truncation, lint output on edit, "command ran with no output" |
| $G$ | the **gate**: which proposed actions are allowed to run | permission modes, deny rules, sandbox boundaries, classifiers |

Add two more — a **stopping rule** $\tau$ that decides when the episode ends, and a
**verifier** $V$ that decides whether it ended well — and you have the harness, written as the
set $(H, \mathcal A_H, O, G, \tau, V)$ wrapped around a fixed $\pi_\theta$.

In POMDP language, $H$ is doing the job a **belief state** does in classical control: a
compressed summary of history that should be sufficient for choosing the next action. The
difference is that a classical belief state is computed by Bayes' rule from a known model of the
world. A harness computes $C_t$ with heuristics — the last five observations, the 100 lines
around the cursor, a model-written summary — and the model must act well on whatever survives.

## Why the same model behaves differently in two harnesses

Once the harness is written this way, the harness effect stops being mysterious. Changing the
harness changes $H$, $\mathcal A_H$ and $O$, so the model is solving **a different decision
problem** even when the repository and the weights are identical.

The measurements agree across two years and two very different model generations:

- **2024, SWE-bench Lite, GPT-4 Turbo held fixed**: **2.67%** with one-shot retrieval, **11.0%**
  with a raw shell, **18.0%** with SWE-agent's designed interface
  ([Yang et al. 2024](https://arxiv.org/abs/2405.15793), Table 1).
- **2026, Terminal-Bench 2.1, GPT-5 held fixed**: **35.2%** in one harness, **49.6%** in another
  ([Wu et al. 2026](https://arxiv.org/abs/2609.01437), §1).

And the ablations say *which* symbol moved the score. In SWE-agent, replacing the viewer's
100-line window with whole files (a change to $O$) cost **5.3 points**; keeping full history
instead of collapsing everything older than five turns (a change to $H$) cost **3.0**; giving
the model an IDE-style search that returns one hit at a time (a change to $\mathcal A_H$) cost
**6.0** — worse than giving it no search command at all. A human-shaped interface is not
neutral for a model. It can be worse than nothing.

This is also why a benchmark score is a property of a **pair**. "Model $M$ scores $x$ on
benchmark $B$" is under-specified until someone names $(H, \mathcal A_H, O, G, \tau, V)$. The
[HarnessTax study](/post/the-harness-tax) is the cost-side version of the same point.

## Workflows and agents are two ends of one axis

Anthropic's [*Building effective agents*](https://www.anthropic.com/engineering/building-effective-agents)
(December 2024) draws the distinction most builders now use. In a **workflow**, "LLMs and tools
are orchestrated through predefined code paths". In an **agent**, the LLM "dynamically
directs its own processes and tool usage". The formalism makes this precise: in a workflow, the
harness fixes the sequence of sub-problems and the model only fills in each one; in an agent,
the model chooses $a_t$ freely inside $\mathcal A_H$ at every step.

[Agentless](https://arxiv.org/abs/2407.01489) is the clean example of the first kind: a fixed
localise → repair → validate pipeline with no agent loop at all, which in mid-2024 outperformed
every open-source agent on SWE-bench Lite. It is not a failed agent. It is a harness in which
the designer, rather than the model, supplies the policy structure — and when the designer
knows the right decomposition, that is often the better trade. The question a harness designer
actually faces is not "agent or not" but **how much of the policy to hard-code**, and the right
answer moves as models improve ([section 1.2](/post/who-closes-the-loop?section=sec-1-2)).

## A memory taxonomy that maps onto real files

The agent-architecture literature already had a vocabulary for the harness before the word
existed. CoALA — *Cognitive Architectures for Language Agents*
([Sumers, Yao, Narasimhan and Griffiths, 2023](https://arxiv.org/abs/2309.02427)) — describes a
language agent by its **memory** (a working memory plus long-term episodic, semantic and
procedural stores), its **action space** (internal actions such as reasoning, retrieval and
learning, and external "grounding" actions on the world) and its **decision procedure**. Every
piece has a concrete counterpart in a 2026 coding harness:

<figure class="fig">
<span class="fig-title">Figure 2.1a &#183; CoALA's memory types, as files on disk</span>
<div class="fig-stack">
<div class="fig-layer"><b>Working memory</b><span>The context window $C_t$ itself &#8212; rebuilt every turn, and the scarcest resource in the system.</span></div>
<div class="fig-layer"><b>Episodic</b><span>The session transcript (append-only JSONL in Claude Code), progress logs, <code>git log</code>. What happened, in order.</span></div>
<div class="fig-layer"><b>Semantic</b><span><code>CLAUDE.md</code> / <code>AGENTS.md</code>, architecture notes, the repository's own docs. What is true about this project.</span></div>
<div class="fig-layer fig-layer--hi"><b>Procedural</b><span>Skills (<code>SKILL.md</code> directories), slash commands, hooks, custom subagent definitions. How to do things here.</span></div>
<div class="fig-layer"><b>Grounding actions</b><span>Shell, file edits, browsers, MCP tools &#8212; everything that changes $s_t$.</span></div>
<div class="fig-layer"><b>Internal actions</b><span>Reasoning, search over the repository, reading memory, writing a plan or a todo list.</span></div>
</div>
<figcaption>The 2023 taxonomy is from CoALA; the mapping to harness artefacts is ours. The marked row is the one 2026 research found doing the most work: skills stabilise <em>which actions to take</em> far more than they supply missing facts (section 4.1).</figcaption>
</figure>

The mapping is not decoration. It predicts where things go wrong. Working memory is small, so
everything else has to be *retrieved into it* at the right moment — which is the whole of the
context-engineering problem. Episodic memory grows without bound, so it has to be *compressed*
— which is compaction, and its failure modes. Procedural memory is cheap to load and powerful,
so it is where 2026 harnesses put most of their new extension surface.

## Autonomy as loop length

One more quantity makes the history in [chapter 1](/post/who-closes-the-loop?section=sec-1-1)
legible. Call a step *closed by the harness* if the next action is chosen without a human, and
define the **loop length** $L$ as the expected number of consecutive harness-closed steps
before a human has to intervene — to accept a suggestion, answer a question, approve a command
or review a result.

This is our framing rather than a standard metric, but it orders the eras cleanly:

<figure class="fig">
<span class="fig-title">Figure 2.1b &#183; Who closes the loop, era by era</span>
<div class="fig-grid">
<span class="fig-cell fig-cell--hd">Era</span>
<span class="fig-cell fig-cell--hd">Who picks the next action</span>
<span class="fig-cell fig-cell--hd">Loop length</span>
<span class="fig-cell fig-cell--row">Autocomplete (2021)</span>
<span class="fig-cell"><b>The human</b><em>accepts or rejects every suggestion</em></span>
<span class="fig-cell"><b>&#8776; 1</b><em>one completion per keystroke pause</em></span>
<span class="fig-cell fig-cell--row">Chat assistant (2022&#8211;23)</span>
<span class="fig-cell"><b>The human</b><em>copies code out, runs it, pastes errors back</em></span>
<span class="fig-cell"><b>&#8776; 1</b><em>one answer per message</em></span>
<span class="fig-cell fig-cell--row">Interactive agent (2024&#8211;25)</span>
<span class="fig-cell fig-cell--alt"><b>The model, through a harness</b><em>human approves risky steps and reviews the diff</em></span>
<span class="fig-cell"><b>Tens of steps</b><em>bounded by permission prompts</em></span>
<span class="fig-cell fig-cell--row">Background agent (2025&#8211;26)</span>
<span class="fig-cell fig-cell--alt"><b>The model, through a harness</b><em>tests and CI stand in for the human until the PR</em></span>
<span class="fig-cell"><b>Hundreds of steps</b><em>bounded by the task, the budget and the verifier</em></span>
</div>
<figcaption>Each transition moved one more part of the loop &#8212; observe, decide, act, check &#8212; from a person into software. The marked cells are where the harness, not the human, became the thing that closes the loop.</figcaption>
</figure>

Seen this way, every technical problem in this essay is the same problem wearing different
clothes: *what must be true of $H$, $\mathcal A_H$, $O$, $G$ and $V$ for $L$ to grow without the
error rate growing with it?* The next section puts numbers on how hard that is.
