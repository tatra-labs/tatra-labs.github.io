**Shane Legg · 2008 · [Machine Super Intelligence (dissertation)](https://www.vetta.org/documents/Machine_Super_Intelligence.pdf)**

The field had no definition of its own subject that could be written as a formula — no single number a general agent could be said to be maximising. The Turing test is pass or fail, assumes a human standard, and depends on who is judging. IQ tests assume a human is sitting the exam. Benchmarks measure one task at a time: a chess engine tops the chess table and nothing else, and no benchmark can tell you whether it or a maze solver is the more generally intelligent. Legg's dissertation — University of Lugano, supervised by Marcus Hutter, research done at IDSIA — supplies a formula.

**Set up the standard loop first.** An agent $\pi$ takes actions. An environment $\mu$ responds with observations and with rewards, numbers saying how well things are going. The agent's value in that environment is the total reward it can expect to collect, $V^\pi_\mu := \mathbb E\left(\sum r_i\right)$.

Now the two design decisions that make the thing work. First, which environments count. The space $E$ holds every environment a computer could simulate, restricted to those whose total handed-out reward never exceeds `1` — Legg calls them reward-summable. That cap is not fussiness: it forces every score onto the same scale and removes the need for a discount factor, so an agent's performance in a five-step world and a five-million-step world can be added together meaningfully.

Second, how to combine them. Universal intelligence is the value averaged over all of $E$, with each environment weighted by how short its description is:

$$
\Upsilon(\pi) := \sum_{\mu \in E} 2^{-K(\mu)} V^\pi_\mu
$$

where $K(\mu)$ is the length of the shortest program that simulates that environment. This is Solomonoff's universal prior from the previous sections, moved from strings to whole worlds, and the sum works out to the value under one grand mixture of every environment at once. **Simple worlds dominate the score and elaborate ones are discounted exponentially**, which gives the definition its bite: an agent that fluffs the simple environments scores near zero no matter how impressively it handles baroque ones. That is a reasonable thing to demand of something called general intelligence.

The second half closes the loop. Take Hutter's AIXI, strip the discounting out, define it over these reward-bounded environments, and it becomes, by construction, the agent that maximises $\Upsilon$. At each step it weights every program still consistent with everything it has seen by $2^{-\text{length}}$, and picks the action with the best expected reward under that weighted mixture — Solomonoff induction with a search over actions bolted on top. Legg sets the ceiling as $\bar\Upsilon := \max_\pi \Upsilon(\pi) = \Upsilon(\pi^\xi)$, and is careful to describe his chapter as another way of characterising Hutter's existing ordering of agents rather than a fresh claim of optimality.

Here the compression thread stops being a claim about training objectives and becomes a claim about intelligence itself. Both halves are Kolmogorov complexity wearing different hats: a description-length prior over which worlds matter, and universal induction as the policy. MDL says a good model is a short description of the data. Legg says a general agent is one that does well in worlds with short descriptions. Two years after this, he co-founded DeepMind with Demis Hassabis and Mustafa Suleyman, which is a large part of why the thesis is still cited.

> Intelligence, formalised, is expected reward across all computable environments weighted by $2^{-K}$ — the same compression prior, applied to worlds instead of data.

**What did not survive:** $\Upsilon$ cannot be computed, and not in a way better engineering closes — $K$ is uncomputable and $E$ is infinite. Legg's own earlier result (*Is There an Elegant Universal Theory of Prediction?*, ALT 2006, Chapter 5 here) makes it worse: any computable predictor general enough to handle every sequence below a moderate complexity bound must itself be highly complex, and past a certain point no consistent formal system can even prove that a given predictor is powerful. On top of that, $K(\mu)$ is only defined up to a machine-dependent constant, so the ranking of any finite set of agents depends on which reference machine you picked. Evaluation went to benchmark suites instead, and Chollet's ARC took the opposite branch entirely: human-like priors and efficiency at acquiring new skills, rather than universality.
