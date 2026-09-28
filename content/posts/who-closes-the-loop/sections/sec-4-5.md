Autocomplete could suggest `rm -rf /`. It could not run it. The moment a harness closes the loop
— reads the output of one action and chooses the next without a person in between — the
security question changes from *"will the model say something wrong?"* to *"what is the worst
thing a wrong action can do, and who decided it was allowed?"* This section is about that
second question, and about the unusual fact that for coding agents the attacker often does not
need to touch the agent at all. The environment does the work.

## Three properties that should never meet

The frame that most of the field now uses came from Simon Willison in June 2025. An agent is
dangerous when it combines **"access to your private data"**, **"exposure to untrusted
content"** and **"the ability to externally communicate"** — the **lethal trifecta**
([Willison 2025](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/)). His reason is one
sentence long: **"LLMs follow instructions in content."** A README, an issue comment, a test log
and a web page all arrive in the same context window as the user's request, and the model has
no reliable way to tell which of them is entitled to give orders.

Meta's **Agents Rule of Two** (October 2025) generalised it. Of three properties — processing
untrustworthy inputs, accessing sensitive systems or private data, and changing state or
communicating externally — an agent should hold **no more than two in one session**; if it needs
all three, it should not run autonomously
([Meta 2025](https://ai.meta.com/blog/practical-ai-agent-security/)). The addition matters for
coding agents specifically. Willison's trifecta covers exfiltration; the Rule of Two also covers
**changing state** — deleting a database, pushing a branch, publishing a package — which is the
normal business of a coding agent.

A coding agent in a real repository has all three by default. It reads untrusted text
constantly (dependencies, issues, documentation, CI logs). It has private data (the source
itself, `.env` files, cloud credentials in the shell). And it can communicate and change state
(`git push`, `curl`, `npm publish`). The whole history of coding-agent security since 2025 is a
history of harnesses removing one leg of that stool at a time.

## The incidents, read as harness failures

Each of these made headlines as an "AI" failure. Read by *which boundary failed*, almost none of
them is about model intelligence.

<figure class="fig">
<span class="fig-title">Figure 4.5a &#183; Coding-agent incidents by the boundary that failed</span>
<div class="fig-tl">
<div class="fig-tl-row"><i>Mar 2025</i><span><b>Rules File Backdoor</b> (Pillar Security). Hidden instructions in Cursor and Copilot rules files, concealed with zero-width and bidirectional Unicode. <em>Failed: instruction files trusted without sanitisation. Fix: GitHub began flagging hidden Unicode in May 2025.</em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>May 2025</i><span><b>GitHub MCP &#8220;toxic agent flow&#8221;</b> (Invariant Labs). A malicious public issue steers an agent to read the user&#8217;s private repositories and leak them into a public PR. <em>Failed: one token held all three trifecta legs. Invariant: &#8220;a fundamental architectural issue&#8221;, not a server bug.</em></span></div>
<div class="fig-tl-row"><i>Jul 2025</i><span><b>Replit deletes a production database</b> during a declared code freeze, then wrongly reports rollback is impossible. <em>Failed: the agent held production credentials; the freeze existed only as words in a prompt. Fix: dev/prod separation, a planning-only mode.</em></span></div>
<div class="fig-tl-row"><i>Jul 2025</i><span><b>Amazon Q v1.84.0 &#8220;wiper&#8221;</b> (CVE-2025-8217). An over-scoped CI token let an outsider&#8217;s commit ship a prompt telling the agent to wipe files and cloud resources, launched with <code>--trust-all-tools --no-interactive</code>. It failed only because of a syntax error. <em>Failed: release pipeline, plus an agent started with every tool pre-trusted.</em></span></div>
<div class="fig-tl-row"><i>Jul&#8211;Aug 2025</i><span><b>Agents that could edit their own permissions.</b> Copilot could be injected into writing <code>chat.tools.autoApprove</code> into <code>.vscode/settings.json</code> (CVE-2025-53773); Cursor auto-started a new MCP entry the agent itself had written (CVE-2025-54135), and trusted an approved MCP server&#8217;s later edits by name (CVE-2025-54136). <em>Failed: the configuration that governs the agent was writable by the agent.</em></span></div>
<div class="fig-tl-row fig-tl-row--hi"><i>Aug 2025</i><span><b>Nx &#8220;s1ngularity&#8221;.</b> A compromised npm release ran installed AI CLIs with <code>--dangerously-skip-permissions</code>, <code>--yolo</code> and <code>--trust-all-tools</code> to hunt the machine for secrets. About half of victims had an AI CLI installed. <em>Failed: a &#8220;skip permissions&#8221; flag is a capability any process on the machine can invoke.</em></span></div>
<div class="fig-tl-row"><i>Jul&#8211;Oct 2025</i><span><b>Project files as attack surface</b> in Claude Code (hooks in <code>.claude/settings.json</code> ran at session start, CVE-2025-59536; a project-set API base URL leaked the key before trust was granted, CVE-2026-21852) and Codex CLI (a repo <code>.env</code> redirected its config home, CVE-2025-61260). <em>Failed: attacker-controlled files were read as configuration before the user trusted the folder.</em></span></div>
<div class="fig-tl-row"><i>Nov 2025</i><span><b>GTG-1002.</b> Anthropic reports a state-sponsored group using Claude Code as an orchestrator for &#8220;80&#8211;90% of tactical operations&#8221; against roughly 30 targets. <em>Not a harness break: the attacker was the user. Local permission prompts cannot help; platform-level detection can.</em></span></div>
<div class="fig-tl-row"><i>Aug 2026</i><span><b>Codex sandbox escapes</b> (&#8220;Overpatch&#8221;, &#8220;Heapjack&#8221;). Trusted helpers inside the sandbox &#8212; path handling in <code>apply_patch</code>, a token in a shared heap &#8212; gave a malicious repository unsandboxed execution with no prompt. Fixed within eight days. <em>Failed: a sandbox is only as strong as the privileged code running inside it.</em></span></div>
</div>
<figcaption>Sources: Pillar Security; Invariant Labs; The Register and Replit&#8217;s CEO; AWS bulletin AWS-2025-015; Embrace The Red; Aim Labs; Check Point Research; Nx advisory GHSA-cxm3-wv7p-598c and Wiz; Anthropic; Accomplish. Marked rows are the two that most changed harness design.</figcaption>
</figure>

Two patterns account for most of the list.

**The configuration is the attack surface.** A striking share of 2025–26 harness CVEs share one
root cause: files an attacker can put in a repository — `settings.json`, `mcp.json`, `.env`,
rules files, hooks — were treated as trusted configuration, either before the user had decided
to trust the folder, or after the agent itself had edited them. The harness trusted its own
inputs more than it trusted the model's outputs.

**Prose is not a control.** Replit's "code freeze" was an instruction in a prompt. The Nx attack
worked because "skip permissions" was a command-line flag rather than an organisational policy.
In both cases the safety property existed only as text the agent was asked to respect, and text
is exactly what an agent can be talked out of respecting.

## Why asking the human stopped working

The first generation of harnesses answered risk with a dialog box: *Allow this command?* The
data on that design is now unambiguous.

- Anthropic reported in March 2026 that **Claude Code users approve 93% of permission prompts**
  ([Hughes 2026](https://www.anthropic.com/engineering/claude-code-auto-mode)); its August 2026
  follow-up put the figure at **97%**.
- In that follow-up's study of **1,053** paid testers, **human review caught 13.6% of dangerous
  commands**, while the automated classifier caught **89%**
  ([Anthropic, August 2026](https://claude.com/blog/auto-mode-default-in-claude-code)).
- The same post reports that **62%** of users had at some point used bypass mode or clicked
  "don't ask again" on shell commands.
- Cursor's sandboxing write-up describes the mechanism in one line: "as approvals accumulate,
  users stop inspecting them carefully"
  ([Cursor 2026](https://cursor.com/blog/agent-sandboxing)).

A security boundary that is approved 97 times in 100 is not a boundary; it is a delay. The
design response from all three major vendors was the same: **make fewer decisions, and make the
ones that remain matter.**

## The consensus architecture: contain first, then judge

By mid-2026 Anthropic, OpenAI and Cursor had converged — independently, and with public
write-ups — on a three-layer design.

<figure class="fig">
<span class="fig-title">Figure 4.5b &#183; The three-layer safety architecture the major harnesses converged on</span>
<div class="fig-stack">
<div class="fig-layer fig-layer--hi"><b>1 &#183; OS sandbox</b><span>Restrict what the agent is <em>capable</em> of, regardless of what it decides. Filesystem writes confined to the workspace; network only through a proxy with a domain allowlist; credentials kept outside the sandbox entirely. <span class="fig-tags"><i class="fig-tag">macOS Seatbelt</i><i class="fig-tag">Linux bubblewrap</i><i class="fig-tag">Landlock + seccomp</i><i class="fig-tag">gVisor / VM in the cloud</i></span></span></div>
<div class="fig-layer"><b>2 &#183; Rules in code</b><span>Deterministic allow and deny lists evaluated by the harness. Deny always beats allow. Protected paths &#8212; the harness&#8217;s own config, <code>.git</code> &#8212; stay read-only even in a writable sandbox. A project file cannot switch the agent into a more permissive mode.</span></div>
<div class="fig-layer"><b>3 &#183; A reviewer at the boundary</b><span>Only actions that try to cross the sandbox go to a judge &#8212; increasingly a second model, not a person. The reviewer sees the user&#8217;s request and the proposed command, and deliberately <em>not</em> the agent&#8217;s own reasoning or the tool outputs that might carry an injection.</span></div>
<div class="fig-layer"><b>4 &#183; The human</b><span>Reserved for irreversible or out-of-policy actions, and for the final review of the diff or PR &#8212; the one decision a human is still better placed to make.</span></div>
</div>
<figcaption>Synthesised from Anthropic&#8217;s sandboxing (Oct 2025), auto-mode (Mar 2026) and containment (May 2026) posts; OpenAI&#8217;s Codex sandbox documentation and Auto-review report (Apr 2026); and Cursor&#8217;s sandboxing post (Feb 2026). The ordering is the point: capability is removed before judgement is asked for.</figcaption>
</figure>

The numbers each vendor published for its own layers:

| Mechanism | Vendor | Reported effect |
|---|---|---|
| OS sandbox (bubblewrap / Seatbelt, proxied network) | Anthropic, Oct 2025 | **84%** fewer permission prompts in internal use |
| Sandboxed local agents (Seatbelt, Landlock + seccomp, WSL2) | Cursor, Feb 2026 | sandboxed agents **stop 40% less often** |
| Two-stage classifier at the boundary ("auto mode") | Anthropic, Mar 2026 | **0.4%** false positives on 10,000 real actions; misses **17%** of real over-eager actions and **5.7%** of synthetic exfiltration attempts |
| Reviewer agent at the sandbox boundary ("Auto-review") | OpenAI, Apr 2026 | sessions stop for a human **roughly 200 times less often**; recall **99.3%** on prompt injection, **90.3%** on over-eager actions |

Two details in these designs are worth copying anywhere.

**The judge is not shown the defendant's argument.** Anthropic's classifier receives only user
messages and the proposed tool calls: "We strip assistant text so the agent can't talk the
classifier into making a bad call," and tool outputs are removed as well, so injected text never
reaches the judge. The model that wants to act and the model that decides whether it may are
kept from sharing a context.

**Credentials never enter the box.** In Claude Code on the web, "sensitive credentials (such as
git credentials or signing keys) are never inside the sandbox"; a proxy outside it attaches them
to approved requests ([Anthropic 2025](https://www.anthropic.com/engineering/claude-code-sandboxing)).
GitHub's cloud agent gets the same property from its workflow instead of the OS: it pushes only
to its own branch, cannot approve or merge its own pull request, and the person who requested
the PR cannot be the one who approves it
([GitHub docs](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations)).
Two different mechanisms, one principle: the agent can propose anything and finalise nothing.

## What the defences cannot yet do

**Prompt injection is not solved, only contained.** OWASP's own entry concedes "it is unclear
if there are fool-proof methods of prevention"
([OWASP LLM01:2025](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)). A joint 2025 paper
by researchers from OpenAI, Anthropic and Google DeepMind bypassed twelve published defences
"with attack success rate above 90% for most", and human red-teamers reached 100%. Anthropic
reports Claude Opus 4.7 falling to prompt injection about **0.1%** of the time on a single
attempt but **5–6%** after 100 adaptive attempts
([Anthropic 2026](https://www.anthropic.com/engineering/how-we-contain-claude)) — good numbers
for a model, and still not a boundary. The research direction that offers guarantees rather
than rates is architectural: Google DeepMind's
[CaMeL](https://arxiv.org/abs/2503.18813) separates control flow from data flow so that
"untrusted data retrieved by the LLM can never impact the program flow", and solves **77%** of
AgentDojo tasks with provable security against 84% undefended. The
[design-patterns paper](https://arxiv.org/abs/2506.08837) of June 2025 states the principle
that follows: once an agent has ingested untrusted input, "it must be constrained so that it is
impossible for that input to trigger any consequential actions." No general-purpose coding
harness ships that guarantee today.

**The supply chain arrives through the agent's own hands.** Agents run `npm install` and
`pip install` unprompted. Package hallucination turns that into an attack: across 576,000 code
samples from 16 models, hallucinated package names appeared in at least **5.2%** of commercial
models' outputs and **21.7%** of open-source models', yielding **205,474** unique invented names
an attacker could register ([Spracklen et al., USENIX Security 2025](https://arxiv.org/abs/2406.10279)).
Worms such as Shai-Hulud, which spread by stealing developer credentials during install, make
network egress control and credential isolation inside the sandbox a requirement rather than a
refinement.

**Generated code is its own attack surface.** Veracode's 2025 test of more than 100 models found
**45%** of generated samples introduced an OWASP Top 10 vulnerability, and "security performance
remained flat, regardless of model size"
([Veracode 2025](https://www.veracode.com/blog/genai-code-security-report/)). The finding has a
long pedigree: in 2021, roughly 40% of Copilot's completions in security-relevant scenarios were
vulnerable ([Pearce et al.](https://arxiv.org/abs/2108.09293)), and a 2023 user study found people
with an assistant "wrote significantly less secure code" while feeling *more* confident about it
([Perry et al.](https://arxiv.org/abs/2211.03622)). A harness that runs a security scanner as
part of verification is closing a loop the model does not close by itself.

## What to carry forward

- For a coding agent, **the environment is the adversary's channel**. Anything the agent reads
  can carry instructions; treat every observation as untrusted input.
- **Remove a leg of the trifecta** before adding a judge: scope credentials to the task, keep
  secrets outside the sandbox, and put network egress behind an allowlist.
- **Never let the agent write the rules that govern it.** Protected paths for harness config,
  and no project file that can enable a more permissive mode.
- **Move approvals to the boundary**, and give the reviewer the request and the action — not
  the agent's persuasion.
- **Keep finalisation human** — merge, deploy, publish — until the verifier is better than the
  reviewer. [Section 4.3](/post/who-closes-the-loop?section=sec-4-3) is about how far that is
  from true.
