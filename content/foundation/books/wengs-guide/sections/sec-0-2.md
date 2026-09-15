This guide assumes less than it looks like it does, but it does assume you know what a neural network is and roughly how one is trained. If you do not, read the [Sutskever list's on-ramp](/foundation/book/sutskevers-list?section=sec-0-2) first — that is where gradients, loss and backpropagation are explained — and come back. Everything specific to *this* guide is below.

**The shortest path** is three entries, and it takes you from nothing to understanding why current models behave the way they do:

1. [A (Long) Peek into Reinforcement Learning](/foundation/book/wengs-guide?section=sec-1-1) — what a policy, a value function and a reward actually are. The vocabulary every later entry uses.
2. [Policy Gradient Algorithms](/foundation/book/wengs-guide?section=sec-1-2) — twenty algorithms as one argument, each fixing the last one's flaw.
3. [Reward Hacking](/foundation/book/wengs-guide?section=sec-4-1) — why optimising a learned score produces a model that games it. The most important entry here.

**If language models rather than robots are why you came**, add [the bandit post](/foundation/book/wengs-guide?section=sec-1-3) between 1 and 2, and read it carefully. It is the simplest thing in the guide and the most directly relevant, because training a model on human feedback turns out to be a bandit problem wearing the vocabulary of a much harder one. Then go to [chapter 3](/foundation/book/wengs-guide?section=sec-3-4) and [chapter 4](/foundation/book/wengs-guide?section=sec-4-2).

### Words that keep coming back

**Reinforcement learning** is learning from consequences rather than from labelled examples. Nobody tells the system the right answer; it acts, receives a score, and has to work out for itself which of its choices earned that score.

A **policy** is the rule for deciding what to do. A **reward** is the score. A **value** is how much total reward you expect from here onward. An **episode** is one run from start to finish. The **environment** is whatever the agent is acting on.

**Exploration versus exploitation** is the central tension. Do the thing that has worked best so far, or try something else to find out whether it is better? Too much of the first and you never discover anything; too much of the second and you never benefit from what you know.

**Credit assignment** is the problem of working out which of a hundred earlier actions was responsible for an outcome that only arrived at the end. Most of the machinery in chapter 1 exists for this, and — this is the guide's running theme — most of it turns out to be unnecessary for language models, where the response is scored immediately.

**RLHF** is reinforcement learning from human feedback: people rank the model's answers, a **reward model** learns to imitate their rankings, and the model is then optimised to score well against it. **RLVR** replaces the learned reward model with something that can be checked automatically — does the test pass, does the answer match — which removes one kind of cheating and introduces another.

**A proxy** is a thing you can measure standing in for the thing you want. A reward model is a proxy for human preference; a benchmark is a proxy for capability; a toxicity classifier is a proxy for harm. **Goodhart's law** says a measure stops being a good measure once you start optimising it, and much of this guide is that sentence worked out in detail.

**Reward hacking** is what happens next: high score, wrong behaviour. **Sycophancy** is the language-model version — agreement scores well, so the model agrees.

**A policy gradient** is the method for improving a policy directly, by nudging it toward actions that turned out better than expected. **PPO** and **GRPO** are the two you will see named most often.

**Entropy** here means how varied the model's output is. **Entropy collapse** is a model becoming deterministic during training — it stops exploring, gets better at its first attempt, and worse across many.

**A harness** is the code around the model: the loop, the tools, the memory, the context management. Chapter 5 argues this layer now matters roughly as much as the model.

### The habit this guide is built around

Every entry closes by asking what has held up. Notice how often the answer is about **measurement** rather than method. The toxicity classifier that defines the target. The reward model that stands in for preference. The benchmark that rewards guessing over admitting ignorance. The scaling fit where rounding changes the conclusion.

That is not an accident of selection — it is the thread through eight years of one person's writing, and it is the most useful thing in the guide. When you read any result in this field, ask what was measured, by what instrument, and what that instrument would fail to notice. **Almost every entry here turns on the answer.**
