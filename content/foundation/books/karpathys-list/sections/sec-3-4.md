**Hoffmann, Borgeaud, Mensch, Buchatskaya, Cai, Rutherford, de Las Casas, Hendricks, Welbl, Clark et al. · 2022 · [arXiv:2203.15556](https://arxiv.org/abs/2203.15556)**

Kaplan et al. said: given more compute, buy mostly parameters. Everyone did. Gopher was `280B` parameters trained on `300B` tokens; GPT-3 was `175B` on `300B`; Megatron-Turing NLG was `530B` on `270B`. Hoffmann et al. trained over four hundred models from `70M` to more than `16B` parameters on `5B` to `500B` tokens and concluded that all of these were **badly undertrained**, by a large margin.

**The method is three independent estimates of the same quantity**, and that is what gives the result its force — three different ways of asking, all landing in the same place.

*Approach one* fixes a set of model sizes, trains each across a range of token counts, and traces the lowest loss achievable at each compute budget. *Approach two* fixes a compute budget and sweeps model size along it — train a small model on lots of data, a large model on little, and everything between, then find the bottom of the resulting curve. *Approach three* fits a formula directly:

$$
L(N, D) = E + \frac{A}{N^{a}} + \frac{B}{D^{b}}
$$

This one is readable if you take it a term at a time. $E$ is the loss you could never get below even with infinite everything — natural text is genuinely unpredictable to some degree. The second term is the penalty for having a finite model, the third the penalty for having finite data, and each shrinks as its resource grows.

All three approaches agree that the exponents $a$ and $b$ are approximately equal, which means **parameters and tokens should be scaled in the same proportion** — double one, double the other. That is against Kaplan's recommendation of $N \propto C^{0.73}$ and $D \propto C^{0.27}$. The rule of thumb that came out of it is roughly twenty tokens per parameter.

Then the demonstration, which is what made it stick. **Chinchilla**: `70B` parameters trained on `1.4T` tokens, at the same total compute as Gopher's `280B` on `300B`. A quarter the size, four times the data. It beat Gopher across essentially every benchmark, reaching `67.5%` on MMLU, and beat GPT-3 and MT-NLG `530B` as well — **while being far cheaper to serve**, because a `70B` model costs a quarter as much per token as a `280B` one, forever afterwards.

Karpathy's framing is that this is the paper that told everyone the axis they had been optimising was the wrong one, and that the correction was worth more than any architectural idea of the same period. The wider lesson is uncomfortable: a well-cited empirical law, followed by essentially the entire field for two years, at a cost of hundreds of millions of dollars in training compute, was simply wrong about its central recommendation.

> Model size and data should scale together, so every frontier model trained between 2020 and 2022 was a smaller model's worth of quality bought at a larger model's price.

**What did not survive:** the twenty-to-one ratio, as a target rather than as a finding. Chinchilla answers one specific question — what is the cheapest way to reach a given loss, counting *training* compute only — and that question is the wrong one for anything you intend to deploy. Inference is paid per token forever, so it is usually rational to train a *smaller* model far past its compute-optimal point and then serve it cheaply. Llama did exactly this in 2023, and Llama 3's `8B` model saw about `15T` tokens, on the order of a hundred times the Chinchilla-optimal allocation, with results plainly worth it. The paper's own arithmetic has also come under scrutiny: a 2024 replication by Besiroglu et al. found the reported fit from approach three could not be reproduced from its published coefficients and carried implausibly tight confidence intervals, with a refit restoring agreement with approaches one and two. The `~20` figure survives that correction. The lesson that "compute-optimal" is a narrower claim than it sounds does not need it.
