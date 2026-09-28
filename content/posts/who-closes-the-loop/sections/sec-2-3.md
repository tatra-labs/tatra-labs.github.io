An agent's bill is not paid for thinking. It is paid for **reading** — the same prefix, again and
again, once per turn. Once you write down how the tokens accumulate, most of the harness's
context machinery stops looking like optimisation and starts looking like survival.

## How a session's tokens accumulate

A model API is stateless: every call re-sends the whole conversation. Let a harness open each
request with a fixed prefix of $P$ tokens — system prompt, tool schemas, instruction files —
and let turn $t$ add $o_t$ new tokens to the history: the model's reply plus the tool output it
triggered. The input at turn $t$ is everything so far:

$$
I_t = P + \sum_{s<t} o_s
$$

Over a session of $T$ turns with an average of $\bar o$ tokens added per turn, total input is

$$
\sum_{t=1}^{T} I_t = T P + \bar o \cdot \frac{T(T-1)}{2}
$$

Two terms, and each explains a different part of harness design.

**The first term is linear in turns and multiplied by the prefix.** Every tool schema, every
line of system prompt, every eagerly loaded instruction file is paid for $T$ times. The
[HarnessTax](/post/the-harness-tax) measurements make this concrete. On SWE-bench Lite, Claude
Code's first model call carries **27,011** tokens against Pi's **1,972**, and with Claude Fable 5
the two take almost the same number of turns per attempt, **15.3** and **15.4**. Multiply
through and the prefix alone is roughly **413,000** tokens per attempt in one harness and
**30,000** in the other — the arithmetic behind a doubled bill for the same success rate.

**The second term is quadratic in turns.** Doubling the length of a session roughly quadruples
what it costs to keep re-reading its own history. That is the pressure behind every mechanism
that shortens the history the model re-reads — collapsing old observations, capping tool
results, compaction, and handing a sub-investigation to a subagent that returns a summary
instead of its transcript.

## Caching changes the constant, not the shape

Prompt caching lets a provider skip recomputation for a prefix it has seen before, and bills
those tokens at a steep discount — on Anthropic's API a cache read is priced at a tenth of the
base input rate. With a discount factor $c$ on cached tokens, and only the newest $o_t$ tokens
uncached each turn, the cost of a session at input price $p$ becomes, approximately:

$$
\text{cost} \approx p \left[ c \left( T P + \bar o \cdot \frac{T(T-1)}{2} \right) + T \bar o \right]
$$

The quadratic term survives, scaled down by $c$. So does the harness's incentive to keep its
prefix **byte-stable**: anything that changes early in the request — a timestamp in the system
prompt, a reordered tool list, a re-summarised history — invalidates the cache for everything
after it. An independent measurement found **98%** of Claude Code's input served from cache on
a fixed task ([Alier et al. 2026](https://github.com/Lamb-Project/mcp-vs-cli-bench)). The same
authors' own eight-day Claude Code session to run that study read **1.61 billion** tokens from
cache and only **6,805** uncached input tokens in total. That is what a harness engineered
around cache stability looks like from the meter.

## Reading, not writing

The same study measured the ratio that should reset anyone's cost intuitions: over those eight
days, **input exceeded output by 437 to 1**. Across the seven harnesses they compared on one
task, output ranged only from **824 to 1,367** tokens per run, while input spanned a factor of
**20**. Output's share of the modelled cost ran from about a quarter on the thinnest harnesses
down to **under 3%** on the heaviest.

The practical consequence is blunt. Asking an agent to be terse addresses at most a quarter of
the bill, and on a heavy harness under a fiftieth of it. The money is in what the harness makes
the model re-read.

## Failure is the expensive outcome

Cost per attempt is the wrong unit. If an attempt costs $C$ and succeeds with probability $p$,
then retrying until success costs, in expectation,

$$
\mathbb E[\text{cost per solved task}] = \frac{C}{p}
$$

and the attempts themselves are not equally priced: failing runs are longer. In SWE-agent's
2024 study, resolved issues finished at around **$1.21** and **12 steps**, unresolved ones at
around **$2.52** and **21 steps** — agents succeed quickly and fail slowly. In Alier et al.'s
2026 matrix, the median failed run consumed **170,937** input tokens against **83,600** for a
completed one: twice the spend for nothing delivered.

That is why the two most useful cost metrics in the 2026 literature are **cost per resolved
task** and **cost computed only over completed runs**, never cost per attempt. It is also why a
cheap harness that fails more often is not cheap.

## The window is not the budget

A second constraint sits on top of price. Models do not use every position of a long context
equally well. The canonical demonstration is *Lost in the Middle*
([Liu et al., TACL 2024](https://arxiv.org/abs/2307.03172)): accuracy on multi-document
question answering follows a **U-shaped curve**, best when the relevant passage is at the start
or the end of the context and worst when it is buried in the middle. Later work on effective
context length — [RULER](https://arxiv.org/abs/2404.06654) among it — found that the length at
which a model still performs well is typically far shorter than the length it accepts.
Anthropic's context-engineering guidance calls the practical consequence **context rot**: as a
window fills, the model's ability to recall and use what is in it degrades, so context has to be
treated as "a finite resource with diminishing marginal returns"
([Anthropic 2025](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)).

For an agent, this turns the cost model into a quality model as well. The quadratic history
term is not only money; it is irrelevant text — dead-end hypotheses, superseded file versions,
a 3,000-line test log from turn four — sitting between the model and the facts it needs now.
SWE-agent measured the effect in 2024: keeping full history instead of collapsing everything
older than the last five observations cost **3.0 points** on SWE-bench Lite. More context was
worse context.

## Three rules the arithmetic implies

<figure class="fig">
<span class="fig-title">Figure 2.3 &#183; What the cost model says a harness must do</span>
<div class="fig-grid">
<span class="fig-cell fig-cell--hd">Term</span>
<span class="fig-cell fig-cell--hd">Pressure</span>
<span class="fig-cell fig-cell--hd">Harness response</span>
<span class="fig-cell fig-cell--row">$T P$ &#8212; the prefix, paid every turn</span>
<span class="fig-cell"><b>Keep the prefix small</b><em>every schema and instruction is multiplied by the turn count</em></span>
<span class="fig-cell fig-cell--alt"><b>Load lazily</b><em>deferred tool schemas, skills that load a one-line description first, instruction files read on demand</em></span>
<span class="fig-cell fig-cell--row">$\bar o T^2 / 2$ &#8212; the growing history</span>
<span class="fig-cell"><b>Keep the history short</b><em>cost and distraction both grow with it</em></span>
<span class="fig-cell fig-cell--alt"><b>Compact and delegate</b><em>cap tool output, collapse old turns, summarise, send side-quests to a subagent that returns a summary</em></span>
<span class="fig-cell fig-cell--row">$c$ &#8212; the cache discount</span>
<span class="fig-cell"><b>Keep the prefix stable</b><em>any early change invalidates everything after it</em></span>
<span class="fig-cell fig-cell--alt"><b>Append, never rewrite</b><em>stable tool order, no volatile values in the system prompt, append-only transcripts</em></span>
</div>
<figcaption>The three terms of the session cost model, and the family of mechanisms each one produced. Section 4.1 shows how differently individual harnesses implement them.</figcaption>
</figure>

None of these rules is specific to one vendor, and none depends on how smart the model is.
They fall out of two facts: the API is stateless, and attention is not free. Every harness in
[Part II](/post/who-closes-the-loop?section=sec-3-1) is an answer to them.
