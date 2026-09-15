**Lilian Weng · 2020 · [Lil'Log](https://lilianweng.github.io/posts/2020-06-07-exploration-drl/)**

Bandit exploration works because you can pull every arm often enough to pin down how good it is. Scale up to a real problem where rewards are rare, and that stops being possible.

Montezuma's Revenge is the standing example. The agent must climb down a ladder, cross a room, collect a key and open a door before receiving *any* reward at all. A randomly exploring agent will not perform that sequence in the lifetime of the universe. Epsilon-greedy is not a weak solution here; it is not a solution.

The post organises the responses into families, and the useful distinction between them is **what each one treats as evidence of novelty.**

**Count-based methods** want to visit rarely-visited situations, which requires counting how often you have seen each one — meaningless in a continuous or high-dimensional space where nothing is ever seen twice. Pseudo-counts recover a usable count indirectly: fit a model of how probable each situation looks, and if that estimated probability jumps after seeing something, the size of the jump implies how often something like it has been seen before. Hash-based approaches instead chop the space into buckets and count those.

**Prediction-error methods** treat "hard to predict" as a proxy for "unfamiliar". The Intrinsic Curiosity Module trains a model to predict what happens next and rewards the agent wherever that model is wrong — with an important refinement. The prediction happens in a feature space learned by a network trained to recover *which action was taken* from a pair of consecutive states, which means the space represents only the parts of the world the agent can actually influence.

**Random Network Distillation** is the cleanest idea in the post. Freeze a randomly initialised network. Train a second network to predict its output on the states you visit. Use the prediction error as your novelty bonus. The error is high exactly where the predictor has not been trained, which is exactly where the agent has not been.

RND's design also solves the failure that makes naive curiosity useless. **The noisy-TV problem:** put a screen of random static in the environment and a prediction-error agent will sit in front of it forever, because static is genuinely unpredictable and therefore permanently "novel". RND is immune, and the reason is worth noticing — its target is a *fixed* random network, so the thing being predicted is a deterministic function of the state, and a random environment produces no permanent error to chase.

**Memory-based methods** stop approximating and just store things. Episodic memory awards novelty by comparing the current state against everything recently seen. Go-Explore keeps an archive of promising states and *returns to them directly* before exploring onward, rather than hoping a random policy happens to rediscover a hundred-step prefix.

> Curiosity works only if novelty is measured in a space where the agent's own actions are the source of the surprise; otherwise the agent finds a source of noise and stares at it.

**What did not transfer, which is most of it, and the reason is worth understanding.** Almost none of this machinery appears in reinforcement learning for language models, and it is not for lack of trying. Novelty bonuses need some notion of having-been-there-before, and **novel text is free.** A language model can emit an unbounded quantity of strings no model has ever produced, all of them worthless. Prediction-error novelty over tokens rewards incoherence — which is the noisy-TV problem in its purest form, with the model as its own television.

So practice fell back to the crudest tools available: sample with some randomness, draw many attempts per prompt, and hold the policy near where it started with a penalty for drifting. That is epsilon-greedy with a leash. The consequences are visible in current training runs — entropy collapses, the policy sharpens onto whatever it found first, and success on the first attempt improves while success across many attempts degrades, which is precisely a system that has stopped exploring. Weng returns to this from the other end in [Harness Engineering](/foundation/book/wengs-guide?section=sec-5-3), where diversity collapse in evolutionary search appears on her list of unsolved bottlenecks. This post is the best available account of how the problem was attacked when the state space was an Atari screen, and reading it mostly establishes how little of that we can currently use.
