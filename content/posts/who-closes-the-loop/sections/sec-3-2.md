For its first year, the most widely used coding harness was also the least documented one.
Anthropic published user guides and a series of excellent engineering essays about Claude Code,
but not its architecture. Then, on **31 March 2026**, a packaging mistake published the source.
This section is about what that source — and the careful readings of it that followed — showed
about how a frontier lab builds a harness. It sticks to design-level findings reported by
independent analyses and a peer-readable paper, and it reproduces no code.

## What happened

Version **2.1.88** of the `@anthropic-ai/claude-code` npm package shipped with a **59.8 MB
JavaScript source map** — the file a bundler emits so a minified program can be traced back to
its original source. It pointed to an archive of the unobfuscated TypeScript: roughly **512,000
lines in about 1,900 files**, by the count most outlets converged on
([The Register](https://www.theregister.com/2026/03/31/anthropic_claude_code_source_code/),
[VentureBeat](https://venturebeat.com/technology/claude-codes-source-code-appears-to-have-leaked-heres-what-we-know),
[InfoQ](https://www.infoq.com/news/2026/04/claude-code-source-leak)). The reported cause was
mundane: a bundler that produces source maps by default, and no rule excluding them from the
published package.

Anthropic's statement called it "a release packaging issue caused by human error, not a security
breach", adding that no customer data or credentials were involved. A follow-up DMCA notice
initially took down about **8,100** GitHub repositories — many of them legitimate forks of
Anthropic's own public repository — before being narrowed to one repository and 96 forks; the
head of Claude Code, Boris Cherny, said the takedown "reached more repositories than intended"
([TechCrunch](https://techcrunch.com/2026/04/01/anthropic-took-down-thousands-of-github-repos-trying-to-yank-its-leaked-source-code-a-move-the-company-says-was-an-accident/)).
A clean-room rewrite, `claw-code`, became one of the fastest-starred repositories GitHub had seen.

The research consequence mattered more than the news cycle. Within two weeks, MBZUAI's VILA Lab
published *Dive into Claude Code* ([Liu et al. 2026](https://arxiv.org/abs/2604.14228)), a
source-level architectural analysis of v2.1.88; in July, Barbaste et al.'s eleven-harness study
([arXiv 2609.00006](https://arxiv.org/abs/2609.00006)) included the same snapshot. For the first
time, the most influential closed harness could be compared line-for-line with the open ones.

## The design philosophy, as the code expresses it

Liu et al. summarise Claude Code's stance as **"minimal scaffolding, maximal operational
harness"**: give the model as much local decision latitude as possible — no planning graph, no
fixed workflow — and invest instead in deterministic infrastructure around it. That matches what
the team said in public long before the leak. Cherny described the product principle as "do the
simple thing first", and explained that early versions "used RAG + a local vector db, but we
found pretty quickly that agentic search generally works better", being "simpler" and free of
"issues around security, privacy, staleness, and reliability"
([Cherny, February 2026](https://x.com/bcherny/status/2017824286489383315);
[Latent Space, May 2025](https://www.latent.space/p/claude-code)). The source confirms both: one
loop, no embedding index, and a great deal of machinery for everything that is not the model.

## The loop, the tools and the gate

**One loop for every surface.** A single async generator, `queryLoop()`, drives the interactive
terminal, headless mode, the SDK and the IDE integrations. (Names such as "nO" that circulated in
2025 came from reverse-engineering minified code and are not the source's own.) The model only
emits `tool_use` blocks; the harness parses, checks, dispatches and collects.

**A large but mostly dormant tool pool.** Liu et al. count **up to 54** built-in tools, of which
**19 are unconditional and 35 are behind feature flags**, assembled per session and merged with
MCP tools. Barbaste et al. count 43. An independent wire-level measurement in August 2026 saw
**27** built-in schemas actually sent on each request
([Alier et al. 2026](https://github.com/Lamb-Project/mcp-vs-cli-bench)). The disagreement is
mostly about what counts — flagged, deferred or resident — and it is itself the lesson: in a
production harness, *which tools the model is shown* is decided per session, not fixed in code.
The subagent tool is named `Agent` in current documentation; the to-do list tool has been
superseded by task-management tools ([tools reference](https://code.claude.com/docs/en/tools-reference)).

**Deny-first, in layers.** Liu et al. trace up to seven independent checks between a proposed
action and its execution — tool pre-filtering, deny-first rule evaluation (a deny beats any
allow), the permission mode, the auto-mode classifier, the shell sandbox, the rule that
permissions are *not* restored when a session is resumed, and hook interception. There are
seven permission modes, including an internal one that escalates a subagent's permission request
to its parent. The public documentation lists the six user-facing ones and states the invariant
that matters most: "Deny rules block in every mode, including `bypassPermissions`"
([permission modes](https://code.claude.com/docs/en/permission-modes)).

## Context: a pipeline, not a threshold

The most instructive part of the source is how much it spends on the context window. Liu et al.
describe **five compaction stages that run before every model call**, ordered from cheapest to
most destructive:

<figure class="fig">
<span class="fig-title">Figure 3.2 &#183; Claude Code&#8217;s context pipeline, cheapest stage first (v2.1.88)</span>
<div class="fig-steps">
<div class="fig-step"><b>Budget</b><em>per-result size caps on tool output; always on</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>Snip</b><em>trim the oldest history</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>Microcompact</b><em>fine-grained, cache-aware clearing of stale results</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>Collapse</b><em>a read-time projection over the full history</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step fig-step--hi"><b>Auto-compact</b><em>a model-written summary; the last resort</em></div>
</div>
<figcaption>After Liu et al. 2026. Barbaste et al. describe the same snapshot as a single threshold compaction triggered 13,000 tokens below the effective window, which restores up to five recently used files afterwards; the two readings differ in granularity. Anthropic&#8217;s own essay describes the same shape: summarise, then continue &#8220;with this compressed context plus the five most recently accessed files&#8221;.</figcaption>
</figure>

Three details from independent write-ups show how operational this code is. Auto-compaction had
a cap of **three consecutive failures**, added — per a code comment several analysts quoted — after
failed compactions were wasting large numbers of API calls a day
([Kim 2026](https://alex000kim.com/posts/2026-03-31-claude-code-source-leak/)). The code tracks a
catalogue of **cache-break vectors** — things that would invalidate the prompt cache — and uses
"sticky" state so that toggling a mode does not throw the cache away. And tool results are capped
by default; Anthropic's tool-design essay gives the default as **25,000 tokens**
([Anthropic 2025](https://www.anthropic.com/engineering/writing-tools-for-agents)). None of this
is intelligence. All of it is the arithmetic of [section 2.3](/post/who-closes-the-loop?section=sec-2-3)
turned into code.

## Memory, extensions and subagents

**Instruction files form a hierarchy.** Managed policy, user, project and local `CLAUDE.md` files
are concatenated root-down rather than overriding each other; files in subdirectories load on
demand; imports nest up to four hops; path-scoped rules live in `.claude/rules/`; and an
auto-memory index loads only its first 200 lines or 25 KB
([memory docs](https://code.claude.com/docs/en/memory)). `AGENTS.md` is read natively. Retrieval
over memory is not embedding search: the model scans short headers and fetches topic files when
they look relevant.

**Four extension mechanisms, priced by context.** Liu et al.'s most useful table ranks them by
what they cost the context window:

| Mechanism | What only it can do | Context cost |
|---|---|---|
| **Hooks** (27 event types) | intercept the lifecycle deterministically — block, rewrite, annotate | zero by default |
| **Skills** (`SKILL.md`) | package procedures and scripts, loaded when relevant | low — a description until invoked |
| **Plugins** | bundle and distribute the other three | medium |
| **MCP servers** | connect external services | high — every schema, every turn |

The ordering explains a design trend visible across the whole field in 2026: new capability
moved toward the cheap end of this table. By July, skills were supported by nine of eleven
harnesses against eight for MCP ([Barbaste et al.](https://arxiv.org/abs/2609.00006)).

**Subagents are context isolation.** The `Agent` tool re-enters the same loop with a fresh context
window, writes its transcript to a separate "sidechain" file, and returns **only a summary** to
the parent. Isolation can extend to a separate git worktree. Resuming or forking a session
deliberately does not restore its permissions: each session is its own trust domain.

## What was not shipped

The source also contained features behind flags that had not been released, and they were
reported by several independent analyses. The most discussed was **KAIROS**, an always-on
background mode with scheduled wake-ups and daily logs, alongside an **"autoDream"** process that
consolidates memory while the user is idle — merging, de-duplicating and pruning contradictions.
Others were stranger: an **anti-distillation** option that lets the server inject decoy tool
definitions into first-party sessions, a regular expression that detects user frustration
without spending a model call, an **"undercover"** mode that strips internal code names from work
in public repositories, and a terminal pet
([VentureBeat](https://venturebeat.com/technology/claude-codes-source-code-appears-to-have-leaked-heres-what-we-know);
[Kim 2026](https://alex000kim.com/posts/2026-03-31-claude-code-source-leak/)). Liu et al. note
the obvious caveat: a flag in a snapshot says nothing about whether a feature runs in production.

What the unreleased list does show is direction. The two most substantial items — a background
daemon and offline memory consolidation — both attack the subsystem that [section
3.1](/post/who-closes-the-loop?section=sec-3-1) identified as the hardest: **state that outlives a
session**.

## What the leak changed

Three things, and only one of them is about Anthropic.

**It settled the "secret sauce" question.** The loop is ordinary; the gains are in context
budgeting, permission layering, cache discipline and extension design, and those are mostly
described in Anthropic's public essays anyway. Barbaste et al. make the point empirically: they
find Anthropic's published guidance matches the shipped code closely — while noting the
correlation cannot say which came first.

**It accelerated convergence.** In the ninety days after the leak, Codex adopted Claude Code's
hook event names **verbatim**, shipped an importer for Claude Code's session transcripts and
settings, and other harnesses began reading `~/.claude/skills` and `.claude-plugin` formats
directly. Deferred tool loading went from one system to three; read-only plan modes spread to all
four vendor CLIs. The authors' summary: "The half-life of a competitive distinctive in this field
is currently measurable in weeks."

**It made inventories unreliable and structures durable.** Three careful sources — two papers and
one wire capture — give three different tool counts for the same product within five months. The
structural claims (one loop, layered gates, staged compaction, summary-only subagents) all agree.
That is the right way to read any architecture description of a moving system, including this
one: **trust the shape, date the numbers.**
