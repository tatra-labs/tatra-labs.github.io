**Lilian Weng · 2018 · [Lil'Log](https://lilianweng.github.io/posts/2018-05-05-drl-implementation/)**

The only post in this chapter that shows the code. It walks through building a deep Q-network against an OpenAI Gym environment: the replay buffer, the target network and how often to sync it, the schedule for reducing random exploration over time, the training loop, checkpointing, and the monitoring you need to tell a learning agent from a stuck one.

**The code is dead and I am keeping the entry anyway.** It is TensorFlow 1.x, built around a programming model TensorFlow itself abandoned in 2.0. OpenAI stopped maintaining Gym in 2021; the maintained successor is Gymnasium under the Farama Foundation, with a changed interface. Nothing here runs as written. If you want a working DQN today, take one from CleanRL, which publishes single-file reference implementations for exactly this reason.

What survives is the **category of problem** — and it is the one all the mathematics in this chapter conceals.

Between the Bellman equation and an agent that actually learns sits a set of decisions no paper states. How large the replay buffer is. How often the target network is synced. Whether observations are normalised, and against what running statistics. How rewards are scaled or clipped. How fast exploration decays. Whether evaluation uses the exploring policy or the greedy one. Whether an episode that hit a time limit is treated the same as one that genuinely ended — and whether the value estimate is bootstrapped at that boundary. **Each of these changes the result. Several change it by more than the algorithm does.**

That last claim is not an impression, and it is why this entry earns its place.

**Henderson et al. (2018) showed that deep reinforcement learning results routinely fail to reproduce.** Identical algorithms on identical tasks, differing only in the random seed, produce learning curves so far apart that the common practice of reporting your best few runs makes almost any method look better than almost any other.

**Engstrom et al. (2020) went further and took PPO apart.** They found that much of its advantage over TRPO came not from the clipped objective the paper is actually about, but from a stack of unreported code-level details — observation normalisation, reward scaling, orthogonal initialisation, learning-rate annealing, gradient clipping — and that stripping those out removed most of the gap. The published contribution and the real source of the improvement were different things.

> Deep reinforcement learning results are a property of an implementation, not of an algorithm, and the literature has systematically under-reported the half that carries the variance.

**Why this matters for anyone who came here from language models**, where it is repeating almost exactly. The public description of an RLHF or RLVR pipeline is a loss function and a diagram. The working version has a penalty coefficient for drifting from the starting policy and a schedule for it, a reward normalisation scheme, a choice about how to standardise advantages, a decision about whether to compute loss over the prompt tokens or only the response, a length penalty to stop the model discovering that longer answers happen to score higher, and a policy on what to do with generations that got cut off. Any one of these can be the difference between a run that improves and a run that collapses, and few papers report all of them. The teams that publish their training code — and the handful of genuinely reproducible open pipelines — are worth more than the ones that publish only results.

Read this post as a historical artifact and take the discipline from it: when a reinforcement-learning result surprises you, the first hypothesis should be an implementation detail, not an insight.
