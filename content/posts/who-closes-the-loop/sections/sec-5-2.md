"Which coding agent is best?" has no answer, because the products are not trying to be the same
thing. This section compares them the way the rest of the essay has decomposed them — by philosophy,
by subsystem, by measured cost and outcome — and ends with the question that actually has an answer:
*which one fits a given kind of work.*

## Five philosophies

Beneath the feature lists, the systems of 2026 make five recognisably different bets about where
the intelligence should live and who should close the loop.

<figure class="fig">
<span class="fig-title">Figure 5.2a &#183; Five bets about where the intelligence lives</span>
<div class="fig-stack">
<div class="fig-layer"><b>Minimal loop</b><span>Trust the model; give it a shell; add nothing that has not been shown to help. <span class="fig-tags"><i class="fig-tag">mini-SWE-agent</i><i class="fig-tag">Pi</i></span> <em>Asks: how much can the model do alone?</em></span></div>
<div class="fig-layer"><b>Code-aware pair programmer</b><span>Precompute the repository&#8217;s structure, choose the edit format per model, keep a human in every turn. <span class="fig-tags"><i class="fig-tag">Aider</i><i class="fig-tag">Cline</i></span> <em>Asks: how efficiently can a model change an existing codebase with me?</em></span></div>
<div class="fig-layer fig-layer--hi"><b>Developer-environment agent</b><span>Give the model a developer&#8217;s whole machine &#8212; shell, files, browser, tools &#8212; inside a sandbox, with memory, subagents and extensions. <span class="fig-tags"><i class="fig-tag">Claude Code</i><i class="fig-tag">Codex CLI</i><i class="fig-tag">Cursor</i><i class="fig-tag">OpenCode</i><i class="fig-tag">Antigravity</i></span> <em>Asks: can the agent work like a developer?</em></span></div>
<div class="fig-layer fig-layer--hi"><b>Autonomous worker</b><span>Take a ticket, boot a prepared machine, work for hours, return a pull request with evidence. <span class="fig-tags"><i class="fig-tag">Copilot cloud agent</i><i class="fig-tag">Codex cloud</i><i class="fig-tag">Cursor cloud agents</i><i class="fig-tag">Devin</i><i class="fig-tag">Jules</i></span> <em>Asks: can software work be delegated rather than assisted?</em></span></div>
<div class="fig-layer"><b>Platform and meta-harness</b><span>Expose the harness as an SDK or server, host other vendors&#8217; agents, enforce one policy across all of them. <span class="fig-tags"><i class="fig-tag">OpenHands SDK</i><i class="fig-tag">Codex App Server</i><i class="fig-tag">Claude Agent SDK</i><i class="fig-tag">GitHub Agent HQ</i><i class="fig-tag">Omnigent</i></span> <em>Asks: what if the harness is infrastructure?</em></span></div>
</div>
<figcaption>Several products sit in more than one row &#8212; Claude Code, Codex and Cursor each ship a local agent, a cloud worker and an SDK. The rows are bets, not market segments. Marked rows are where most usage is in 2026.</figcaption>
</figure>

The two ends of that stack are optimising different quantities. A minimal harness maximises how
much of the model's capability is exposed per line of harness code; it is the right research
baseline and, as the cost data below shows, often the cheapest way to finish a well-specified task.
A product harness maximises useful work delivered to a real user — which includes recovering from a
flaky tool, respecting a permission policy, remembering yesterday's session and producing a pull
request a reviewer can trust. Both are rational. Comparing them on one benchmark number compares the
wrong things.

## The major products, subsystem by subsystem

The two matrices below summarise what each vendor documents as of September 2026. Cells marked "—"
were not verifiable from primary sources.

<figure class="fig">
<span class="fig-title">Figure 5.2b &#183; Where the agent runs, and what stops it</span>
<div class="fig-scroll">
<div class="fig-grid fig-grid--wide" style="--cols:4">
<span class="fig-cell fig-cell--hd">Product</span>
<span class="fig-cell fig-cell--hd">Runs</span>
<span class="fig-cell fig-cell--hd">Containment</span>
<span class="fig-cell fig-cell--hd">Who approves</span>
<span class="fig-cell fig-cell--hd">Final authority</span>
<span class="fig-cell fig-cell--row">Claude Code</span><span class="fig-cell">local; Anthropic cloud sandbox (web, Slack)</span><span class="fig-cell">Seatbelt / bubblewrap; proxied network with allowlist</span><span class="fig-cell fig-cell--alt"><b>Classifier (auto mode, default since Aug 2026)</b><em>deny rules hold in every mode</em></span><span class="fig-cell">the user</span>
<span class="fig-cell fig-cell--row">OpenAI Codex</span><span class="fig-cell">local; cloud container</span><span class="fig-cell">Seatbelt / bubblewrap + seccomp / Windows sandbox; network off by default</span><span class="fig-cell fig-cell--alt"><b>Reviewer agent at the boundary (Auto-review)</b><em>or on-request / never</em></span><span class="fig-cell">the user</span>
<span class="fig-cell fig-cell--row">Cursor</span><span class="fig-cell">local IDE; isolated cloud VMs</span><span class="fig-cell">Seatbelt / Landlock + seccomp / WSL2</span><span class="fig-cell"><b>Mostly for network access</b><em>sandboxed agents stop 40% less</em></span><span class="fig-cell">the user; Bugbot reviews PRs</span>
<span class="fig-cell fig-cell--row">GitHub Copilot</span><span class="fig-cell">ephemeral GitHub Actions runner</span><span class="fig-cell">firewall; own branch only</span><span class="fig-cell"><b>Workflow runs need a click</b></span><span class="fig-cell fig-cell--alt"><b>Branch protection</b><em>cannot approve or merge its own PR; requester cannot approve</em></span>
<span class="fig-cell fig-cell--row">Devin</span><span class="fig-cell">cloud VM from a snapshot; local (Devin Desktop)</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span><span class="fig-cell">PR review</span>
<span class="fig-cell fig-cell--row">Google Antigravity / Jules</span><span class="fig-cell">local IDE and CLI; Google Cloud VM (Jules)</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span><span class="fig-cell">the user</span>
<span class="fig-cell fig-cell--row">Kiro</span><span class="fig-cell">local IDE and CLI</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span><span class="fig-cell">the user, per spec task</span>
</div>
</div>
<figcaption>From each vendor&#8217;s documentation and engineering posts (Anthropic, OpenAI, Cursor, GitHub, Cognition, Google, Amazon), checked September 2026. Marked cells are the three different answers to &#8220;who decides&#8221;: a model, a reviewing agent, and the repository&#8217;s own workflow.</figcaption>
</figure>

<figure class="fig">
<span class="fig-title">Figure 5.2c &#183; What the agent sees, how it writes, and what it can be extended with</span>
<div class="fig-scroll">
<div class="fig-grid fig-grid--wide" style="--cols:4">
<span class="fig-cell fig-cell--hd">Product</span>
<span class="fig-cell fig-cell--hd">Finds code by</span>
<span class="fig-cell fig-cell--hd">Edits by</span>
<span class="fig-cell fig-cell--hd">Parallel work</span>
<span class="fig-cell fig-cell--hd">Models</span>
<span class="fig-cell fig-cell--row">Claude Code</span><span class="fig-cell fig-cell--alt"><b>Agentic search only</b><em>grep, glob, LSP; no embedding index</em></span><span class="fig-cell">exact unique string replacement</span><span class="fig-cell">subagents, agent teams, worktrees</span><span class="fig-cell">Claude only</span>
<span class="fig-cell fig-cell--row">OpenAI Codex</span><span class="fig-cell">shell and ripgrep</span><span class="fig-cell">trained <code>apply_patch</code> grammar</span><span class="fig-cell">parallel subagents (TOML-defined)</span><span class="fig-cell">OpenAI (Codex line)</span>
<span class="fig-cell fig-cell--row">Cursor</span><span class="fig-cell fig-cell--alt"><b>Embedding index plus grep</b><em>+12.5% accuracy in its study</em></span><span class="fig-cell">per model: patch or string replace</span><span class="fig-cell">parallel agents, subagents, cloud agents</span><span class="fig-cell">multi-vendor + in-house Composer</span>
<span class="fig-cell fig-cell--row">GitHub Copilot</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span><span class="fig-cell">custom agents; third-party agents via Agent HQ</span><span class="fig-cell">multi-vendor</span>
<span class="fig-cell fig-cell--row">Devin</span><span class="fig-cell">codebase wiki and search (DeepWiki)</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span><span class="fig-cell">in-house SWE-1.x + frontier</span>
<span class="fig-cell fig-cell--row">Google Antigravity</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span><span class="fig-cell">agent manager; subagents</span><span class="fig-cell">Gemini default; others offered</span>
<span class="fig-cell fig-cell--row">Kiro</span><span class="fig-cell">&#8212;</span><span class="fig-cell">&#8212;</span><span class="fig-cell">parallel task &#8220;waves&#8221; from a spec</span><span class="fig-cell">Claude via Bedrock</span>
</div>
</div>
<figcaption>All seven support MCP or an equivalent tool protocol; Claude Code, Codex, Cursor and Antigravity also support Agent Skills and lifecycle hooks. Instruction files: <code>CLAUDE.md</code> and <code>AGENTS.md</code> (Claude Code), <code>AGENTS.md</code> capped at 32 KiB (Codex), <code>.cursor/rules</code> and <code>AGENTS.md</code> (Cursor), <code>.kiro/steering</code> and specs (Kiro).</figcaption>
</figure>

Three differences in those tables are real design disagreements rather than feature gaps.

**Grep or index.** Claude Code's documentation lists no embedding or semantic search tool at all;
Cursor's agent "makes heavy use of grep as well as semantic search". [Section 4.1](/post/who-closes-the-loop?section=sec-4-1)
argued the evidence favours an index mainly at scale.

**Who decides at the boundary.** Anthropic put a classifier there, OpenAI a reviewing agent, GitHub
the repository's existing branch protections. The first two scale to local work; the third needs no
new trust in any model but only works where the workflow is a pull request.

**One vendor or many.** Claude Code and Codex are single-vendor and co-designed with their models;
Cursor and Copilot are multi-vendor and tune the harness per model. That is the most consequential
disagreement of the three, and it has its own evidence.

## Model-native or model-neutral

The case for co-design is strong. OpenAI's Codex models are trained on the `apply_patch` format and
OpenAI tells integrators to use its exact implementation; Anthropic's editor schema is "built into
Claude's model". Cursor's per-model tuning found that removing reasoning traces from GPT-5-Codex cost
**30%** of its performance where the same change cost GPT-5 about 3% — a harness choice that matters
only for one model ([Cursor 2025](https://cursor.com/blog/codex-model-harness)). And Barbaste et al.
found that what tight coupling uniquely buys is **server-side co-evolution**: Codex re-tunes its
prompts and reasoning tiers per model release from a catalogue endpoint, without shipping a client.

The case against is empirical. In HarnessTax, **nine of twelve** model–benchmark comparisons were won
by a harness *other* than the one built by the model's own provider
([our write-up](/post/the-harness-tax)). A model's capability travels. What does not travel is a
harness's *tuning*: HarnessDev's harnesses lost up to half their score when a different model ran
them, because budgets and stopping rules had been fitted to the original. The synthesis is that
co-design raises the ceiling for one model while model-neutral design protects you against the
next model being different — which, in this field, it always is.

## What the measurements say about cost

Success rates on short tasks barely separate the major harnesses. Cost does.

<figure class="fig">
<span class="fig-title">Figure 5.2d &#183; Median input tokens per completed run, one fixed task, seven harnesses</span>
<div class="fig-panel">
<span class="fig-sub">Six operations against a private GitHub repository, aggregated over five models and two tool interfaces</span>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Pi</span><span class="fig-track"><i class="fig-bar" style="width:4.9%" title="Pi: 14,660"></i><i class="fig-blab" style="left:4.9%">14,660</i></span><span class="fig-val">1.0&#215;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name fig-name--hi">Tau</span><span class="fig-track"><i class="fig-bar" style="width:5.5%" title="Tau: 16,459"></i><i class="fig-blab" style="left:5.5%">16,459</i></span><span class="fig-val">1.1&#215;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Hermes</span><span class="fig-track"><i class="fig-bar" style="width:25.1%" title="Hermes: 75,352"></i><i class="fig-blab" style="left:25.1%">75,352</i></span><span class="fig-val">5.1&#215;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Codex</span><span class="fig-track"><i class="fig-bar" style="width:30.9%" title="Codex: 92,639"></i><i class="fig-blab" style="left:30.9%">92,639</i></span><span class="fig-val">6.3&#215;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">opencode</span><span class="fig-track"><i class="fig-bar" style="width:43.9%" title="opencode: 131,649"></i><i class="fig-blab" style="left:43.9%">131,649</i></span><span class="fig-val">9.0&#215;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">Claude Code</span><span class="fig-track"><i class="fig-bar" style="width:86.7%" title="Claude Code: 260,170"></i><i class="fig-blab" style="left:64%">260,170</i></span><span class="fig-val">17.7&#215;</span></div>
<div class="fig-row fig-row--bar"><span class="fig-name">qwen-code</span><span class="fig-track"><i class="fig-bar" style="width:96.3%" title="qwen-code: 288,808"></i><i class="fig-blab" style="left:73%">288,808</i></span><span class="fig-val">19.7&#215;</span></div>
</div>
<figcaption>Alier et al. 2026, Table 1. Pi and Tau &#8212; independent implementations of the same minimal design, with no MCP client &#8212; agree to within 12% and completed every run. The heavier harnesses completed 5&#8211;7 of 6&#8211;8 runs each. Output tokens varied only from 824 to 1,367 across all seven: the whole spread is what each harness makes the model read.</figcaption>
</figure>

HarnessTax measured the same shape on SWE-bench Lite with frontier models: Claude Code declares **23**
tools against Codex CLI's 7.4 and Pi's 4, opens its first call with **27,011** tokens against 11,308
and 1,972, and costs about **2.0×** Pi and **1.6×** Codex CLI per attempt, while success rates stay
within a couple of points ([our write-up](/post/the-harness-tax)). The authors of both studies draw
the same scoping conclusion. A general-purpose harness is paying, on every task, for breadth — MCP
catalogues, subagents, memory, planning — that a well-specified task does not use; that breadth earns
its keep in open-ended, multi-hour work in a real repository, which short benchmarks do not measure.
In Alier et al.'s words, generality "has a running cost", and "small models pay it at the highest
rate".

## What the measurements say about outcomes

Head-to-head outcome data for *products* is scarce, noisy and easy to misread. What exists:

- **Harder benchmarks separate harness–model pairs a little.** On Terminal-Bench 4.0 (August 2026),
  the top entries were GPT-6 Astra in Codex at **58.2%** and Fable 5.1 in Claude Code at **57.9%**,
  with overlapping confidence intervals of about ±3 points ([Snorkel leaderboard](https://snorkel.ai/leaderboard/terminal-bench-4-0/)).
  A year earlier, Factory's Droid had topped Terminal-Bench 1.0 at 58.75% with a deliberately small
  tool set, ahead of Claude Code and Codex CLI on comparable models.
- **Pull requests in the wild.** Datasets of agent-authored pull requests on GitHub give acceptance
  rates by agent, but two studies using different samples and methods ranked the same five agents in
  different orders ([Li et al. 2025](https://arxiv.org/abs/2507.15003);
  [Mazloomzadeh et al. 2026](https://arxiv.org/abs/2607.21832)). The robust finding is the shared one:
  every agent's PRs were accepted less often than human ones.
- **Adoption is a signal of fit, not of quality.** Claude Code passed **$2.5 billion** of run-rate
  revenue by February 2026 and an estimated 4% of public GitHub commits
  ([Anthropic 2026](https://www.anthropic.com/news/anthropic-raises-30-billion-series-g-funding-380-billion-post-money-valuation));
  Cursor passed $1 billion of annualised revenue in November 2025 and reported that more than 30% of
  its own merged PRs came from autonomous cloud agents ([Cursor 2026](https://cursor.com/blog/agent-computer-use));
  GitHub counted more than a million PRs from its coding agent in its first five months
  ([Octoverse 2025](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/)).
  These say people find the tools useful. They say nothing about which is better at a given task.

The honest summary is that **no public evaluation yet compares the major harnesses on long,
realistic tasks in real repositories, with cost, quality and interventions measured together.** The
rubric at the end of [section 5.1](/post/who-closes-the-loop?section=sec-5-1) describes what such an
evaluation would need to report.

## Choosing, by the shape of the work

What the evidence does support is matching the harness to the task.

| If the work is… | Prefer | Because |
|---|---|---|
| well-specified and repeated (CI fixes, migrations, scheduled jobs) | a small harness you control, or a headless mode with a fixed tool set | generality is a per-task cost; minimal harnesses were cheapest at equal success |
| exploratory, in a large unfamiliar codebase | a developer-environment agent with subagents and good search | breadth-first investigation is where subagents and indexes pay |
| a change you want to review as a PR | a cloud worker inside your repository's workflow | branch protection and CI are a verifier you already trust |
| long-running (hours) | a harness with durable state: progress files, git discipline, resumable sessions | long horizons are a state problem (section 4.4) |
| on a model you may swap next quarter | a model-neutral harness, or one you can re-tune | tuning does not transfer; capability does |
| sensitive (secrets, production access) | whatever runs in the strongest sandbox, with credentials outside it | containment beats approval (section 4.5) |

Most teams will use more than one. That is not indecision; it is the same division of labour a team
of people has.
