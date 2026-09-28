A ten-step bug fix fits in one context window and one attention span. A feature that takes a
day does not. Somewhere between the two, an agent stops being a program that runs and becomes a
process that must **survive** — its own forgetting, its own compaction, its own mistakes, and
sometimes the other agents working beside it. The harness engineering of 2025–26 learned, mostly
the hard way, that the answer to long horizons is not a longer context window. It is external
state.

## The shift problem

Anthropic's statement of the problem is the clearest: "each new session begins with no memory
of what came before" ([Young 2025](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)).
Their analogy is a team of engineers working in shifts, each arriving with amnesia. Compaction —
summarising the old conversation and continuing — helps, but a summary is lossy in exactly the
way that hurts: it keeps the gist and drops the detail that turns out to matter three hours
later.

Their harness for multi-session work, published in November 2025, is worth describing in full,
because nearly every long-running design since has the same bones.

<figure class="fig">
<span class="fig-title">Figure 4.4a &#183; A harness built for shifts</span>
<div class="fig-steps">
<div class="fig-step fig-step--hi"><b>Initializer agent</b><em>runs once: writes <code>init.sh</code>, a <code>feature_list.json</code> of every requirement (over 200 in their example, all marked failing), an empty <code>claude-progress.txt</code>, and a first git commit</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>Coding agent, session n</b><em>reads the progress file and <code>git log</code>, starts the app, picks <b>one</b> failing feature, implements it, tests it end-to-end in a browser</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>Hand-off</b><em>commits with a descriptive message, marks the feature passing, updates the progress file</em></div>
<i class="fig-arr">&#8634;</i>
<div class="fig-step"><b>Session n + 1</b><em>a fresh context window that starts from the files, not from a summary</em></div>
</div>
<figcaption>After Anthropic, &#8220;Effective harnesses for long-running agents&#8221; (Nov 2025). The feature list is JSON rather than Markdown because the model is less likely to rewrite it inappropriately.</figcaption>
</figure>

Each piece answers a failure they observed:

| Failure | What the agent did | Harness response |
|---|---|---|
| Declaring victory early | looked at partial progress and announced the project finished | a complete feature list, **every item failing** at the start |
| One-shotting | tried to build everything at once and ran out of context mid-change | work on **one feature per session** |
| Leaving a mess | ended a session with half-done, undocumented changes | commit and update the progress file before stopping |
| Marking untested work done | claimed a feature worked without checking | end-to-end testing through a browser automation tool |

Note what is *not* in the table: nothing about a bigger model or a longer window. Every fix
moves a piece of state out of the context and into a file the next session can read — the
episodic and semantic memory of [section 2.1](/post/who-closes-the-loop?section=sec-2-1), made
durable.

## Git is the best memory an agent has

Almost every long-horizon design converges on the same substrate: the repository itself. Git
gives an agent three things no summary can. A **checkpoint** it can revert to when a change goes
wrong. A **log** that explains, in the agent's own commit messages, why the code is the way it
is. And a **coordination medium** that other agents can read.

OpenAI's harness-engineering team took this furthest. Over five months and about a million
lines, the repository became the "system of record": a roughly **100-line** `AGENTS.md` that
works as "the table of contents", pointing into a structured `docs/` tree of architecture notes,
product specifications and execution plans ([OpenAI 2026](https://openai.com/index/harness-engineering/)).
Individual Codex runs lasted "upwards of six hours". Knowledge that lived only in a person's head
or a chat thread was, for the agent, knowledge that did not exist.

The model side moved to meet this. OpenAI described GPT-5.1-Codex-Max (November 2025) as the first
model it had natively trained "to operate across multiple context windows through a process
called compaction". Anthropic's own measurements show the horizon lengthening in the field:
between October 2025 and January 2026, the 99.9th-percentile Claude Code turn went "from under
25 minutes to over 45 minutes" ([Anthropic 2026](https://www.anthropic.com/research/measuring-agent-autonomy)).

## Compaction destroys; eviction elides

Compaction is where long-running harnesses most often lose information, and the 2026 research
has sharpened why. Seven of eleven production harnesses studied by Barbaste et al. trigger an
LLM-written summary when the context crosses a threshold; Claude Code's triggers at a 13,000-token
buffer below the effective window and restores up to five recently used files afterwards
([Barbaste et al. 2026](https://arxiv.org/abs/2609.00006)). Once the summary replaces the
history, whatever it omitted is gone.

Alibaba's [Scroll](https://arxiv.org/abs/2608.21690) (August 2026) names the alternative. Every
context manager, it argues, decides what to keep *before* it knows what will be needed. Its
answer is **eviction rather than compaction**: removed spans stay verbatim in an append-only
event log, indexed so the agent can fetch them back with code, and "eviction changes only the
view, never the underlying record." The cost of getting this wrong is large: on its long-memory
benchmark, summarising raw history at ingestion collapsed a score from **73.1 to 19.9**. Two
production designs already lean this way — Hermes's *lineage compaction*, which ends a session
and chains a child to it by id so no history is destroyed, and Cursor's practice of writing long
tool outputs and even chat history to files so detail can be recovered after summarisation
([Cursor 2026](https://cursor.com/blog/dynamic-context-discovery)).

The rule that falls out: **summarise the view, never the record.** Keep the full transcript on
disk; let the context window hold a projection of it.

## The simplest long-running harness is a shell loop

Geoffrey Huntley's July 2025 "Ralph" technique is the minimal form of all of this, and its
existence is itself an argument ([Huntley 2025](https://ghuntley.com/ralph/)):

```bash
while :; do cat PROMPT.md | claude-code ; done
```

Each iteration starts a fresh agent on the same prompt file; "Ralph performs one task per loop";
the repository, the prompt and whatever plan files the agent maintains carry all state between
iterations. It is Anthropic's initializer-and-shifts design with the initializer removed and the
shift length set to one task. That something this crude works at all says that most of the
difficulty of long horizons is state management, not reasoning.

## When one agent is not enough

Parallelism is attractive because inference parallelises and software, supposedly, decomposes.
The evidence says the decomposition is the hard part.

**Flat swarms fail in recognisably human ways.** Cursor ran hundreds of concurrent agents on
single projects in early 2026 ([Lin 2026](https://cursor.com/blog/scaling-agents)). With shared
locks, "agents would hold locks for too long, or forget to release them entirely." With
optimistic concurrency instead, "agents became risk-averse. They avoided difficult tasks and made
small, safe changes." What worked was a hierarchy: **planners** that explore and create tasks,
**workers** that execute them, and a **judge** that decides at the end of each cycle whether to
continue, after which "the next iteration would start fresh". An integrator role "created more
bottlenecks than it solved", and "many of our improvements came from removing complexity rather
than adding it". Cursor reports week-long runs producing over a million lines for a web browser —
a claim that drew substantial public dispute about how much of it worked, and is best read as a
stress test of coordination rather than a product.

**The verifier coordinates better than any protocol.** Nicholas Carlini's February 2026
experiment is the cleanest positive result: **16** parallel Claude agents, about **2,000**
sessions and roughly **$20,000** of API use produced a **100,000-line** Rust C compiler that
builds Linux 6.9 on x86, ARM and RISC-V
([Carlini 2026](https://www.anthropic.com/engineering/building-c-compiler)). Coordination was
nothing more than lock files in a `current_tasks/` directory synchronised through git. What made
it work was the oracle: comparing against GCC let agents split a failing kernel build by file and
work on the pieces independently. Carlini's own lessons are harness lessons — the task verifier
must be "nearly perfect, otherwise Claude will solve the wrong problem", test output must not
flood the context, and an agent "will happily spend hours running tests instead of making
progress", which he fixed with a fast mode that samples 1–10% of the suite.

**Most production multi-agent use is breadth, not division of labour.** Nine of eleven harnesses
support subagents, and coordinator–worker "emerges independently" in seven of them — but Barbaste
et al. find it used mostly for **breadth-first exploration rather than parallel implementation**,
and recommend staying single-agent until you can point to a concrete exploration phase. A subagent
that reads fifty files and returns a 1,500-token summary is not a colleague; it is a **context
garbage collector**. Anthropic describes its subagents returning "a condensed, distilled summary
of its work (often 1,000–2,000 tokens)"
([Anthropic 2025](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).
The price is real: agent teams in Claude Code cost about **7×** the tokens of a standard session
in plan mode ([Liu et al. 2026](https://arxiv.org/abs/2604.14228)).

**Agreement between agents is not evidence.** When agents review each other, the failure mode is
consensus. Qiu and Gill's [Adversarial Review](https://arxiv.org/abs/2608.18167) (ICML 2026) found
that adding reviewers left LiveCodeBench flat, that plain self-refinement scored exactly the same
as no refinement, and that a reviewer–critic pair drifted into **false consensus** until the
critic was forced to disagree in typed, code-cited ways. Microsoft's
[test-time communication](https://arxiv.org/abs/2609.21032) study (September 2026) found the
condition under which teams do beat independent attempts — a shared log and atomic task claiming
let $k$ agents match **4.3–6.6×** as many independent ones on ARC-AGI-3 — and the two conditions
under which they do not: when agents cannot verify intermediate progress, or cannot afford to
explore on their own.

<figure class="fig">
<span class="fig-title">Figure 4.4b &#183; When adding agents helped, and when it did not</span>
<div class="fig-grid">
<span class="fig-cell fig-cell--hd">Setting</span>
<span class="fig-cell fig-cell--hd">What coordinated them</span>
<span class="fig-cell fig-cell--hd">Outcome</span>
<span class="fig-cell fig-cell--row">C compiler, 16 agents</span>
<span class="fig-cell"><b>A near-perfect oracle</b><em>GCC output, the kernel build, file locks in git</em></span>
<span class="fig-cell fig-cell--alt"><b>Worked</b><em>100k lines, builds Linux on three ISAs</em></span>
<span class="fig-cell fig-cell--row">Cursor, hundreds of agents</span>
<span class="fig-cell"><b>Locks, then optimistic concurrency</b><em>no hierarchy</em></span>
<span class="fig-cell"><b>Failed</b><em>held locks, avoided hard tasks</em></span>
<span class="fig-cell fig-cell--row">Cursor, planner / worker / judge</span>
<span class="fig-cell"><b>Hierarchy, fresh cycles</b><em>a judge decides whether to continue</em></span>
<span class="fig-cell fig-cell--alt"><b>Worked</b><em>week-long runs, disputed output quality</em></span>
<span class="fig-cell fig-cell--row">Reviewer + critic on code</span>
<span class="fig-cell"><b>Agreement</b><em>two verdict types</em></span>
<span class="fig-cell"><b>False consensus</b><em>fixed only by typed disagreement</em></span>
<span class="fig-cell fig-cell--row">Peers on ARC-AGI-3</span>
<span class="fig-cell"><b>Shared log, slot claiming</b><em>verified progress sharing</em></span>
<span class="fig-cell fig-cell--alt"><b>Worked</b><em>4.3&#8211;6.6&#215; the independent-agent equivalent</em></span>
</div>
<figcaption>The common factor in every success is a signal an agent can check without trusting another agent: an oracle, a judge, or a verified score. Sources: Carlini 2026; Cursor 2026; Qiu &amp; Gill 2026; Park et al. 2026.</figcaption>
</figure>

## What to carry forward

- Long horizons are a **state** problem before they are a reasoning problem. Move plans,
  progress and requirements out of the context and into files the next session reads.
- Use **git as memory**: small commits with honest messages are checkpoints, logs and a
  coordination channel at once.
- **Summarise the view, not the record.** Keep full transcripts and tool outputs on disk so a
  compacted detail can be recovered.
- Give each session **one unit of work** and a **failing list** it cannot argue with.
- Add agents only where a **verifier** can arbitrate between them. Without one, more agents
  produce more agreement, not more correctness — which is the subject of the
  [next section](/post/who-closes-the-loop?section=sec-4-3) in reverse.
