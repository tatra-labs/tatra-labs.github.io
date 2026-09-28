Once an agent knows where to act, it has to act — and three unglamorous things decide whether the
action does what the model meant: **how an edit is written down**, **how a tool reports back**, and
**whether the environment the tool runs in actually works.** Each of these fails in ways that look,
from outside, like the model being stupid. Most of them are the harness.

## Edits: the model knows the fix and still writes it wrong

A model can understand a change perfectly and still fail to express it as bytes on disk. It can
quote the text to replace with one character wrong, invent line numbers, match a snippet that
occurs three times, or — the failure Aider named "laziness" — elide the unchanged part of a file with
a comment like `# ... rest of the code ...` and delete it.

SWE-agent's traces show how expensive this is. **51.7%** of its trajectories on the full benchmark
contained at least one edit its linter had to reject, and while a first edit attempt eventually
succeeded **90.5%** of the time, after one failure the odds fell to **57.2%**
([Yang et al. 2024](https://arxiv.org/abs/2405.15793)). Errors in the act of editing compound like
any other.

The field has tried essentially every representation, and Barbaste et al. count **eight** distinct
editing strategies in current production code
([Barbaste et al. 2026](https://arxiv.org/abs/2609.00006)):

| Format | How it works | Where it fails |
|---|---|---|
| **Whole-file rewrite** | the model emits the entire new file | expensive; invites "lazy" elision on long files |
| **Line-range edit** | replace lines *m*–*n* | the model's idea of line numbers drifts as the file changes |
| **Search / replace block** | quote old text, give new text | a mis-quoted or non-unique snippet |
| **Unified diff** | standard `git diff` hunks | hunk headers and context must be exact |
| **Trained patch grammar** | Codex's `apply_patch` envelope, grammar-constrained | only reliable for models trained on it |
| **Exact unique replacement** | `str_replace`: the old string must occur exactly once | refuses ambiguous edits — which is the point |
| **Fuzzy cascade** | try exact, then progressively looser matching | can apply an edit in the wrong place |
| **Code as action** | the model writes a program that edits files | power and risk of arbitrary code |

Two findings organise the table. **Familiarity beats elegance**: Aider's refactoring benchmark went
from **20%** with search/replace blocks to **61%** with unified diffs, because diffs are what
models have read in training, and "GPT is quantitatively better at code editing when you reduce the
burden of formatting edits" ([Aider 2023](https://aider.chat/2023/12/21/unified-diffs.html)). And
**strictness wins at the frontier**: frontier-oriented harnesses converged on exact unique-substring
replacement, Mistral's harness deleted its fuzzy tool within a quarter, and the census recommends
"match the edit contract to the model tier" — exact for strong models, a fuzzy fallback for weak
ones, and never line numbers.

The deepest version of the finding is that **the right edit format is a property of the model's
training.** OpenAI's guidance for its Codex models: "We strongly recommend using our exact
`apply_patch` implementation as the model has been trained to excel at this diff format"
([OpenAI](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide)). Anthropic's
text-editor tool is the mirror image: "the schema is built into Claude's model and can't be
modified" ([Anthropic docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool)).
Cursor, which serves both, states the consequence plainly: "OpenAI's models are trained to edit files
using a patch-based format, while Anthropic's models are trained on string replacement," so it
provisions a different edit tool per model ([Cursor 2026](https://cursor.com/blog/continually-improving-agent-harness)).

Aider found a second way out: **separate the thinking from the typing.** In its *architect/editor*
mode, one model reasons about the change in prose and a second translates the plan into a precise
edit. An o1-preview architect with a separate editor reached **85%** on Aider's editing benchmark,
and the diagnosis is worth quoting: "The model has to split its attention between solving the coding
problem and conforming to the edit format" ([Aider 2024](https://aider.chat/2024/09/26/architect.html)).

## Tools: sensors and actuators the model cannot see behind

To the model, a tool is its only way to perceive and change the world. If the tool is ambiguous,
verbose or flaky, the model is reasoning about a corrupted reality — and will draw confident,
wrong conclusions from it.

The accumulated design guidance is consistent across sources:

- **Few, well-shaped tools beat many thin ones.** Anthropic advises building "a few thoughtful tools
  targeting specific high-impact workflows" rather than wrapping every API endpoint; Factory's
  Terminal-Bench write-up found "complex tool schemas exponentially increased error rates"
  ([Anthropic 2025](https://www.anthropic.com/engineering/writing-tools-for-agents);
  [Factory 2025](https://factory.com/news/terminal-bench)).
- **Return what the model can act on.** Human-readable names instead of opaque IDs; a
  `response_format` option that let one tool return about a third of the tokens in its concise
  mode; truncation with sensible defaults; and error messages that suggest "specific and actionable
  improvements".
- **Make mistakes impossible rather than discouraged.** Anthropic's own SWE-bench agent kept making
  errors with relative file paths, so the tool was changed to require absolute ones — a
  *poka-yoke*, in manufacturing terms ([Anthropic 2024](https://www.anthropic.com/engineering/building-effective-agents)).
  The team reported it "spent more time optimizing our tools than the overall prompt".
- **Name tools after what the model already knows.** Cursor renamed its search tools towards shell
  equivalents such as `rg` for OpenAI's Codex models, which had been trained to "use the shell to
  search, read files, and make edits" ([Cursor 2025](https://cursor.com/blog/codex-model-harness)).
- **Say something when nothing happened.** SWE-agent replaced empty output with "Your command ran
  successfully and did not produce any output", because silence is ambiguous to a model.

**Reliability is a harness metric.** Cursor's April 2026 write-up is the most rigorous public
account of treating tools as production infrastructure. It classifies every failure — invalid
arguments, unexpected environment, provider error, user abort, timeout — and adopts the rule that
"any unknown error represents a bug in the harness"; it drove tool calls to "at least 2 or often 3
9s of reliability"; and it names the cost of not doing so: errors left in context cause "context
rot," where "accumulated mistakes degrade the quality of the model's subsequent decisions"
([Cursor 2026](https://cursor.com/blog/continually-improving-agent-harness)). The same post describes
the evaluation loop behind it — an internal benchmark plus an online A/B metric, **Keep Rate**, for
how much agent-written code survives in the codebase over time.

**Or let the model write the tool call as code.** CodeAct's alternative to JSON tool schemas is to let
the model act by writing executable Python, which composes, loops and handles errors natively; across
17 models it reported up to **20%** higher success with up to 30% fewer actions
([Wang et al. 2024](https://arxiv.org/abs/2402.01030)). Every harness that gives the model a shell is,
in effect, making the same bet.

## Environments: the part everyone underestimates

A striking share of agent failures have nothing to do with code: the dependency will not install,
the wrong runtime version is on the path, the database is not running, a private package cannot be
fetched, a test needs a browser that is not there. An agent that spends forty turns discovering that
`npm ci` needs Node 20 has failed at environment construction, not at programming.

GitHub's documentation for its cloud agent states the principle as clearly as anyone has. The agent
"can discover and install these dependencies itself via a process of trial and error, but this can be
slow and unreliable, given the non-deterministic nature of large language models," and sometimes
impossible when packages are private; so teams should "deterministically install tools or
dependencies before Copilot starts work", in a setup workflow that runs before the agent does
([GitHub docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/customize-the-agent-environment)).

Every cloud agent converged on the same shape:

<figure class="fig">
<span class="fig-title">Figure 4.2 &#183; How cloud agents make the environment deterministic before the agent starts</span>
<div class="fig-steps">
<div class="fig-step fig-step--hi"><b>1 &#183; Deterministic setup</b><em>A script or workflow the team writes: install runtimes and dependencies, start services. Runs with network access.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>2 &#183; Snapshot</b><em>The prepared machine is cached and reused, so each task starts from a known state.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>3 &#183; Agent phase</b><em>The agent works in the prepared copy, often with network restricted or off.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>4 &#183; Evidence</b><em>Diff, test output, logs, screenshots or video returned with the pull request.</em></div>
</div>
<figcaption>GitHub Copilot: a <code>copilot-setup-steps</code> workflow in ephemeral Actions runners. Codex cloud: a setup script in a <code>universal</code> container image, cached for up to 12 hours, with agent internet access off by default. Cursor: isolated Ubuntu VMs configured by an environment file or snapshot, returning screenshots and video. Devin and Jules: VMs booted from a configured snapshot.</figcaption>
</figure>

Two more pieces of evidence say the environment is not a detail.

**Environments are what training scales with.** Qwen's Terminal-Universe study, which reconstructs
executable workspaces from recorded agent trajectories, found that **the number of distinct
environments** was the only training axis that kept paying: doubling environments improved its
benchmark score from 53.2 to 56.0, while doubling queries or solutions over the same workspaces bought
nothing ([Wu et al. 2026](https://arxiv.org/abs/2609.04148)).

**Harness fixes are often environment fixes.** When Self-Harness let three models rewrite their own
harnesses from their failure traces, many of the accepted edits were about the environment, not the
code: make `PATH` changes and installed tools persist across shell sessions and verify them
afterwards; bound and stage long downloads; precheck imports before use; stop repeating a command
that already failed ([Zhang et al. 2026](https://arxiv.org/abs/2606.09498)). Carlini's C-compiler
agents needed the same kind of fix for a different reason — the model "will happily spend hours
running tests instead of making progress" — solved with a deterministic fast mode that samples 1–10%
of the suite ([Carlini 2026](https://www.anthropic.com/engineering/building-c-compiler)).

## What to carry forward

- **Pick the edit format the model was trained on**, and prefer exact unique replacement over
  forgiving matching for strong models. Never ask a model for line numbers.
- **Design tool output for the reader**: concise, named, truncated, and explicit about empty results
  and about what to do after an error.
- **Measure tool reliability as you would a service's.** An unexplained tool error is a harness bug,
  and every one left in context degrades the next decision.
- **Make the environment deterministic before the agent starts.** Setup is a script, not a task for
  the model.
