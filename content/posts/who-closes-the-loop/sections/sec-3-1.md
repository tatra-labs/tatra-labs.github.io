Open any production coding agent and the first surprise is how little of it is about the model. A
community estimate adopted by the most detailed source-level study of Claude Code puts **about
1.6%** of its code in AI decision logic and **about 98.4%** in deterministic operational
infrastructure ([Liu et al. 2026](https://arxiv.org/abs/2604.14228)). The agent itself is a
`while` loop. Everything else is the harness: the machinery that decides what the model sees,
what it is allowed to do, what happens when it is wrong, and when it is finished.

This section takes that machinery apart twice. First by subsystem, using the two decompositions
that 2026 research converged on. Then by time, following one turn from keystroke to tool result.

## A working definition

The cleanest operational definition comes from a benchmark rather than a manifesto.
[HarnessDev](https://arxiv.org/abs/2609.01437) (ByteDance Seed and others, September 2026) gives
six frontier models the same **weak seed**: a runnable compatibility layer that parses the task,
exposes passive tools and writes the required output files, but has no loop, no tool policy, no
context management, no state, no verifier, no retry logic and no stopping rule. Unmodified, it
scores **zero on every benchmark**. Whatever a model has to add to that seed before it can do
anything is, by construction, the harness.

That gives a definition worth keeping:

> **The harness is the model-external software that turns next-token predictions into actions
> and observations, and decides when to stop.**

Two things follow immediately. The harness is the one part of the system you can change without
training anything. And since it is not in the weights, it is also the part two vendors can copy
from each other in weeks — which, as [section 3.3](/post/who-closes-the-loop?section=sec-3-3)
shows, is exactly what happened.

## Seven subsystems

The widest census so far is Barbaste et al.'s [source-code study of eleven coding
harnesses](https://arxiv.org/abs/2609.00006) (July 2026): Claude Code, Codex CLI, Gemini CLI and
Mistral Vibe on the vendor side; OpenHands, Aider, Mini-SWE-Agent, Hermes, Pi, OpenCode and
OpenClaw in the open. It reads roughly four million lines and maps every system onto seven
subsystems. The useful thing about their table is not the list but the **range** — the smallest
and largest thing any real system does in each slot.

<figure class="fig">
<span class="fig-title">Figure 3.1a &#183; The seven subsystems of a coding harness, and how far apart real systems sit</span>
<div class="fig-stack">
<div class="fig-layer"><b>Agent loop</b><span><b>Minimal:</b> Mini-SWE-Agent, a linear <code>while</code> over one bash tool. <b>Maximal:</b> OpenHands, an event-sourced conversation that executes batches of actions in parallel.</span></div>
<div class="fig-layer"><b>LLM integration</b><span><b>Minimal:</b> one LiteLLM call, one prompt template. <b>Maximal:</b> Hermes with five owned transports and 29 provider profiles; Codex pulling prompts and reasoning tiers from a server-side model catalogue.</span></div>
<div class="fig-layer fig-layer--hi"><b>Tools</b><span><b>Minimal:</b> bash only. <b>Maximal:</b> Claude Code's 43 typed tools with deferred loading; OpenClaw at 109.</span></div>
<div class="fig-layer fig-layer--hi"><b>Memory &amp; context</b><span><b>Minimal:</b> an unbounded linear history. <b>Maximal:</b> Codex's agent-maintained cross-session memory; Gemini CLI's graph-based context distillation.</span></div>
<div class="fig-layer"><b>Safety</b><span><b>Minimal:</b> a step limit and a cost cap. <b>Maximal:</b> Codex's policy rules, an LLM approval reviewer and an OS sandbox on three platforms.</span></div>
<div class="fig-layer"><b>Orchestration</b><span><b>Minimal:</b> none, by design (Aider). <b>Maximal:</b> Claude Code's recursive subagents; a meta-harness that drives other vendors' harnesses as workers.</span></div>
<div class="fig-layer"><b>Extensibility</b><span><b>Minimal:</b> Python structural typing. <b>Maximal:</b> Pi, where everything is an extension; Codex's plugin marketplace.</span></div>
</div>
<figcaption>After Barbaste et al. 2026, Table 1. The two marked rows are where the study finds production systems now differ most. Two cross-cutting surfaces sit beside the seven: the interface layer (TUI, IDE protocol, HTTP server, SDK) and the session substrate (transcripts, resume, fork).</figcaption>
</figure>

HarnessDev slices the same object into six **control modules** — Loop, Tools, Context, State,
Lifecycle, Verify — and the two vocabularies disagree in an instructive place. Barbaste's list has
no verification subsystem at all; in production code, verification shows up only as scattered
patterns, such as Hermes's *verify-on-stop* guard, which rewrites a final answer into a
continuation whenever the turn edited code without fresh evidence that it works. HarnessDev puts
Verify in the core — and then finds that models writing their own harness build it (15 of 18)
while almost never building State: **one** of 18 generated harnesses exposes a state-saving
interface, and **no checkpoint event occurs in 26,679 recorded trajectories**. Both studies end
up locating the hard part in the same place. Memory is where production systems differentiate
most, and where generated systems are weakest.

## Where the lines of code actually go

If the loop is trivial, what are a million lines for? Barbaste's first observation answers it:
production code mass goes to **safety, user experience, extensibility and clients**. About
three-fifths of OpenCode's non-test source is TUI, web, desktop and SDK clients. Codex CLI grew
from roughly **621 thousand to 1.12 million lines of Rust** in a single quarter of 2026. None of
that growth changed what happens between the model and the repository; it changed who can drive
the loop and under what rules.

The same study's most counter-intuitive sentence follows from this: **"loop sophistication does
not predict benchmark performance."** Mini-SWE-Agent — about a hundred lines — reports SWE-bench
Verified numbers in the same range as systems three orders of magnitude larger. The authors are
careful to note those figures are self-reported on different models and dates, and they strip
them from their own comparison table. The controlled counter-evidence is in
[section 5.2](/post/who-closes-the-loop?section=sec-5-2): the same model, GPT-5, solves
**35.2%** of Terminal-Bench 2.1 inside one harness and **49.6%** inside another. Both statements
are true at once. The loop's *shape* barely matters; what the loop *feeds the model* matters a
great deal.

## One turn, from keystroke to tool result

The subsystems are easier to understand in motion. Here is one turn of Claude Code as
reconstructed from its circulated source (v2.1.88) by Liu et al., using their running example —
*"Fix the failing test in `auth.test.ts`"*. Other harnesses differ in detail; almost every one
performs these steps in this order.

<figure class="fig">
<span class="fig-title">Figure 3.1b &#183; One turn of a production harness</span>
<div class="fig-steps fig-steps--v">
<div class="fig-step"><b>1 &#183; Assemble context</b><em>System prompt, the CLAUDE.md hierarchy (loaded lazily), git status, tool schemas (some deferred behind a search tool), the conversation so far.</em></div>
<i class="fig-arr">&#8595;</i>
<div class="fig-step fig-step--hi"><b>2 &#183; Shrink it until it fits</b><em>A five-stage pipeline runs before every model call, cheapest first: per-result size caps, snipping old history, cache-aware microcompaction, a read-time projection over the full history, and only as a last resort a model-written summary.</em></div>
<i class="fig-arr">&#8595;</i>
<div class="fig-step"><b>3 &#183; Call the model</b><em>It returns text and zero or more <code>tool_use</code> blocks. It never touches the filesystem, the shell or the network itself.</em></div>
<i class="fig-arr">&#8595;</i>
<div class="fig-step fig-step--hi"><b>4 &#183; Gate each action</b><em>Tool pre-filtering, deny-first rules (a deny always beats an allow), the permission mode, an optional ML classifier in auto mode, hook interception &#8212; any layer can block.</em></div>
<i class="fig-arr">&#8595;</i>
<div class="fig-step"><b>5 &#183; Execute inside a boundary</b><em>File edits, shell commands in an OS sandbox, MCP calls, or a subagent spawned into its own context window that returns only a summary.</em></div>
<i class="fig-arr">&#8595;</i>
<div class="fig-step"><b>6 &#183; Observe and record</b><em>Results are size-capped and appended to the transcript; the session is written as mostly append-only JSONL.</em></div>
<i class="fig-arr">&#8595;</i>
<div class="fig-step"><b>7 &#183; Decide whether to stop</b><em>No tool calls means the turn is over. Otherwise go back to 1 with the observations added.</em></div>
</div>
<figcaption>After Liu et al. 2026, &#167;&#167;3&#8211;9. Steps 2 and 4 are where most of the engineering lives; they are marked. The model's only contribution is step 3.</figcaption>
</figure>

Three design choices in that trace carry more weight than they look.

**The model proposes; the harness disposes.** Because the model only ever emits a structured
request, a manipulated model cannot talk its way past the sandbox or a deny rule — those checks
run in ordinary code after the model has finished speaking. Every serious harness makes this
separation. It is the reason prompt injection is a *containment* problem and not only a
*persuasion* problem ([section 4.5](/post/who-closes-the-loop?section=sec-4-5)).

**Context is budgeted before it is spent.** Step 2 runs on every call, not when the window
overflows. The cheap stages (capping a 40,000-line log before it ever reaches the model) do most
of the work; the expensive summary is the fallback. The external evidence that this machinery
works is a cache statistic: an independent measurement found **98%** of Claude Code's input
tokens served from the prompt cache ([Alier et al. 2026](https://github.com/Lamb-Project/mcp-vs-cli-bench)),
which only happens if the prefix of each request is kept stable turn after turn.

**The loop has one shape everywhere.** Liu et al. find a single `queryLoop()` generator behind
the interactive CLI, headless mode, the SDK and the IDE integrations. Barbaste finds that all
eleven systems implement a variant of [ReAct](https://arxiv.org/abs/2210.03629)'s
think–act–observe cycle, with nine of them strictly iterative. The loop is not where
differentiation happens. It is the fixed point everything else is arranged around.

## The irreducible core

Strip all of that away and something still works. Mini-SWE-Agent's loop gives the model a single
capability — run a shell command — and appends each output to a linear history. Barbaste's paper
ends with a **90-line** reference harness implementing ten of its eighteen recommendations: a
linear loop with turn and cost limits, four tools (bash, read, write, and search-and-replace
that must match a unique string), discovery of `AGENTS.md` files from the repository root down
to the working directory, and compaction that keeps the most recent 30% of history verbatim.
Stripped to its skeleton, every harness is this:

```python
history = [system_prompt, user_goal]
for turn in range(MAX_TURNS):                   # lifecycle: a hard budget
    history = compact_if_needed(history)        # context: keep the window honest
    reply = model(history, tools=TOOLS)         # the only non-deterministic line
    history.append(reply)
    if not reply.tool_calls:                    # stopping rule: no action means done
        break
    for call in reply.tool_calls:
        if not permitted(call):                 # safety: checked in code, not in prose
            history.append(refusal(call))
            continue
        result = run_in_sandbox(call)           # environment: bounded blast radius
        history.append(truncate(result))        # observation: informative but concise
```

Eleven lines, and five of the seven subsystems are already present as function names. A
production harness is what you get when each of those names turns out to hide a hard problem.
[Part III](/post/who-closes-the-loop?section=sec-4-1) takes them one at a time.

## What to carry forward

- The harness is defined by subtraction: it is everything the model cannot do without. A seed
  with no loop, no tool policy and no stopping rule scores zero.
- The loop is a commodity. The engineering — and most of the code — is in context budgeting,
  permission gating, clients and extension points.
- Two independent 2026 studies agree that **memory and state** are the unsolved subsystem: the
  place production systems differ most and generated harnesses almost never build.
- A minimal harness is not a toy. Four tools and a linear history are a legitimate baseline,
  and [the next section](/post/who-closes-the-loop?section=sec-3-2) shows what a maximal one adds.
