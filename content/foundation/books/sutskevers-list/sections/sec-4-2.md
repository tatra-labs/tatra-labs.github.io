**Oriol Vinyals, Meire Fortunato, Navdeep Jaitly · 2015 · [arXiv:1506.03134](https://arxiv.org/abs/1506.03134)**

A sequence-to-sequence model ends in a softmax over a vocabulary that is fixed when the model is built. For translation that is fine — you know the target words in advance. It falls apart for a whole class of problems whose outputs are **indices into the input**: sorting a list, returning the corners of a shape in order, ordering cities into a tour.

The problem is a counting mismatch. The number of possible answers is the input length $n$, and $n$ changes from one example to the next. A model trained on 50 points cannot run on 5 or on 500 without building a new output layer. Bahdanau-style attention did not fix this either: it used the soft weighting of the previous section to *blend* encoder states into a context vector, and then fed that vector into the same fixed-width softmax.

**The change stops one step short of the existing machinery, and that is the whole idea.** An encoder RNN reads the input into hidden states $e_1 \ldots e_n$. At decoder step $i$ with state $d_i$, a score is computed for every input position, $u^i_j = v^{\top} \tanh(W_1 e_j + W_2 d_i)$, with the parameters shared across positions. Ordinary attention normalises those scores and uses them as blending weights. A pointer network normalises them and stops — treating the resulting distribution as the answer itself:

$$
p(C_i \mid C_1 \ldots C_{i-1}, P) = \operatorname{softmax}(u^i)
$$

That distribution is $n$ wide, so it grows and shrinks with the input automatically. Decoding picks an input position, and the embedding of that element becomes the next decoder input. **There is no output projection matrix to size, so there is nothing left that depends on $n$.**

Trained by maximum likelihood on 1M input–solution pairs with a single-layer LSTM of 256 or 512 units, it beat the alternatives. On convex hulls with 50 points, trained and tested at that size, it produced the exactly correct vertex sequence 72.6% of the time, against 38.9% for an LSTM with input attention and 1.9% without. One model trained across 5–50 points scored 69.6% at $n = 50$, 50.3% at $n = 100$ and 22.1% at $n = 200$ — sizes it had never seen. On planar travelling-salesman problems it matched the optimal tour at $n = 5$ and came within 0.01 at $n = 10$ (2.88 against 2.87). Trained at $n = 50$ on tours produced by the weakest of three heuristics, it produced tours of 6.42 against that heuristic's own 6.46 — **beating the teacher it learned from.**

The mechanism outlived the geometry. Reusing an attention distribution as an output distribution is the copy mechanism that later turned up in summarisation, dialogue and extractive question answering, where an answer span is named by pointing at its start and its end. It opened up neural combinatorial optimisation, and the next section takes it as a decoder.

> Attention does not have to be a way of reading; the same distribution can be the answer.

**The caveat:** nothing enforces that a tour is a permutation. The model will happily point at the same city twice, or skip one entirely, so decoding needed a beam search constrained to valid tours — meaning the constraint lives in the decoder rather than in the network, and the network never actually learned the rule. Generalisation was narrower than the headline suggests too: a model trained on 5–20 cities was near-optimal at $n = 25$ and good at $n = 30$, but broke at 40, its tours averaging 5.91 against 5.82 for the crudest reference heuristic. And pointing can only ever emit something already present in the input, which is why later copy models mixed a pointer *with* a vocabulary softmax rather than replacing it.
