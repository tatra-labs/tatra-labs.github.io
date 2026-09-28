Before an agent can fix anything it has to answer two questions that sound trivial and are not.
*Where in this repository does the problem live?* And, of everything it could look at, *what should
be in front of the model right now?* The first is **localisation**; the second is **context
engineering**. They are different problems, and the field's answers to them diverged in a way that
is still unresolved.

## Localisation: finding the few lines that matter

SWE-bench measured the size of this problem on day one. Claude 2 resolved **1.96%** of issues with
the files a retriever chose, and **4.8%** with the files the real fix touched — more than double,
from better localisation alone ([Jimenez et al. 2023](https://arxiv.org/abs/2310.06770)). An issue
titled "stale session after token refresh" may need changes in a hook, a provider, a middleware and
a test file, none of which contains the word "stale".

Three families of answer emerged, and the harnesses of 2026 can be placed on a line between them.

<figure class="fig">
<span class="fig-title">Figure 4.1a &#183; Who decides what the model reads: the harness in advance, or the model on demand</span>
<div class="fig-steps">
<div class="fig-step"><b>Precomputed structure</b><em>The harness builds a map before the model starts: a ranked symbol graph (Aider), AST-level search APIs and test-based fault localisation (AutoCodeRover), hierarchical file&#8594;function&#8594;line narrowing (Agentless).</em></div>
<i class="fig-arr">&#8596;</i>
<div class="fig-step"><b>Index plus search</b><em>An embedding index answers semantic queries, and the model also greps (Cursor, Augment). The model chooses when to ask; the index chooses what comes back.</em></div>
<i class="fig-arr">&#8596;</i>
<div class="fig-step fig-step--hi"><b>Agentic search</b><em>No index. The model runs <code>rg</code>, <code>glob</code>, <code>git log</code> and reads files, deciding each next query from the last result (Claude Code, Codex CLI, Pi, mini-SWE-agent).</em></div>
</div>
<figcaption>Left to right, localisation intelligence moves from the harness designer into the model. The right-hand end is where 0 of the 11 harnesses in Barbaste et al.&#8217;s census use embeddings for code.</figcaption>
</figure>

**Precomputed structure** was the 2023–24 answer, when models were weaker searchers. Aider's
**repository map** parses the codebase with tree-sitter, builds a graph in which files are nodes and
dependencies are edges, ranks it with a personalised PageRank, and fits the top-ranked definitions
into a default budget of 1,024 tokens ([Aider 2023](https://aider.chat/2023/10/22/repomap.html)).
AutoCodeRover exposed search APIs over the syntax tree — `search_class`, `search_method_in_class` —
and used test coverage for spectrum-based fault localisation, lifting SWE-bench Lite from 19% to
**22%** ([Zhang et al. 2024](https://arxiv.org/abs/2404.05427)). The strength of this family is
determinism and token efficiency; its weakness is that structure is not relevance. A dependency
graph knows which functions call which, not which one the issue is about.

**Agentic search** is the 2025–26 frontier answer, and its most-quoted justification comes from
Claude Code's creator: early versions "used RAG + a local vector db, but we found pretty quickly that
agentic search generally works better. It is also simpler and doesn't have the same issues around
security, privacy, staleness, and reliability"
([Cherny 2026](https://x.com/bcherny/status/2017824286489383315)). Asked on a podcast how strong the
evidence was, he said plain search "outperformed everything. By a lot" — on "some internal
benchmarks also, but mostly vibes" ([Latent Space 2025](https://www.latent.space/p/claude-code)).
Barbaste et al.'s census confirms it is the norm, not an Anthropic idiosyncrasy: across eleven
harnesses and roughly four million lines, **none** retrieves code with embeddings. Their reasons are
specific to code — it has dense deterministic structure (paths, identifiers, types), it changes
minute to minute so an index is always slightly stale, and ripgrep is already installed everywhere
([Barbaste et al. 2026](https://arxiv.org/abs/2609.00006)). There is also a theoretical reason to
doubt that one vector per chunk can represent every relevance relation a query might need
([Weller et al. 2025](https://arxiv.org/abs/2508.21038)).

**The index camp has data too.** Cursor is the major production dissenter, and it published
numbers rather than vibes. In a November 2025 study, adding semantic search to its agent raised
answer accuracy on its internal benchmark by **12.5%** on average (6.5% to 23.5% depending on the
model); in an online A/B test, the share of agent-written code still present later rose **0.3%**
overall and **2.6%** on codebases of more than 1,000 files, and removing semantic search raised
dissatisfied follow-up requests by 2.2% ([Cursor 2025](https://cursor.com/blog/semsearch)). Its
conclusion is not "embeddings instead of grep" but "the combination of these two leads to the best
outcomes."

The two positions are less opposed than they look. Cursor's online gain is small on ordinary
repositories and grows with codebase size, which is exactly where grep's cost per useful hit rises.
A reasonable reading of both is that **agentic search is sufficient for most repositories with a
strong model, and an index earns its keep as the codebase — or the model's weakness at search —
grows.** No study yet measures the crossover directly.

**Localisation is not the whole failure.** SWE-agent's own analysis of 248 unresolved trajectories
found most failures were **wrong implementations** (52%), not failures to find the code; its
file-level localisation F1 of 59% already beat BM25's 45%
([Yang et al. 2024](https://arxiv.org/abs/2405.15793)). Once an agent can search, the bottleneck
moves downstream — to what it does with what it found, and to whether it can tell when it is wrong.

## Context engineering: the smallest set of high-signal tokens

Localisation decides which files matter. Context engineering decides which *tokens* the model sees,
from every source at once — instructions, tool schemas, history, files, tool output. Anthropic's
definition is the one most practitioners now use: finding "the smallest possible set of high-signal
tokens that maximize the likelihood of some desired outcome"
([Anthropic 2025](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).
[Section 2.3](/post/who-closes-the-loop?section=sec-2-3) gave the economic reason; the quality
reason is that attention degrades with length and with distractors. Chroma's tests of 18 models found
"even a single distractor reduces performance", and — counter-intuitively — that models did better
on shuffled haystacks than on logically coherent ones
([Chroma 2025](https://www.trychroma.com/research/context-rot)).

Every source competes for the same window, and each has its own failure mode.

<figure class="fig">
<span class="fig-title">Figure 4.1b &#183; What competes for the context window, and what each costs</span>
<div class="fig-stack">
<div class="fig-layer"><b>Instruction files</b><span><code>CLAUDE.md</code>, <code>AGENTS.md</code>, rules. Loaded every turn, so every line is multiplied by the turn count. <em>Failure: the encyclopedia &#8212; a file so long it crowds out the task.</em></span></div>
<div class="fig-layer fig-layer--hi"><b>Tool schemas</b><span>Every tool definition, every request. Anthropic: tool choice &#8220;degrades once you exceed 30&#8211;50 available tools&#8221;. <em>Failure: an MCP catalogue the model never uses, paid for on every turn.</em></span></div>
<div class="fig-layer"><b>History</b><span>Every prior thought, command and observation. <em>Failure: context rot &#8212; stale hypotheses and old errors steering new decisions.</em></span></div>
<div class="fig-layer"><b>Tool output</b><span>Logs, test runs, file reads. The largest and least predictable source. <em>Failure: a 40,000-line log in one observation.</em></span></div>
<div class="fig-layer"><b>Skills and memory</b><span>Loaded when relevant, by description first. <em>Failure: the wrong skill applied confidently.</em></span></div>
</div>
<figcaption>The ordering is roughly by how often each is paid for. Sources: Anthropic tool-search documentation; Chroma 2025; Cursor 2026; Jiang et al. 2026.</figcaption>
</figure>

The harnesses' answers, source by source:

**Instruction files: a map, not a manual.** OpenAI's agent-first team tried a large `AGENTS.md` and
abandoned it: "Instead of treating AGENTS.md as the encyclopedia, we treat it as the table of
contents" — about **100 lines**, pointing into a structured `docs/` tree that the agent reads when a
task requires it ([OpenAI 2026](https://openai.com/index/harness-engineering/)). Codex caps the
combined instruction files at **32 KiB** by default. A study of 2,853 repositories found context
files are the dominant — often the *only* — configuration mechanism developers actually use
([Galster et al. 2026](https://arxiv.org/abs/2602.14690)), which makes their length discipline the
single most common context decision in the field.

**Tool schemas: load them lazily.** Anthropic's own measurement is stark: 58 tools cost about **55,000
tokens** of definitions, and an internal setup reached 134,000 before optimisation. With a tool-search
tool that loads definitions on demand, Opus 4 went from **49% to 74%** on its tool-use evaluation
and Opus 4.5 from 79.5% to 88.1% ([Anthropic 2025](https://www.anthropic.com/engineering/advanced-tool-use)).
Independent work agrees: retrieving tools instead of listing them all raised selection accuracy from
**13.6% to 43.1%** in one MCP stress test ([Gan and Sun 2025](https://arxiv.org/abs/2505.03275)),
and Cursor's lazy loading of MCP tools cut total agent tokens by **46.9%**
([Cursor 2026](https://cursor.com/blog/dynamic-context-discovery)). Pi's author refuses MCP entirely
on the same grounds: "7–9% of your context window gone before you even start working."

Availability is not use, either. When Alier et al. attached a 44-tool MCP server and checked what
agents actually called, only **6 of 21** runs used it exclusively; six ignored it and did everything
through the shell, and four bypassed both to call the web API directly — while paying for all 44
schemas on every request ([Alier et al. 2026](https://github.com/Lamb-Project/mcp-vs-cli-bench)). One
harness that exposed the same server through a two-tool *gateway* — list tools, call a tool by name
— used about **3.1×** fewer tokens.

**History and tool output: files are the interface.** Cursor's January 2026 design writes long tool
outputs to files and lets the agent read the part it needs; keeps chat history as files so detail
survives summarisation; and syncs terminal sessions to files. Claude Code caps tool responses at
25,000 tokens by default and clears stale tool results before resorting to a summary. Both are
versions of one rule: **the context holds pointers; the disk holds content.**

**Skills: procedures, not facts.** A skill is a folder of instructions and scripts that loads by
description first. The best measurement of what skills do inside an agent found **procedural
anchoring** — stabilising which steps to take and in what order — accounted for **65.7%** of skill
mechanisms, and injecting missing knowledge only **4.5%**. Execution-layer failures from
environment problems fell from 5.3% to 0.2% with a skill loaded. But a new failure appeared —
guidance misapplied or ignored in **10%** of cases — and as the pool of available skills grew from 5
to 100, the precision with which agents used the right one fell from **29.6% to 3.3%**
([Jiang et al. 2026](https://arxiv.org/abs/2608.14036)).

## What to carry forward

- **Let the model search** with fast lexical tools; add an index when the codebase is large enough
  that grep stops being cheap, and measure the difference rather than assuming it.
- **Instruction files are a table of contents.** A hundred lines that point to documents, not a
  thousand lines that are the documents.
- **Load schemas, skills and documents on demand.** Every eagerly loaded token is paid for every
  turn and competes for attention.
- **Put large content on disk and pointers in context**, so that nothing needs to be summarised away
  to make room.
- **Check what the agent actually used.** An available tool, skill or document that is never used is
  a cost with no benefit — and you will not see it unless you look.
