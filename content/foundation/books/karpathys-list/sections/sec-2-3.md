**Andrej Karpathy · 2017 · [Medium](https://karpathy.medium.com/software-2-0-a64152b37c35)**

The essay's claim is that a neural network is not a tool used by software but a different way of writing software. **Software 1.0** is explicit instructions — Python, C++, a human deciding each step. **Software 2.0** is written in weights: the human specifies a goal as a dataset and a loss, and an optimiser searches program space for something that satisfies it. Nobody writes the resulting program and nobody can read it, which is a real cost paid for a real capability. As Karpathy puts it, a large fraction of useful problems have the property that collecting examples is far easier than stating the rule.

The strongest part of the argument is the list of properties the 2.0 stack has that the 1.0 stack does not, because these are engineering facts rather than a philosophy.

**It is computationally homogeneous.** A trained network is a matrix multiply and a nonlinearity, repeated. That is a tiny instruction set, which is why it can be baked into silicon — a claim that read as speculative in 2017 and now describes an industry.

**It has constant running time and constant memory.** Every forward pass through a fixed network costs the same. Software 1.0 has branches, unbounded loops and data-dependent allocation; 2.0 has none of them, which makes it far easier to put on a latency budget or an embedded device.

**It is agile.** Need it twice as fast? Remove channels and retrain. You get a worse model rather than a broken one, and the trade is a dial. There is no equivalent dial in a hand-written codebase.

**Modules can meld.** Two 1.0 components communicate through an interface somebody designed; two 2.0 components can be backpropagated through jointly and will co-adapt to an interface nobody designed and nobody has to maintain.

The limitations are stated honestly and are the ones that turned out to matter: the artifact is large and opaque, it fails in ways that are unintuitive rather than merely inconvenient, adversarial examples exist, and every bias in the dataset is silently compiled into the weights. Karpathy's proposal is that the tooling has to follow — datasets are the source code, so the field needs an IDE, a version-control story and a package registry for 2.0. That prediction is roughly half-realised: dataset versioning and model registries exist, and are nothing like as good as `git`.

> If the dataset is the source code, then labelling is programming, and every tool that makes 1.0 tractable — diffs, tests, review, blame — has to be reinvented for a source that is millions of examples long.

**What did not survive contact with the sequel:** the 2.0 framing assumed you would still be training the network. In practice the dominant mode became prompting one you did not train, which Karpathy himself named — first as the observation that the hottest new programming language is English (2023), later as **Software 3.0** in his 2025 talk, and in its least careful form as "vibe coding" (2025). That is a genuine third regime, not a variant of the second: the artifact is a prompt, the compiler is someone else's model, and the properties the 2017 essay was proudest of all break. A prompted system is not computationally homogeneous, does not have constant running time, and cannot be baked into silicon. The agility dial is gone; you get whatever the provider ships. And the melding property inverts — 3.0 components communicate through natural-language interfaces that are maximally underspecified rather than jointly optimised. The essay is still the clearest statement of what changed in 2017, and reading it now mostly demonstrates how quickly a well-argued prediction can be overtaken by a mode its author had not yet imagined.
