Claude Code shows what a frontier lab builds when it controls both the model and the harness. The
open harnesses show something more useful for anyone building their own: the **range of defensible
answers** to each design question, with the code available to check. Each system below is here for
one idea it got right first, or pushed furthest. Star counts are approximate as of September 2026.

## The minimalists

**mini-SWE-agent** (Princeton/Stanford, MIT licence) is the field's control experiment. "Some 100
lines of python" for the agent class; no tools "other than bash"; every action a fresh
`subprocess.run`, so there is no persistent shell state to corrupt; and a "completely linear
history" in which each step appends to the message list and nothing is ever rewritten
([repo](https://github.com/SWE-agent/mini-swe-agent)). It reports **over 74%** on SWE-bench
Verified with a frontier model, and the SWE-bench maintainers use it as the fixed harness for their
"bash only" leaderboard, precisely so that the leaderboard measures models rather than harnesses.
Its authors' verdict on their own earlier, much larger SWE-agent: "as LMs have become more capable,
a lot of this is not needed at all."

*The idea to steal:* **a baseline you can read in five minutes.** Before adding any component to a
harness, measure it against this.

**Pi** (Mario Zechner, MIT, ~110k stars) is the minimalist harness built for daily use rather than
benchmarks ([repo](https://github.com/badlogic/pi-mono)). It ships four tools — read, write, edit,
bash — and a system prompt plus tool definitions of **under 1,000 tokens**. Its author's
[design essay](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/) is a list of deliberate
refusals: no MCP ("7–9% of your context window gone before you even start working"), no subagents
("a black box within a black box"), no plan mode, no built-in to-do list, and no permission checks.
Pi is a set of components as much as an agent — OpenClaw is built on it — and it was acquired by
Armin Ronacher's Earendil in April 2026. In the HarnessTax study it was the cheapest harness on the
Pareto frontier for five of seven seats ([our write-up](/post/the-harness-tax)); in Alier et al.'s
controlled comparison it completed every run at **14,660** median input tokens, against 260,170 for
the heaviest harness tested.

*The idea to steal:* **every token in the prefix must earn its place.** Pi's refusals are a
position on the $TP$ term of [section 2.3](/post/who-closes-the-loop?section=sec-2-3), taken to its
logical end.

## The interface designers

**SWE-agent** (Princeton, NeurIPS 2024) introduced the idea that an agent's tools should be designed
*for the model*, the **agent–computer interface**
([Yang et al. 2024](https://arxiv.org/abs/2405.15793)). Four principles came out of it and are
still the best short guide to tool design: actions should be simple; actions should be compact;
feedback should be informative but concise; and guardrails should stop errors compounding. Its
concrete inventions — a 100-line windowed file viewer, an editor that runs a linter and **reverts**
any edit that introduces a syntax error, search that refuses to print more than 50 hits and asks
for a narrower query — each moved SWE-bench Lite by several points with the model held fixed.

*The idea to steal:* **a tool is a user interface whose user is a model.** Design its outputs the
way you would design a dashboard: for the reader's limits, not the writer's convenience.

**Aider** (Paul Gauthier, Apache-2.0, ~49k stars) is the oldest widely used terminal agent and the
most empirical. It pioneered the **repository map** — a compact, graph-ranked summary of the
repository's important symbols built with tree-sitter, sized to a token budget
([Aider 2023](https://aider.chat/2023/10/22/repomap.html)) — and ran the first systematic
experiments on **edit formats**. Its December 2023 finding still surprises people: on its
refactoring benchmark, GPT-4 Turbo scored **20%** with search-and-replace blocks and **61%** with
unified diffs, a format familiar from years of `git diff` in training data
([Aider 2023](https://aider.chat/2023/12/21/unified-diffs.html)). It later split **reasoning from
editing** into an *architect* model that plans and an *editor* model that writes the patch
([Aider 2024](https://aider.chat/2024/09/26/architect.html)). Barbaste et al. count **13** edit
formats in its source, and its README reports that about **88%** of its own recent code was written
by Aider.

*The idea to steal:* **the edit format is part of the model's interface, and it is measurable.**
Pick it by benchmark, per model.

## The platform builders

**OpenHands** (All Hands AI, MIT, ~89k stars) grew from the OpenDevin project into the most complete
open agent platform. Its conceptual root is **CodeAct**
([Wang et al., ICML 2024](https://arxiv.org/abs/2402.01030)): let the agent act by writing
executable code rather than filling in JSON tool calls. Its 2025 SDK paper
([Wang et al., MLSys 2026](https://arxiv.org/abs/2511.03690)) describes an **event-sourced**
architecture — every action and observation is an immutable event, so a conversation can be
replayed deterministically — with a local-to-remote runtime that runs the same agent in a
container, a remote server or a cloud sandbox. It is also a host: its `ACPAgent` can drive Claude
Code, Codex or Gemini CLI as interchangeable back-ends.

*The idea to steal:* **make the trajectory a log, not a variable.** Event sourcing gives you replay,
audit, resume and training data for free.

**Codex CLI** (OpenAI, Apache-2.0, ~127k stars) is the most instructive production harness whose
source is officially open. It was rewritten from TypeScript into Rust in 2025 and grew to about
1.1 million lines by July 2026. Four of its choices are worth knowing in detail.

- **The edit format is trained into the model.** Codex's `apply_patch` is a grammar-constrained
  patch envelope, and OpenAI's prompting guide is blunt: "We strongly recommend using our exact
  `apply_patch` implementation as the model has been trained to excel at this diff format"
  ([OpenAI cookbook](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)).
- **Statelessness is a privacy feature.** Codex deliberately does not rely on server-side
  conversation state, so it can support zero data retention; it re-sends history every turn and
  depends on exact-prefix caching to make that affordable. An early bug that listed MCP tools in an
  inconsistent order caused cache misses — [section 2.3](/post/who-closes-the-loop?section=sec-2-3)
  in one sentence ([Bolin 2026](https://openai.com/index/unrolling-the-codex-agent-loop/)).
- **Sandbox by default on three operating systems.** Seatbelt on macOS, bubblewrap with seccomp on
  Linux, a native sandbox on Windows; a `workspace-write` default with the network off.
- **The harness is a server.** The App Server exposes the loop over JSON-RPC with three primitives —
  *item*, *turn*, *thread* — and powers the IDE extensions, the desktop app and the web client from
  one core ([Chen 2026](https://openai.com/index/unlocking-the-codex-harness/)).

*The idea to steal:* **separate the harness from its user interface.** One loop, many clients.

**OpenCode** (MIT, ~210k stars, the most-starred harness in this list) takes that separation as its
architecture: a client/server design with terminal, desktop and web clients, and two built-in
agents — `build` with full access and `plan` restricted to reading — switched with a key
([repo](https://github.com/anomalyco/opencode)). About three-fifths of its non-test source is
clients, a clean illustration of where production code mass actually goes.

## The ones that went furthest on one axis

A handful of systems in Barbaste et al.'s census are worth knowing for a single mechanism:

- **Hermes** (Nous Research) has the most defensive stopping rule in the corpus. Its
  **verify-on-stop guard** refuses to accept a final answer from a turn that edited code without
  fresh verification evidence, and rewrites it into a continuation. Its **lineage compaction** ends a
  session and chains a child to it instead of destroying history. And its safety floor — twelve
  hard-coded refusal patterns — survives even YOLO mode, with the flag frozen at import time so
  injected text cannot flip it.
- **Gemini CLI** (Google, Apache-2.0) had the most elaborate **stuck detection**: five identical tool
  calls or ten identical output chunks abort a loop, and an LLM self-check runs after 30 turns. It
  compresses history at 50% of the window and keeps the last 30% verbatim. In May 2026 Google
  announced that consumer users would move to a closed, Go-based **Antigravity CLI** sharing a
  harness with its Antigravity IDE; the open repository continues for enterprise customers
  ([Google 2026](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/)).
- **Mistral Vibe** **deleted** its fuzzy search-and-replace tool within one quarter, in favour of
  exact unique-substring replacement — a small, telling data point that frontier-class models no
  longer need a forgiving edit tool.
- **Omnigent** (Databricks), which Barbaste et al. call the first **meta-harness**, orchestrates
  *other vendors' harnesses* through 23 adapters, enforces one policy across all of them through
  each vendor's own hooks, and in its flagship example requires the code reviewer to come from a
  different vendor than the implementer.
- **Factory's Droid**, which is closed, topped the first Terminal-Bench at **58.75%** in September
  2025 against 43.2% for Claude Code and 42.8% for Codex CLI on comparable models, and its
  write-up gives the reason in one line: "Complex tool schemas exponentially increased error rates"
  ([Factory 2025](https://factory.com/news/terminal-bench)).

## The map in one table

<figure class="fig">
<span class="fig-title">Figure 3.3a &#183; Eleven open-source harnesses (plus Claude Code) by their design bets</span>
<div class="fig-scroll">
<div class="fig-grid fig-grid--wide" style="--cols:4">
<span class="fig-cell fig-cell--hd">Harness</span>
<span class="fig-cell fig-cell--hd">Loop</span>
<span class="fig-cell fig-cell--hd">Edit contract</span>
<span class="fig-cell fig-cell--hd">OS sandbox</span>
<span class="fig-cell fig-cell--hd">Signature idea</span>
<span class="fig-cell fig-cell--row">Mini-SWE-Agent</span><span class="fig-cell">linear <code>while</code></span><span class="fig-cell">bash only</span><span class="fig-cell">container</span><span class="fig-cell fig-cell--alt"><b>The baseline</b><em>~100-line agent class</em></span>
<span class="fig-cell fig-cell--row">Pi</span><span class="fig-cell">functional core, steering queues</span><span class="fig-cell">exact replace</span><span class="fig-cell">none, by design</span><span class="fig-cell fig-cell--alt"><b>&lt;1,000-token prefix</b><em>no MCP, no subagents</em></span>
<span class="fig-cell fig-cell--row">Aider</span><span class="fig-cell">reflection (lint, test, retry)</span><span class="fig-cell">13 formats</span><span class="fig-cell">none</span><span class="fig-cell"><b>Repo map; edit-format science</b><em>architect / editor split</em></span>
<span class="fig-cell fig-cell--row">OpenHands</span><span class="fig-cell">event-sourced conversation</span><span class="fig-cell">exact replace</span><span class="fig-cell">Docker / remote</span><span class="fig-cell"><b>Replayable event log</b><em>hosts other harnesses via ACP</em></span>
<span class="fig-cell fig-cell--row">Codex CLI</span><span class="fig-cell">async state machine</span><span class="fig-cell">trained patch grammar</span><span class="fig-cell">native, 3 OSes</span><span class="fig-cell"><b>Harness as a server</b><em>model co-trained on its tools</em></span>
<span class="fig-cell fig-cell--row">Gemini CLI</span><span class="fig-cell">async generator</span><span class="fig-cell">fuzzy cascade</span><span class="fig-cell">native, 3 OSes</span><span class="fig-cell"><b>Stuck detection</b><em>consumer tier moved to Antigravity CLI</em></span>
<span class="fig-cell fig-cell--row">OpenCode</span><span class="fig-cell">ReAct</span><span class="fig-cell">fuzzy cascade</span><span class="fig-cell">policy only</span><span class="fig-cell"><b>Client / server</b><em>build and plan agents</em></span>
<span class="fig-cell fig-cell--row">Hermes</span><span class="fig-cell">budgeted, stop-guarded</span><span class="fig-cell">fuzzy cascade</span><span class="fig-cell">six back-ends</span><span class="fig-cell"><b>Verify-on-stop</b><em>lineage compaction</em></span>
<span class="fig-cell fig-cell--row">Mistral Vibe</span><span class="fig-cell">middleware pipeline</span><span class="fig-cell">exact replace (fuzzy removed)</span><span class="fig-cell">worktree, optional</span><span class="fig-cell"><b>Instruction hierarchy</b><em>seven levels</em></span>
<span class="fig-cell fig-cell--row">OpenClaw</span><span class="fig-cell">ReAct inside a gateway</span><span class="fig-cell">via plugins</span><span class="fig-cell">none</span><span class="fig-cell"><b>Perimeter, not per-action, control</b><em>~24 messaging surfaces</em></span>
<span class="fig-cell fig-cell--row">Claude Code</span><span class="fig-cell">recursive composition</span><span class="fig-cell">exact replace</span><span class="fig-cell">opt-in / auto</span><span class="fig-cell"><b>Staged compaction, layered gates</b><em>subagents as context isolation</em></span>
</div>
</div>
<figcaption>Loop, edit and sandbox columns after Barbaste et al. 2026, Table 4 (July 2026 pins; Claude Code from the March 2026 snapshot); the last column is ours. &#8220;Fuzzy cascade&#8221; means an edit tool that falls back through progressively looser matching; &#8220;exact replace&#8221; requires a unique match. Scroll sideways on a narrow screen.</figcaption>
</figure>

## What the census says the field agrees on

Barbaste et al.'s cross-system findings are the closest thing to consensus the field has, and
three of them are strong enough to act on.

**Nobody uses an agent framework.** Across roughly four million lines, "no agent runtime imports a
general-purpose agentic framework" — not LangChain, LangGraph, AutoGen or a dozen others — and
"none retrieves code with vector embeddings; the field runs on hand-rolled async loops and
deterministic retrieval." Their reading is that harnesses "did not adopt the frameworks; they
replaced them": the harnesses became SDKs, and framework vendors started shipping harnesses.

**Retrieval is lexical and structural.** ripgrep, glob, tree-sitter and language-server
diagnostics; embeddings appear only for *conversation* memory. The reasons are specific to code:
dense deterministic structure, files that change minute to minute and would leave an index stale,
and a fast search tool already installed everywhere. The notable production dissent is
[section 4.1](/post/who-closes-the-loop?section=sec-4-1)'s subject.

**The edit contract is converging on exact replacement.** Frontier-oriented harnesses require an
exact, unique substring to replace; fuzzy cascades survive mainly for weaker models; and the
paper's recommendation is to "match the edit contract to the model tier" and never rely on line
numbers.

Rombaut's independent study of thirteen open scaffolds adds a structural refinement: real loops
**compose** a small set of primitives — ReAct, generate–test–repair, plan–execute, multi-attempt
retry and tree search — and 11 of 13 combine more than one
([Rombaut 2026](https://arxiv.org/abs/2604.03515)). A plan mode, seen this way, is plan–execute
grafted onto ReAct.

## The protocols between harnesses

The last shift of 2025–26 happened *between* harnesses rather than inside them. Four open standards
now let parts move from one to another.

<figure class="fig">
<span class="fig-title">Figure 3.3b &#183; The four standards that connect harnesses</span>
<div class="fig-stack">
<div class="fig-layer"><b>MCP</b><span>Agent &#8596; tools and data. Announced by Anthropic in November 2024; 10,000+ published servers by December 2025. The July 2026 revision made the protocol stateless and asked servers to return tools in a deterministic order &#8220;to improve LLM prompt cache hit rates&#8221;.</span></div>
<div class="fig-layer"><b>ACP</b><span>Editor &#8596; agent. Zed&#8217;s Agent Client Protocol (August 2025), JSON-RPC over stdio, deliberately modelled on how LSP unbundled language support from editors. Now implemented by 40+ agents; also used by one harness to host another.</span></div>
<div class="fig-layer fig-layer--hi"><b>Agent Skills</b><span>Portable procedures. A folder with a <code>SKILL.md</code>, scripts and resources, loaded by description first and in full only when relevant. Released by Anthropic in October 2025, opened as a standard in December; supported by 9 of 11 harnesses in July 2026, ahead of MCP&#8217;s 8.</span></div>
<div class="fig-layer"><b>AGENTS.md</b><span>Portable project instructions. A single conventional file, launched in August 2025 by several vendors together and in use in 60,000+ repositories. Stewarded, with MCP and goose, by the Linux Foundation&#8217;s Agentic AI Foundation since December 2025.</span></div>
</div>
<figcaption>Sources: Linux Foundation (Dec 2025); MCP specification changelog (2026-07-28); Zed (Aug 2025); agentskills.io; Barbaste et al. 2026. The marked row is the one that grew fastest in 2026.</figcaption>
</figure>

The practical effect is that the pieces of a harness are becoming independent of the harness. A
skill written for one agent loads in another; an instruction file is read by all of them; a tool
server works everywhere; and one editor can drive any agent. What remains proprietary — and
differentiating — is the part this essay keeps returning to: how each harness budgets context,
gates actions and verifies results.
