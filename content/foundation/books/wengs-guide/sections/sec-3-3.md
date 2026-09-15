**Lilian Weng · 2023 · [Lil'Log](https://lilianweng.github.io/posts/2023-03-15-prompt-engineering/)**

Written in March 2023, four months into the period when prompting looked like it might become a profession. The post is a careful survey of what was known, and its most valuable contribution is a result that undercuts most of the folklore it catalogues.

**Worked examples in the prompt do not work the way everyone assumed.** Min et al. (2022) ran the obvious control experiment: replace the labels in the examples with *random, wrong* ones, and see what happens. Performance barely moved.

What mattered instead was the **label space** — which categories appear at all — the **input distribution**, meaning what the examples look like, and the **format**, meaning how input and output are laid out.

Sit with that, because it changes what a demonstration *is*. The examples are not teaching the model a mapping from input to output. They are telling it **which task, out of everything it saw in pretraining, it is being asked to perform**, and what shape the answer should take. That reframing explains a great deal at once: why which examples you pick and what order you put them in matters so much, why models show recency and majority-label biases across their examples, and why simply adding more examples plateaus so quickly.

The rest of the survey covers what was then live: instruction prompting, [chain-of-thought](/foundation/book/karpathys-list?section=sec-5-2) and self-consistency, automatic prompt search where a model or a search procedure writes the prompt for you, and augmentation — retrieval, offloading arithmetic to an interpreter, and external tool calls. It is a good map of a moment.

> Demonstrations select a task and fix a format; they are not training examples, which is why their labels can be wrong without much consequence and their ordering cannot.

**What did not survive: prompt engineering as a discipline** — and it is worth being precise about how it ended rather than treating it as a change of fashion. Most of the catalogued techniques were **absorbed into the models themselves**. Chain-of-thought is emitted by default now. Sensitivity to formatting fell sharply as instruction tuning covered more phrasings. The elaborate personas, the threats and bribes, the "you are a world-class expert" preambles — these were always weakly evidenced, and the evidence got weaker as models improved. Anyone still maintaining a document of prompt tricks from 2023 is maintaining a list of things that have since been trained in or trained away.

What replaced the practice is more interesting than its disappearance. **Automatic prompt optimisation came back as a compiler problem.** Frameworks like DSPy treat a pipeline of model calls as a program with free parameters — its instructions and its examples — and optimise those against a metric on a dataset. So the artifact you maintain is the program and the metric, not a prompt string you tinker with. That is the right shape: it makes prompts a compilation target rather than handcraft, it produces something you can regression-test, and it is the direct ancestor of the harness-optimisation work in [chapter 5](/foundation/book/wengs-guide?section=sec-5-3). It is also, structurally, [evolution strategies](/foundation/book/wengs-guide?section=sec-2-4) applied to text — since there is no gradient through a prompt string, search is the only option available.

The one part of the post that has grown rather than shrunk is the augmentation section. Retrieval and tool use were listed here as prompting techniques among others; they turned out to be the durable architecture, and everything in [chapter 5](/foundation/book/wengs-guide?section=sec-5-1) is built on them.
