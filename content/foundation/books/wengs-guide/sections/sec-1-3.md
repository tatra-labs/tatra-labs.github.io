**Lilian Weng · 2018 · [Lil'Log](https://lilianweng.github.io/posts/2018-01-23-multi-armed-bandit/)**

Strip everything out of reinforcement learning except the one dilemma at its centre and you get the bandit. `K` slot machines, each paying out with an unknown probability, one pull per round. No situations, no transitions, no future to plan for. All that remains is the question of whether to pull the arm that has looked best so far, or to gather more evidence about the others — and it turns out this is where most of the conceptual difficulty lived all along.

The measure is **regret**: what you would have collected by always pulling the genuinely best arm, minus what you actually collected. Note what that means. The goal is not to *find* the best arm — that is easy, and expensive. The goal is to lose as little as possible on the way to finding it.

The post works through the solutions in order of sophistication.

**Epsilon-greedy** explores at random a fixed fraction of the time. It works, and its flaw is precise: it keeps exploring arms it has already established are bad, at the same rate, forever.

**Upper confidence bounds** fix that with the principle of *optimism in the face of uncertainty*. Do not act on your estimate of an arm's value; act on the *top* of its plausible range. UCB1 uses `Q(a) + sqrt(2*log(t) / N(a))`, where the bonus shrinks the more often an arm has been pulled. So an arm gets tried either because it looks good, or because you do not yet know that it is not — and **the second reason expires on its own** as evidence accumulates. Nothing has to be tuned or annealed by hand.

**Thompson sampling** is the most elegant and the most practical. Keep a probability distribution over each arm's true payout rate, updated by counting its successes and failures. Each round, **draw one random sample from each arm's distribution and pull whichever sample is highest.** The consequence is exact and rather beautiful: an arm gets chosen with precisely the probability that it is the best one, given everything you currently believe. Exploration is not a rule bolted on top of the algorithm — it falls out of the uncertainty itself, and disappears on its own as that uncertainty shrinks.

> Optimism and posterior sampling both exploit the same fact: the right amount of exploration is a function of how uncertain you are, so any procedure that represents uncertainty gets exploration for free.

**Why this is the most relevant post in the chapter, despite being the simplest.** As [1.1](/foundation/book/wengs-guide?section=sec-1-1) argues, RLHF is structurally a bandit problem rather than a sequential one — a prompt arrives, the model emits one response, a reward model scores it, and nothing carries over to the next round. If you read only one post here before working on post-training, this is a better use of an hour than the policy-gradient survey.

**What the post does not cover, and it is the half you need.** These are *context-free* bandits: `K` fixed arms with fixed payout rates. The language-model case is a **contextual** bandit, where the prompt is the context and an arm's value depends on it, and the post gives that setting only a passing mention. LinUCB and contextual Thompson sampling are the classical answers, and they assume a small, listable set of actions — whereas the action space of a language model is every string it could possibly produce.

The regret guarantees therefore do not transfer, and it is worth being clear that they *cannot*. Those guarantees rest on being able to pull each arm often enough to narrow its confidence interval, and there is no sense in which you can sample the space of possible responses often enough for that.

What transfers is the intuition, and it transfers well. Best-of-`n` sampling is a crude exploration budget. The entropy and KL terms in every RLHF objective are exploration controls under different names. And the current problem of **entropy collapse** in reinforcement learning with verifiable rewards — models becoming deterministic during training, improving on the first attempt while getting worse across many — is exactly a bandit failure: an agent that has stopped exploring, having settled early on an arm that merely looked best.
