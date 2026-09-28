The previous chapters are about why harnesses look the way they do. This one is about what to do on
Monday. It is written for two readers at once — someone building a harness, and someone using one
on a real codebase — because since 2026 those turn out to be the same job. Every recommendation
below is tied to the evidence that justifies it.

## The one habit

If you adopt nothing else, adopt Mitchell Hashimoto's rule: "anytime you find an agent makes a
mistake, you take the time to engineer a solution such that the agent never makes that mistake again"
([Hashimoto 2026](https://mitchellh.com/writing/my-ai-adoption-journey)). That sentence is the whole
of harness engineering as a practice. Everything else is a question of which *kind* of fix to reach
for, and the answer is almost always the strongest one available.

<figure class="fig">
<span class="fig-title">Figure 6.1 &#183; The harness-engineering loop: turn each observed failure into the strongest fix you can</span>
<div class="fig-steps">
<div class="fig-step"><b>Observe</b><em>A failed run, a bad diff, a wasted hour. Read the transcript, not just the outcome.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>Classify</b><em>Did it lack information, a capability, a check, a boundary, or state?</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step fig-step--hi"><b>Fix at the strongest level</b><em>Prose &lt; tool &lt; check &lt; boundary. Prefer a test to a sentence, a sandbox rule to a test.</em></div>
<i class="fig-arr">&#8594;</i>
<div class="fig-step"><b>Verify the fix</b><em>Re-run the failure. Keep the task as a regression case.</em></div>
<i class="fig-arr">&#8634;</i>
<div class="fig-step"><b>Prune</b><em>When the model improves, remove the fixes it no longer needs.</em></div>
</div>
<figcaption>After Hashimoto 2026 and Anthropic&#8217;s &#8220;every component in a harness encodes an assumption&#8221; (Rajasekaran 2026). The strength ordering is ours: each level down the chain depends less on the model choosing to comply.</figcaption>
</figure>

The strength ordering is the useful part. A line in `AGENTS.md` is a request the model can ignore or
forget; a tool the agent can call is a capability it might not use; a check that fails the build is a
fact it cannot argue with; a sandbox boundary makes the mistake impossible. Section after section of
this essay has found the same thing — the fixes that work best are the ones that do not depend on
persuasion.

## 1 · Start with a loop you can read

Build or choose the smallest harness that could work, and make every addition earn its place against
it. [Section 3.1](/post/who-closes-the-loop?section=sec-3-1) gives an eleven-line skeleton; the
independent evidence for starting there is that mini-SWE-agent's ~100-line agent reached 76.8% on
SWE-bench Verified and that the minimal harnesses were the cheapest on both independent cost studies.
Barbaste et al.'s recommendations make it a rule: start with bash alone, add tools "only in response to
observed failures", adopt deferred loading once you pass about fifteen tools, and "stay single-agent
until you can point to a concrete breadth-first exploration phase."

When you add a component, write down the failure it fixes. That list becomes your pruning checklist
when the next model arrives.

| Add… | when you observe… | evidence it helps |
|---|---|---|
| a file viewer / read tool with line windows | the agent dumping whole files into context | SWE-agent: whole-file viewing cost 5.3 points |
| a lint or type check on every edit | syntax errors compounding across turns | SWE-agent: linter-gated edits +3.0 |
| output caps and a "no output" message | logs flooding context; confusion after silent commands | SWE-agent; Claude Code's 25k-token cap |
| compaction that keeps the record | sessions outgrowing the window | Scroll: summarising the record lost 73.1 → 19.9 |
| a progress file and feature list | work spanning sessions | Anthropic long-running harness |
| subagents | breadth-first investigation that floods the main context | Barbaste: coordinator–worker used mainly for exploration |
| an OS sandbox | anything with credentials or network | 84% fewer prompts, and a real boundary |

## 2 · Write the instruction file as a map

OpenAI's team abandoned the encyclopedic `AGENTS.md` for a table of contents of about **100 lines**,
and Codex caps instruction files at 32 KiB by default. A good one answers only the questions an agent
cannot answer by searching, and points to documents for everything else:

```markdown
# AGENTS.md

## Commands
- Install: `pnpm install --frozen-lockfile`   (never npm or yarn)
- Test one package: `pnpm --filter <pkg> test -- <pattern>`
- Full check before finishing: `pnpm check`   (types, lint, architecture rules, tests)

## Layout
- apps/web      UI only. Never imports from packages/db.
- packages/api  The only layer that talks to the database.
- docs/         Architecture (docs/architecture.md), decisions (docs/adr/), plans (docs/plans/).

## Rules that are enforced (the build fails if you break them)
- Layering, via scripts/check-layers.ts
- Public API changes need an ADR in docs/adr/

## Before you say you are done
- Run `pnpm check`. Paste the summary line in your final message.
- If you changed UI, run `pnpm e2e --grep <feature>` and attach the screenshot it writes.
```

Three details are deliberate. Every command is exact, because a wrong guess costs a turn and pollutes
the context. The rules section only lists rules a machine enforces — a rule nobody checks belongs in a
test, not a paragraph. And the file tells the agent what evidence to produce at the end, which is the
cheapest verify-on-stop guard there is.

## 3 · Turn taste into checks

Each time a review comment recurs, ask whether a machine could have made it. OpenAI encoded its
architecture as custom linters and structural tests, and moved from spending "every Friday (20% of
the week) cleaning up 'AI slop'" to recurring clean-up agents guided by encoded "golden principles"
([OpenAI 2026](https://openai.com/index/harness-engineering/)). The reason this matters more with
agents than with people is that agents copy the patterns they find: one inconsistent pattern becomes
fifty.

A structural test does not need a framework. The whole idea fits in a few lines:

```python
# scripts/check_layers.py - fail the build if the UI reaches into the database layer.
import pathlib, re, sys

FORBIDDEN = re.compile(r"from\s+['\"]@acme/db|import\s+.*\bpackages/db\b")
bad = [p for p in pathlib.Path("apps/web").rglob("*.ts*")
       if FORBIDDEN.search(p.read_text(encoding="utf-8"))]
for p in bad:
    print(f"{p}: UI code must not import the db package. Call packages/api instead.")
sys.exit(1 if bad else 0)
```

Note the error message. It does not just say *no*; it says what to do instead. An error written for
an agent is a one-line lesson that arrives exactly when it is needed.

## 4 · Climb the verification ladder mechanically

Give the agent every rung of [figure 4.3a](/post/who-closes-the-loop?section=sec-4-3) that a script
can check, and make the top rungs cheap to reach:

- **One command that runs everything** — types, lint, architecture rules, unit tests — and prints one
  summary line. Make it fast: Carlini's agents needed a sampled "fast" mode because they would
  otherwise run the full suite for hours.
- **A way to see the running software.** A script that starts the app and takes a screenshot, a
  browser automation tool, logs and metrics the agent can query. This is what turned "startup under
  800 ms" into something an agent could verify for itself.
- **Tests the agent cannot edit.** Make them read-only in the sandbox, or verify in a clean checkout.
  The strongest predictor of grader gaming is being able to see and touch the grader.
- **A reviewer that is not the author.** A different model, a fresh context, or a person — and for a
  model reviewer, a protocol that forces it to cite code when it disagrees.

## 5 · Contain before you trust

Decide what the agent must never be able to do, and enforce it below the model:

- **Run in a sandbox** with writes confined to the workspace and network through an allowlist. On
  every major harness this is now a setting, not a project.
- **Keep secrets out of the box.** No production credentials in the agent's environment; let a proxy
  attach them to approved requests if they are needed at all.
- **Write deny rules for what is catastrophic**, and let the sandbox handle what is merely risky. In
  Claude Code's settings the rule syntax looks like this; deny rules hold in every permission mode:

```json
{
  "permissions": {
    "allow": ["Bash(pnpm check)", "Bash(pnpm test *)"],
    "deny":  ["Read(./.env)", "Read(./.env.*)", "Bash(git push *)", "Bash(npm publish *)"]
  }
}
```

- **Never let a repository configure its own trust.** Harness configuration in a cloned project —
  hooks, MCP servers, environment overrides — was the root cause of most 2025–26 harness CVEs.
- **Keep finalisation human** — merge, deploy, publish — until your verifier is better than your
  reviewer.

## 6 · Keep the context honest

- **Pointers in context, content on disk.** Large outputs go to files; the agent reads the part it
  needs.
- **Load on demand.** Skills by description, tools by search, documents by link.
- **Stable prefix.** Nothing volatile at the top of the prompt; tools in a fixed order; append rather
  than rewrite. It is the difference between a 98% cache hit rate and paying full price every turn.
- **Clear the dead.** Stale tool results and failed attempts are not neutral; they are what context
  rot is made of. Start a fresh session with a written hand-off rather than dragging a polluted one
  forward.

## 7 · Design long work as shifts

For anything that will outlive one context window, copy the pattern of
[section 4.4](/post/who-closes-the-loop?section=sec-4-4): a requirements list in a structured file,
every item initially failing; one item per session; a progress file and a commit at the end of each;
and a fresh context at the start of the next that reads the files rather than a summary. It is dull,
and it is the most reliable long-horizon design anyone has published.

## 8 · Parallelise only behind a verifier

Run agents in parallel when each has its own worktree and a check that says whether its piece works —
an oracle, a test suite, a judge. Without one, extra agents mostly produce extra agreement.

## 9 · Measure what you pay for

Track, per week, a handful of numbers that the literature learned to care about: **cost per merged
change** (not per session), **how much agent-written code survives** a month later (Cursor's Keep
Rate), **review rounds per agent PR**, **interventions per task**, and **the tasks that failed**, kept
as a regression suite for your harness. When you change the harness or the model, re-run the suite
before believing the change helped: in HarnessDev, 27 of 64 claimed harness improvements sat inside the
run-to-run noise.

## 10 · Stay the expert

The most consistent finding about people is that agents amplify expertise rather than replace it.
Anthropic's session study found experts got more work done per instruction and succeeded roughly twice
as often as novices; METR's developers felt faster while being slower; and Amdahl's law says the part
of the work only you can do — specifying what is wanted and judging whether it was delivered — bounds
the whole. Spend the time the agent saves you on exactly those two things. They are the part of the
loop that has not moved.
