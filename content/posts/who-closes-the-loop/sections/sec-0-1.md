A coding agent is not a model that writes code. It is a model inside a program that lets it look at
a repository, run commands, read what happened, and decide what to do next — over and over, until the
program decides it is done. That surrounding program is the **harness**. This essay is about the
harness: where it came from, how to reason about it mathematically, what is inside the ones people
actually use, the hard problems each one answers differently, how to measure any of it, and what to do
with all that on a real codebase.

## The argument in one paragraph

Every generation of AI coding tools can be described by one question: **who closes the loop?** — who
looks at the result of an action and chooses the next one. In 2021 the answer was the developer, on
every keystroke. By 2026, for a growing share of work, it is software: the harness observes, decides,
acts, checks and remembers, and the person specifies at the start and judges at the end. As the loop
moved, the hard engineering moved with it — out of the model's weights and into context budgets,
permission gates, sandboxes, verifiers and durable state. That is why the same model can score 35% in
one harness and 50% in another, why one harness can cost five times another at the same success rate,
and why a hundred-line loop can match a million-line product on a benchmark while losing to it on a
Tuesday afternoon in a real repository.

## The whole system in one picture

<figure class="fig">
<span class="fig-title">Figure 0.1 &#183; A coding agent is four things, and only one of them is the model</span>
<div class="fig-stack">
<div class="fig-layer"><b>Human</b><span>States the goal; approves what is out of bounds; judges the result. <em>Loop closure at the start and the end.</em></span></div>
<div class="fig-layer fig-layer--hi"><b>Harness</b><span>Everything the model cannot do without. <span class="fig-tags"><i class="fig-tag">loop</i><i class="fig-tag">context assembly &amp; compaction</i><i class="fig-tag">tools</i><i class="fig-tag">edit format</i><i class="fig-tag">permissions</i><i class="fig-tag">sandbox</i><i class="fig-tag">memory &amp; state</i><i class="fig-tag">subagents</i><i class="fig-tag">verification</i><i class="fig-tag">stopping rule</i><i class="fig-tag">extensions</i><i class="fig-tag">clients</i></span></span></div>
<div class="fig-layer"><b>Model</b><span>Reads a context, proposes the next action. <em>The only non-deterministic step.</em></span></div>
<div class="fig-layer"><b>Environment</b><span>Repository, shell, runtimes, services, network, CI &#8212; and every signal it returns: compiler errors, test results, logs, diffs, screenshots.</span></div>
</div>
<figcaption>Each turn: the harness builds a context &#8594; the model proposes an action &#8594; the harness decides whether it may run &#8594; the environment changes and reports back &#8594; the harness decides what to keep, and whether to stop. Chapter 3 takes this picture apart; chapter 4 goes through its hard problems one by one.</figcaption>
</figure>

## Words this essay uses precisely

- **Agent** — "An LLM agent runs tools in a loop to achieve a goal," in Simon Willison's definition,
  which the field more or less settled on in 2025.
- **Harness** — the model-external software that turns the model's outputs into actions and
  observations, and decides when to stop. A harness with no loop, tools, context policy, state,
  verifier or stopping rule scores zero on every benchmark; whatever has to be added is the harness.
- **Scaffold** — an older word for the same thing, usually a research harness. **Agent–computer
  interface (ACI)** — SWE-agent's 2024 name for the part of the harness the model touches: commands,
  their feedback, and how history is shown.
- **Workflow** vs **agent** — Anthropic's distinction: in a workflow, code fixes the sequence of
  steps; in an agent, the model chooses them.
- **Context engineering** — choosing what the model sees on each call. **Harness engineering** —
  choosing what it can do, what it is prevented from doing, and what tells it when it is wrong.
- **Evaluation harness** — the separate program that decides whether an agent succeeded. It is a
  harness too, and agents have learned to game it (section 4.3).
- **pass@k / pass^k** — the probability that at least one, or all, of $k$ attempts succeed
  (section 2.2).

## How to read it

The sections are written to stand alone, and each ends with what to carry forward. Three routes
through them:

| If you are… | Read | Then |
|---|---|---|
| **new to all of this** | 1.1 and 1.2 (the history), 3.1 (what a harness is) | 4.5 (security), 6.1 (what to do) |
| **a developer using agents** | 3.1, then 4.1 to 4.4 (the hard problems) | 5.2 (choosing a harness), 6.1 |
| **building a harness or evaluating agents** | 2.1 to 2.3 (the models), 3.2 and 3.3 (the internals) | 4.3 (verification), 5.1 (evaluation), 6.2 (open problems) |

## Conventions

- **Dated claims.** This field changes weekly; every number carries its source and, where it
  matters, its date. Sources were checked on 27 September 2026. Inventory claims — how many tools a
  harness has, which flag is on — go stale in weeks; structural claims have so far held for years.
  Trust the shape; date the numbers.
- **Vendor claims are labelled as such.** Productivity multipliers, adoption figures and
  "percentage of code written by AI" come from the companies selling the tools, and are reported as
  claims.
- **Model names are as the sources give them**, including 2026 models whose details are not public.
- **Figures are drawn from the cited data**; illustrative models are labelled as illustrative.
- **Our own framings** — the loop-length lens, the verification ladder, the crutch/infrastructure
  distinction — are marked as ours where they appear.
- The full bibliography, grouped by topic, is in the [references](/post/who-closes-the-loop?section=sec-7-1).
  The earlier, narrower companion piece on harness cost is [The Harness Tax](/post/the-harness-tax).
