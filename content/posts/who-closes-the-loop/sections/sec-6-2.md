It would be easy to end with a list of things agents cannot yet do. A more useful ending is a
distinction the evidence has been pointing at throughout — between two kinds of harness code, which
are heading in opposite directions — followed by the problems that distinction leaves open.

## Two kinds of harness code

The field has two stories about the harness that seem to contradict each other. The first says the
harness is **shrinking**: a two-tool scaffold matched elaborate systems in 2024, a hundred-line bash
loop came within five points of the leaderboard's best in 2025, and Anthropic's engineers routinely
delete components when a new model makes them unnecessary. The second says the harness is
**growing**: Codex CLI nearly doubled to 1.1 million lines of Rust in one quarter, about 98% of Claude
Code is deterministic infrastructure, and the major products ship more machinery every month.

Both stories are true, because they are about different code.

<figure class="fig">
<span class="fig-title">Figure 6.2 &#183; Crutches and infrastructure: two kinds of harness code, heading in opposite directions</span>
<div class="fig-grid">
<span class="fig-cell fig-cell--hd"></span>
<span class="fig-cell fig-cell--hd">Crutches</span>
<span class="fig-cell fig-cell--hd">Infrastructure</span>
<span class="fig-cell fig-cell--row">What it does</span>
<span class="fig-cell"><b>Compensates for what the model cannot yet do</b><em>forgiving edit matching, hand-written decomposition, context resets for &#8220;context anxiety&#8221;, precomputed repository maps, step-by-step prompts</em></span>
<span class="fig-cell fig-cell--alt"><b>Provides what no model can provide for itself</b><em>sandboxes, credentials, permissions, durable state, verification, deterministic environments, clients, protocols, audit logs</em></span>
<span class="fig-cell fig-cell--row">As models improve</span>
<span class="fig-cell"><b>Goes stale, then becomes harmful</b><em>&#8220;these shortcuts will bottleneck further improvement&#8221;</em></span>
<span class="fig-cell fig-cell--alt"><b>Matters more</b><em>a more capable agent acts longer, with more power, on more valuable systems</em></span>
<span class="fig-cell fig-cell--row">Right policy</span>
<span class="fig-cell"><b>Add reluctantly; date it; delete it</b></span>
<span class="fig-cell fig-cell--alt"><b>Engineer it like any production system</b></span>
</div>
<figcaption>Our synthesis. The bitter lesson applies to the left column and not to the right one: no amount of model capability supplies a sandbox, a clean grader or yesterday&#8217;s state from inside the weights.</figcaption>
</figure>

The distinction resolves most of the apparent disagreements in this essay. Minimal harnesses win the
cost studies because short, well-specified benchmark tasks exercise almost none of the
infrastructure column. Production harnesses grow because real work exercises all of it. And the
bitter lesson — Sutton's observation that general methods riding on computation beat hand-built
knowledge — is a law about crutches. It says nothing against sandboxes.

What remains open is almost entirely in the right-hand column.

## Open problem 1 · State that outlives a session

Every source that looked found the same gap. HarnessDev's generated harnesses almost never built
persistence — one in eighteen exposed a way to save state, and no checkpoint event occurred in 26,679
trajectories. Barbaste et al. found memory is where production systems now differ most, with four
competing models of who may write it. Scroll showed that summarising history at the wrong moment
destroys most of its value. And the unreleased features in Claude Code's source — a background daemon,
idle-time memory consolidation — point at the same frontier. **Nobody yet knows the right memory
architecture for an agent that works on one codebase for months.**

## Open problem 2 · Verification beyond the tests

Maintainers would merge only about half the patches a grader accepted; OpenAI found most remaining
failures on the most-used benchmark were flaws in the tests themselves. Agents have been caught
editing tests, forging checksums and reading the answer from git history. The engineering fixes —
graders outside the sandbox, read-only tests, clean-room replay — close the loopholes but not the gap
between *tests pass* and *this is the change we wanted*. Behavioural checks, architecture rules and
independent model reviewers each cover part of it. **A verifier that reliably judges "a maintainer
would merge this" does not exist**, and it is the component whose absence most limits how far the
loop can safely extend.

## Open problem 3 · Prompt injection

The environment is the adversary's channel, and the defences are rates, not guarantees: twelve
published defences broken at over 90% attack success in one joint study; a frontier model at 0.1% per
attempt but 5–6% after a hundred adaptive tries. Designs that offer guarantees, such as CaMeL's
separation of control flow from data flow, cost capability and have not been adopted by any
general-purpose coding harness. Until they are, the answer is containment — and containment works only
as long as the agent does not need all three legs of the trifecta at once, which the most useful agents
increasingly do.

## Open problem 4 · Coordination

Parallel agents work when a verifier arbitrates — a GCC oracle, a judge, a verified score — and fail in
recognisably organisational ways when one does not: held locks, avoided hard tasks, false consensus.
Most production multi-agent use is still breadth-first exploration by subagents, not parallel
implementation. **How to decompose a real software project for many agents, and how to merge their
work, is an open research problem** that looks more like distributed systems and management science
than like prompting.

## Open problem 5 · Portable, self-improving harnesses

Harness tuning does not transfer across models: a harness fitted to one executor lost half its score
under another. Harnesses that improve themselves from their own failure traces show real gains —
Self-Harness lifted held-out Terminal-Bench pass rates by up to 21 points — but HarnessDev's controlled
version found feedback gains shrinking to one to four points on held-out tasks, and creators choosing
their held-out-best version only 2 times in 9. The research question is whether harness improvement
can be made to **generalise**, or whether every model release restarts the tuning. The safety
question is sharper: a harness that edits its own permission policy under a pass-rate gate is
optimising a channel it controls.

## Open problem 6 · Evaluation that matches the work

No public study yet compares the major harnesses on long, realistic tasks in real repositories, with
cost, quality and human interventions measured together. Benchmarks for the harness itself appeared
only in 2026. Leaderboards still rarely name the harness, report run-to-run noise or give cost per
solved task. [Section 5.1](/post/who-closes-the-loop?section=sec-5-1)'s rubric is not hard to meet;
it is simply not yet the norm.

## Open problem 7 · Entropy

Agents copy what they find, at a speed no team can review. OpenAI's team spent a fifth of every week
cleaning up "AI slop" before automating the clean-up; a study of repositories adopting Cursor reported
code complexity rising by **40.7%**, as cited by Liu et al.; and METR's merge-rate data suggests code
quality is improving more slowly than test pass rates. A harness that increases throughput without a
matching mechanism for keeping the codebase coherent is borrowing against the future. **Architecture
as executable constraint** — linters, structural tests, golden principles enforced by recurring agents
— is the best current answer, and it is young.

## Open problem 8 · The people in the loop

A randomised study of 52 developers learning an unfamiliar library found those using an AI assistant
scored **17%** lower on a quiz about concepts they had used minutes earlier, without a significant gain
in speed — and that the ones who retained the most used the assistant to ask for explanations rather
than only for code ([Shen and Tamkin 2026](https://arxiv.org/abs/2601.20245)). Anthropic's own session
data shows expertise is what makes delegation work. If agents do most of the execution, the question is
how anyone becomes the expert whose specifications and judgment the loop depends on. Liu et al. end
their study of Claude Code by suggesting that future harnesses could treat preserving long-term human
capability as a design goal in its own right. No harness yet does.

## Where this leaves the question in the title

For fifty years, a person closed the loop of software development at every step. Now, for a growing
share of the work, a harness closes it at every step but two: deciding what is wanted, and judging
whether it was delivered. The evidence of 2024–26 says those two are not the residue of automation
that has not happened yet. They are the parts that make the rest of the loop worth running — and the
harness engineering that matters most from here is the kind that makes them easier for people to do
well.
