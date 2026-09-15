**Santoro, Raposo, Barrett, Malinowski, Pascanu, Battaglia & Lillicrap · 2017 · [arXiv:1706.01427](https://arxiv.org/abs/1706.01427)**

CLEVR was built to break visual question answering models, and it worked. The questions are synthetic and unambiguous — *is the cube the same material as the small sphere* — and the trick is that they hinge on **comparing** objects rather than recognising them. A CNN+LSTM scored 52.3% overall. Adding stacked attention reached 68.5%. Humans scored 92.6%.

The revealing number is not any of those. It is the compare-attribute column, where stacked attention got 52.3% — against 51.3% for a baseline that sees only the *question type* and guesses whichever answer is most common. **On exactly the questions that require relating two objects, the best model of the day had learned the answer distribution and nothing else.** The consensus diagnosis blamed language: parse the question into a little program, then execute it. That meant neural module networks, and supervision on the programs themselves.

This paper proposed a different prior, small enough to state in one line. Given a set of objects, the Relation Network computes

$$
\operatorname{RN}(O) = f_\phi\left( \sum_{i,j} g_\theta(o_i, o_j) \right)
$$

One small network $g_\theta$ runs over every ordered pair of objects, the results are summed, and a second network $f_\phi$ reads the sum. Two design choices carry the weight. The parameters of $g_\theta$ are **shared across all $n^2$ pairs**, so the network cannot quietly learn a special case for one position — it is forced to find a single relation function that works everywhere. And the **sum** gives order-blindness for the reason set out in the previous section, applied to pairs instead of elements. For question answering the question embedding is fed in alongside each pair, $g_\theta(o_i, o_j, q)$, so one $g_\theta$ learns whichever relation is being asked about.

**The objects are not detected**, which is the part people find surprising. Four stride-2 convolutions reduce a 128×128 image to an 8×8 grid of 24-channel cells; each cell is tagged with its coordinates and simply declared to be an object. The RN sorts out what, if anything, is actually there. $g_\theta$ was a four-layer network of 256 units, $f_\phi$ three layers, the question LSTM 128 units — a small module bolted onto an ordinary CNN.

It scored 95.5% overall on CLEVR, above the 92.6% human number, with compare-attribute at 97.1%. Fed hand-written descriptions of the scene instead of pixels it scored 96.4%, which matters as a control: it shows the gain came from the pairwise structure and not from better vision. The same module passed 18 of 20 bAbI tasks at the 95% threshold. The claim that stuck was the diagnostic one — CLEVR was hard because of relations, not parsing, and a sum over pairs was enough to fix it with no program supervision at all.

> A hard-wired sum over all pairs, with one shared function on every pair, buys relational reasoning that gradient descent will not discover on its own.

**What did not survive: the module.** The all-pairs sum costs $O(n^2)$, which is tolerable at 64 grid cells and hopeless at realistic object counts, and the arity is frozen at two — a three-way relation needs another prior on top. Within a year FiLM and then MAC, at 98.9%, passed 95.5% on CLEVR with no pairwise module at all. Self-attention then absorbed the idea outright: the same all-pairs interaction, with learned weights in place of the uniform sum. That is the form the next section builds on.
