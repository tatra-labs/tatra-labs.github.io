Every source cited in the essay, grouped by topic, with one line on why it matters. Links were checked
on 27 September 2026. Where a vendor page could not be read directly, the claim in the essay was
cross-checked against at least one independent report. Preprints are labelled as such; several 2026
papers had not been peer-reviewed at the time of writing.

## Start here: ten sources that carry most of the argument

1. **Yang et al. (2024). [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/abs/2405.15793).** NeurIPS 2024. — The first ablation evidence that the harness moves results with the model held fixed.
2. **Xia et al. (2024). [Agentless: Demystifying LLM-based Software Engineering Agents](https://arxiv.org/abs/2407.01489).** — The case that a fixed pipeline can beat an agent loop.
3. **Anthropic (2024). [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents).** — The workflow-versus-agent vocabulary, and "optimize the tools, not the prompt".
4. **Anthropic (2025). [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents).** — Context rot, just-in-time retrieval, compaction, subagents.
5. **OpenAI (2026). [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/).** — A million lines with no hand-written code; the repository as system of record.
6. **Liu, Zhao, Shang and Shen (2026). [Dive into Claude Code](https://arxiv.org/abs/2604.14228).** Preprint. — The source-level anatomy of the most-used closed harness.
7. **Barbaste, Darrigol, Vu and Wiltberger (2026). [Harness Engineering: Anatomy, Architecture, and Evolution of Coding Agents — A Source-Code Study of Eleven Systems](https://arxiv.org/abs/2609.00006).** Preprint. — The cross-system census: no frameworks, no code embeddings, the platform turn.
8. **Wu et al. (2026). [HarnessDev: Can LLMs Create and Evolve Their Own Agent Harness?](https://arxiv.org/abs/2609.01437).** Preprint. — Same model, 35.2% vs 49.6% by harness; what models can and cannot build.
9. **METR (2026). [Many SWE-bench-passing PRs would not be merged into main](https://metr.org/notes/2026-03-10-many-swe-bench-passing-prs-would-not-be-merged-into-main/).** — Tests pass; maintainers merge about half.
10. **Böckeler (2026). [Harness engineering for coding agent users](https://martinfowler.com/articles/harness-engineering.html).** martinfowler.com. — Guides and sensors, computational and inferential.

## Studies of harnesses

- **Alier Forment et al. (2026). [The Scaffolding Matters More Than the Interface](https://github.com/Lamb-Project/mcp-vs-cli-bench)** (code and data; Zenodo DOI 10.5281/zenodo.21851992). Preprint. — A 20× token spread across seven harnesses on one task; MCP vs CLI inconclusive.
- **Rombaut (2026). [Inside the Scaffold: A Source-Code Taxonomy of Coding Agent Architectures](https://arxiv.org/abs/2604.03515).** Preprint. — Thirteen open scaffolds; loops compose five primitives.
- **Galster et al. (2026). [Harness Engineering for Agentic AI Coding Tools: An Exploratory Study](https://arxiv.org/abs/2602.14690).** Preprint. — What 2,853 repositories actually configure: mostly context files.
- **Zhang et al. (2026). [Self-Harness: Harnesses That Improve Themselves](https://arxiv.org/abs/2606.09498).** Preprint. — Model-specific, regression-gated harness edits from failure traces.
- **Lin et al. (2026). [Agentic Harness Engineering](https://arxiv.org/abs/2604.25850).** Preprint. — Observability-driven automatic harness evolution; gains from tools, middleware and memory rather than the prompt.
- **Fan et al. (2026). [An Empirical Study of Harness Design for Coding Agents](https://arxiv.org/abs/2609.20804).** Preprint. — 176 configurations; planning helps weaker models, bash-only is efficient for strong ones.
- **Vats and Golev (2026). [The Scaffold Effect in Coding Agents](https://arxiv.org/abs/2607.22585).** Preprint. — Up to 40× spread in tokens per solved task at similar pass rates.
- **Guo et al. (2026). [From Question Answering to Task Completion: A Survey on Agent System and Harness Design](https://arxiv.org/abs/2606.20683).** Preprint survey.
- **Tatra Labs (2026). [The Harness Tax](/post/the-harness-tax).** — Our write-up of the HarnessTax study ([harnesstax.github.io](https://harnesstax.github.io/)): harness choice moves cost 2–5× at similar success.

## History and foundations

- **Le Goues, Nguyen, Forrest and Weimer (2012). [GenProg: A Generic Method for Automatic Software Repair](https://doi.org/10.1109/TSE.2011.104).** IEEE TSE. — Generate-and-validate repair.
- **Qi, Long, Achour and Rinard (2015). [An analysis of patch plausibility and correctness for generate-and-validate patch generation systems](https://doi.org/10.1145/2771783.2771791).** ISSTA. — Most "passing" repairs deleted functionality.
- **Chen et al. (2021). [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374).** — Codex, HumanEval and the pass@k estimator.
- **Peng et al. (2023). [The Impact of AI on Developer Productivity: Evidence from GitHub Copilot](https://arxiv.org/abs/2302.06590).** — 55.8% faster on a controlled task.
- **Li et al. (2022). [Competition-Level Code Generation with AlphaCode](https://arxiv.org/abs/2203.07814).** *Science*. — Sample, filter, cluster. **Google DeepMind (2023). [AlphaCode 2 Technical Report](https://storage.googleapis.com/deepmind-media/AlphaCode2/AlphaCode2_Tech_Report.pdf).**
- **Yao et al. (2022). [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629).** ICLR 2023. — The loop every harness descends from.
- **Schick et al. (2023). [Toolformer](https://arxiv.org/abs/2302.04761).** NeurIPS 2023. — Self-taught tool use.
- **Shinn et al. (2023). [Reflexion: Language Agents with Verbal Reinforcement Learning](https://arxiv.org/abs/2303.11366).** NeurIPS 2023. — Learning from feedback without weight updates.
- **Sumers, Yao, Narasimhan and Griffiths (2023). [Cognitive Architectures for Language Agents](https://arxiv.org/abs/2309.02427).** TMLR. — Memory, action space and decision procedure.
- **Jimenez et al. (2023). [SWE-bench: Can Language Models Resolve Real-World GitHub Issues?](https://arxiv.org/abs/2310.06770).** ICLR 2024.
- **Zhang et al. (2024). [AutoCodeRover: Autonomous Program Improvement](https://arxiv.org/abs/2404.05427).** ISSTA 2024. — Structure-aware search and fault localisation.
- **Wang et al. (2024). [Executable Code Actions Elicit Better LLM Agents](https://arxiv.org/abs/2402.01030)** (CodeAct). ICML 2024.
- **Wang et al. (2024). [OpenHands: An Open Platform for AI Software Developers as Generalist Agents](https://arxiv.org/abs/2407.16741).** ICLR 2025. **Wang et al. (2025). [The OpenHands Software Agent SDK](https://arxiv.org/abs/2511.03690).** MLSys 2026.
- **Cognition (2024). [SWE-bench technical report](https://cognition.com/blog/swe-bench-technical-report)** (Devin).
- **Anthropic (2024–25). [Raising the bar on SWE-bench Verified with Claude 3.5 Sonnet](https://www.anthropic.com/engineering/swe-bench-sonnet).** — Two tools, minimal scaffold, 49%.
- **Anthropic (2024). [Introducing the Model Context Protocol](https://www.anthropic.com/news/model-context-protocol).**
- **Karpathy (2025). ["Vibe coding" post](https://x.com/karpathy/status/1886192184808149383)** and **[Software Is Changing (Again)](https://www.ycombinator.com/library/MW-andrej-karpathy-software-is-changing-again)** (YC AI Startup School). — The autonomy slider.
- **Willison (2025). [I think "agent" may finally have a widely enough agreed upon definition](https://simonwillison.net/2025/Sep/18/agents/).**
- **Sutton (2019). [The Bitter Lesson](http://www.incompleteideas.net/IncIdeas/BitterLesson.html).** **Chung (2024). [Stanford CS25 lecture](https://www.youtube.com/watch?v=orDKvo8h71o).** **Martin (2025). [Learning the Bitter Lesson](https://rlancemartin.github.io/2025/07/30/bitter_lesson/).**

## Theory: reliability, sampling, context

- **Kwa et al. (2025). [Measuring AI Ability to Complete Long Tasks](https://arxiv.org/abs/2503.14499).** NeurIPS 2025 (METR). **METR (2026). [Time Horizon 1.1](https://metr.org/blog/2026-1-29-time-horizon-1-1/)** and **[limitations of time horizons](https://metr.org/notes/2026-01-22-time-horizon-limitations/).**
- **Ord (2025). [Is there a half-life for the success rates of AI agents?](https://arxiv.org/abs/2505.05115).** — The constant-hazard model. **Hamilton (2026). [Peto's Paradox and the Future of AI Agents](https://gushamilton.github.io/lab/2026/01/23/petos-paradox-ai-agents/)** (blog; Weibull fit).
- **Yao et al. (2024). [τ-bench](https://arxiv.org/abs/2406.12045).** — pass^k; tasks as POMDPs. **Zhang et al. (2025). [The Landscape of Agentic Reinforcement Learning for LLMs: A Survey](https://arxiv.org/abs/2509.02547).**
- **Brown et al. (2024). [Large Language Monkeys: Scaling Inference Compute with Repeated Sampling](https://arxiv.org/abs/2407.21787).** — Coverage laws; the selection plateau.
- **Ehrlich et al. (2025). [CodeMonkeys: Scaling Test-Time Compute for Software Engineering](https://arxiv.org/abs/2501.14723).** — Oracle 69.8%, selected 57.4%.
- **Skalse et al. (2022). [Defining and Characterizing Reward Hacking](https://arxiv.org/abs/2209.13085).** NeurIPS 2022.
- **Liu et al. (2024). [Lost in the Middle](https://arxiv.org/abs/2307.03172).** TACL. **Hsieh et al. (2024). [RULER](https://arxiv.org/abs/2404.06654).** COLM. **Modarressi et al. (2025). [NoLiMa](https://arxiv.org/abs/2502.05167).** ICML. **Hong, Troynikov and Huber (2025). [Context Rot](https://www.trychroma.com/research/context-rot).** Chroma.
- **Weller et al. (2025). [On the Theoretical Limitations of Embedding-Based Retrieval](https://arxiv.org/abs/2508.21038).**
- **Mathews (2026). [Amdahl's law for AI agents](https://electric.ax/blog/2026/02/19/amdahls-law-for-ai-agents).** Blog.

## Training agents in (and for) harnesses

- **Pan et al. (2024). [SWE-Gym](https://arxiv.org/abs/2412.21139).** ICML 2025. **Yang et al. (2025). [SWE-smith](https://arxiv.org/abs/2504.21798).** **Wei et al. (2025). [SWE-RL](https://arxiv.org/abs/2502.18449).** **Jain et al. (2025). [R2E-Gym](https://arxiv.org/abs/2504.07164).**
- **Agentica and Together AI (2025). [DeepSWE](https://www.together.ai/blog/deepswe).** — RL-only training to 42.2% / 59%.
- **Cursor (2025). [Composer](https://cursor.com/blog/composer).** — RL inside the product's own harness. **Cognition (2025). [SWE-1.5](https://cognition.com/blog/swe-1-5).**
- **OpenAI (2025). [GPT-5-Codex system card addendum](https://cdn.openai.com/pdf/97cc5669-7a25-4e63-b15f-5fd5bdc4d149/gpt-5-codex-system-card.pdf).** — "Purpose-built for Codex CLI". **[Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide).**
- **Wu et al. (2026). [Terminal-Universe](https://arxiv.org/abs/2609.04148).** Preprint. — Environment count as the axis that scales.

## Harness engineering: vendor and practitioner writing

- **Anthropic.** [Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents) (2025); [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (2025); [Advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use) (2025); [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) (2026); [Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps) (2026); [Building a C compiler with a team of parallel Claudes](https://www.anthropic.com/engineering/building-c-compiler) (2026).
- **OpenAI.** [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/) (2026); [Unlocking the Codex harness: how we built the App Server](https://openai.com/index/unlocking-the-codex-harness/) (2026); [Auto-review of agent actions](https://alignment.openai.com/auto-review/) (2026).
- **Cursor.** [Improving Cursor's agent for OpenAI Codex models](https://cursor.com/blog/codex-model-harness) (2025); [Improving agent with semantic search](https://cursor.com/blog/semsearch) (2025); [Dynamic context discovery](https://cursor.com/blog/dynamic-context-discovery) (2026); [Scaling long-running autonomous coding](https://cursor.com/blog/scaling-agents) (2026); [Continually improving our agent harness](https://cursor.com/blog/continually-improving-agent-harness) (2026).
- **Hashimoto (2026). [My AI Adoption Journey](https://mitchellh.com/writing/my-ai-adoption-journey).** — "Engineer the harness".
- **Böckeler (2026). [Context Engineering for Coding Agents](https://martinfowler.com/articles/exploring-gen-ai/context-engineering-coding-agents.html)** and **[Harness Engineering — first thoughts](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering-memo.html).**
- **Zechner (2025). [What I learned building an opinionated and minimal coding agent](https://mariozechner.at/posts/2025-11-30-pi-coding-agent/).** — The case for four tools.
- **Huntley (2025). [Ralph Wiggum as a "software engineer"](https://ghuntley.com/ralph/).** **Horthy (2025). [12-factor agents](https://github.com/humanlayer/12-factor-agents).**
- **Cherny (2026). [On agentic search versus RAG](https://x.com/bcherny/status/2017824286489383315)**; **[Claude Code: Anthropic's Agent in Your Terminal](https://www.latent.space/p/claude-code)** (Latent Space, 2025).
- **Aider.** [Repository map](https://aider.chat/2023/10/22/repomap.html) (2023); [Unified diffs make GPT-4 Turbo 3X less lazy](https://aider.chat/2023/12/21/unified-diffs.html) (2023); [Separating code reasoning and editing](https://aider.chat/2024/09/26/architect.html) (2024); [Polyglot benchmark](https://aider.chat/2024/12/21/polyglot.html) (2024).
- **Factory (2025). [Droid: the #1 software development agent on Terminal-Bench](https://factory.com/news/terminal-bench).**

## Memory, long horizons and many agents

- **Lin et al. (2026). [Context as an Environment: Programmatic Context Management for Long-Horizon Agents](https://arxiv.org/abs/2608.21690)** (Scroll). Preprint. — Eviction, not compaction.
- **Jiang et al. (2026). [Demystifying Agent Skills](https://arxiv.org/abs/2608.14036).** Preprint. — Skills anchor procedure; retrieval degrades with pool size.
- **Qiu and Gill (2026). [Adversarial Review](https://arxiv.org/abs/2608.18167).** ICML 2026. — False consensus between reviewing agents.
- **Park et al. (2026). [Scaling Discovery through Test-Time Communication](https://arxiv.org/abs/2609.21032).** Preprint. — When a team of agents beats independent ones.
- **Anthropic (2026). [Measuring AI agent autonomy in practice](https://www.anthropic.com/research/measuring-agent-autonomy).**

## Benchmarks and evaluation

- **OpenAI and SWE-bench authors (2024). [SWE-bench Verified](https://www.swebench.com/)**; **Yang et al. (2024). [SWE-bench Multimodal](https://arxiv.org/abs/2410.03859)**; **OpenAI (2026). [Why SWE-bench Verified no longer measures frontier coding capabilities](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/).**
- **SWE-bench issue #465 (2025). [Repo State Loopholes During Agentic Evaluation](https://github.com/SWE-bench/SWE-bench/issues/465).** **SWE-Bench Pro issue #93 (2026). [Git reward hacking](https://github.com/scaleapi/SWE-bench_Pro-os/issues/93).**
- **Deng et al. (2025). [SWE-Bench Pro](https://arxiv.org/abs/2509.16941).** **Scale AI (2026). [SWE-Bench Pro V2](https://labs.scale.com/blog/swe-bench-pro-v2).** — Network off, pristine re-grading.
- **Merrill, Shaw et al. (2026). [Terminal-Bench](https://arxiv.org/abs/2601.11868).** **[Terminal-Bench 3.0](https://www.tbench.ai/news/terminal-bench-3-0)** and **[4.0 leaderboard](https://snorkel.ai/leaderboard/terminal-bench-4-0/).**
- **Miserendino et al. (2025). [SWE-Lancer](https://arxiv.org/abs/2502.12115).** **Jain et al. (2024). [LiveCodeBench](https://arxiv.org/abs/2403.07974).** **Badertdinov et al. (2025). [SWE-rebench](https://arxiv.org/abs/2505.20411).** **Zhang et al. (2025). [SWE-bench Goes Live!](https://arxiv.org/abs/2505.23419).**
- **Kapoor et al. (2025). [Holistic Agent Leaderboard](https://arxiv.org/abs/2510.11977).** — Cost-aware evaluation at scale.
- **METR (2025). [Recent frontier models are reward hacking](https://metr.org/blog/2025-06-05-recent-reward-hacking/).** **Baker et al. (2025). [Monitoring Reasoning Models for Misbehavior](https://arxiv.org/abs/2503.11926).** **MacDiarmid et al. (2025). [Natural Emergent Misalignment from Reward Hacking in Production RL](https://arxiv.org/abs/2511.18397).** **Zhong, Raghunathan and Carlini (2025). [ImpossibleBench](https://arxiv.org/abs/2510.20270).** ICLR 2026.

## Security

- **Willison (2025). [The lethal trifecta for AI agents](https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/).** **Meta (2025). [Agents Rule of Two](https://ai.meta.com/blog/practical-ai-agent-security/).**
- **Anthropic.** [Beyond permission prompts: making Claude Code more secure and autonomous](https://www.anthropic.com/engineering/claude-code-sandboxing) (2025); [How we built Claude Code auto mode](https://www.anthropic.com/engineering/claude-code-auto-mode) (2026); [How we contain Claude across products](https://www.anthropic.com/engineering/how-we-contain-claude) (2026); [Auto mode is now the default](https://claude.com/blog/auto-mode-default-in-claude-code) (2026); [Disrupting the first reported AI-orchestrated cyber espionage campaign](https://www.anthropic.com/news/disrupting-AI-espionage) (2025).
- **Cursor (2026). [Implementing a secure sandbox for local agents](https://cursor.com/blog/agent-sandboxing).** **GitHub. [Risks and mitigations for Copilot cloud agent](https://docs.github.com/en/copilot/concepts/agents/cloud-agent/risks-and-mitigations).**
- **Incidents and disclosures:** [Invariant Labs, GitHub MCP exploit](https://invariantlabs.ai/blog/mcp-github-vulnerability) (2025); [Pillar Security, Rules File Backdoor](https://www.pillar.security/blog/new-vulnerability-in-github-copilot-and-cursor-how-hackers-can-weaponize-code-agents) (2025); [AWS-2025-015, Amazon Q Developer](https://aws.amazon.com/security/security-bulletins/AWS-2025-015/) (2025); [Nx s1ngularity advisory](https://github.com/nrwl/nx/security/advisories/GHSA-cxm3-wv7p-598c) (2025); [Embrace The Red, Copilot RCE](https://embracethered.com/blog/posts/2025/github-copilot-remote-code-execution-via-prompt-injection/) (2025); [Aim Labs, CurXecute](https://www.aim.security/post/when-public-prompts-turn-into-local-shells-rce-in-cursor-via-mcp-auto-start) (2025); [Check Point, MCPoison](https://research.checkpoint.com/2025/cursor-vulnerability-mcpoison/) (2025); [Check Point, Claude Code project files](https://research.checkpoint.com/2026/rce-and-api-token-exfiltration-through-claude-code-project-files-cve-2025-59536/) (2026); [Check Point, Codex CLI](https://research.checkpoint.com/2025/openai-codex-cli-command-injection-vulnerability/) (2025); [Accomplish, escaping the Codex sandbox](https://accomplish.ai/blog/escaping-the-openai-codex-sandbox-twice/) (2026); [The Register, Replit incident](https://www.theregister.com/2025/07/21/replit_saastr_vibe_coding_incident/) (2025).
- **Debenedetti et al. (2025). [Defeating Prompt Injections by Design](https://arxiv.org/abs/2503.18813)** (CaMeL). **Beurer-Kellner et al. (2025). [Design Patterns for Securing LLM Agents against Prompt Injections](https://arxiv.org/abs/2506.08837).** **OWASP. [LLM01:2025 Prompt Injection](https://genai.owasp.org/llmrisk/llm01-prompt-injection/)** and **[Top 10 for Agentic Applications](https://genai.owasp.org/2025/12/09/owasp-top-10-for-agentic-applications-the-benchmark-for-agentic-security-in-the-age-of-autonomous-ai/).**
- **Spracklen et al. (2025). [We Have a Package for You!](https://arxiv.org/abs/2406.10279)** USENIX Security. **Pearce et al. (2022). [Asleep at the Keyboard?](https://arxiv.org/abs/2108.09293)** IEEE S&amp;P. **Perry et al. (2023). [Do Users Write More Insecure Code with AI Assistants?](https://arxiv.org/abs/2211.03622)** CCS. **Veracode (2025). [GenAI Code Security Report](https://www.veracode.com/blog/genai-code-security-report/).**

## The Claude Code source leak

- **Reporting:** [The Register](https://www.theregister.com/2026/03/31/anthropic_claude_code_source_code/); [VentureBeat](https://venturebeat.com/technology/claude-codes-source-code-appears-to-have-leaked-heres-what-we-know); [InfoQ](https://www.infoq.com/news/2026/04/claude-code-source-leak); [TechCrunch on the DMCA takedowns](https://techcrunch.com/2026/04/01/anthropic-took-down-thousands-of-github-repos-trying-to-yank-its-leaked-source-code-a-move-the-company-says-was-an-accident/).
- **Analyses:** [Kim, "The Claude Code source leak"](https://alex000kim.com/posts/2026-03-31-claude-code-source-leak/); Liu et al. and Barbaste et al., above.
- **Official documentation cited:** [permission modes](https://code.claude.com/docs/en/permission-modes); [memory](https://code.claude.com/docs/en/memory); [tools reference](https://code.claude.com/docs/en/tools-reference); [text editor tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool).

## Harnesses and standards

- **Open harnesses:** [mini-SWE-agent](https://github.com/SWE-agent/mini-swe-agent); [SWE-agent](https://github.com/SWE-agent/SWE-agent); [Aider](https://github.com/Aider-AI/aider); [OpenHands](https://github.com/OpenHands/OpenHands); [Codex CLI](https://github.com/openai/codex); [Gemini CLI](https://github.com/google-gemini/gemini-cli); [Pi](https://github.com/badlogic/pi-mono); [OpenCode](https://github.com/anomalyco/opencode); [Cline](https://github.com/cline/cline).
- **Google (2026). [Transitioning Gemini CLI to Antigravity CLI](https://developers.googleblog.com/an-important-update-transitioning-gemini-cli-to-antigravity-cli/).** **GitHub. [Customizing the agent environment](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/customize-the-agent-environment).**
- **Standards:** [Model Context Protocol specification](https://modelcontextprotocol.io/specification/versioning) and its [2026-07-28 changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog); [Agent Client Protocol](https://zed.dev/blog/bring-your-own-agent-to-zed) (Zed, 2025); [Agent Skills](https://agentskills.io/); [AGENTS.md](https://agents.md/); [Agentic AI Foundation](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation) (Linux Foundation, 2025).

## Real-world evidence and adoption

- **METR (2025). [Measuring the impact of early-2025 AI on experienced open-source developer productivity](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)** and **(2026) [uplift update](https://metr.org/blog/2026-02-24-uplift-update/).**
- **Anthropic (2026). [Agentic coding and persistent returns to expertise](https://www.anthropic.com/research/claude-code-expertise)**; **(2025) [AI's impact on software development](https://www.anthropic.com/research/impact-software-development).**
- **Shen and Tamkin (2026). [How AI Impacts Skill Formation](https://arxiv.org/abs/2601.20245).**
- **Google Cloud (2025). [DORA State of AI-assisted Software Development](https://cloud.google.com/blog/products/ai-machine-learning/announcing-the-2025-dora-report).** **Stack Overflow (2025). [Developer Survey: AI](https://survey.stackoverflow.co/2025/ai).** **GitHub (2025). [Octoverse](https://github.blog/news-insights/octoverse/octoverse-a-new-developer-joins-github-every-second-as-ai-leads-typescript-to-1/).**
- **Li, Zhang and Hassan (2025). [The Rise of AI Teammates in Software Engineering (SE) 3.0](https://arxiv.org/abs/2507.15003)** (AIDev); **Mazloomzadeh et al. (2026). [How Do AI Coding Agents Contribute to Software Development? An Empirical Study of Agentic Pull Requests](https://arxiv.org/abs/2607.21832).** Preprints.
- **Vendor adoption figures:** [Anthropic Series G](https://www.anthropic.com/news/anthropic-raises-30-billion-series-g-funding-380-billion-post-money-valuation) (2026); [Cursor, agents with computer use](https://cursor.com/blog/agent-computer-use) (2026); [Faros AI, the AI productivity paradox](https://www.faros.ai/ai-productivity-paradox) (vendor report, 2025).
