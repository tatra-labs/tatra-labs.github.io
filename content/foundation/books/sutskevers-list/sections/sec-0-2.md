These notes assume you want the mechanism, not a summary. They do not assume you already have a degree in this. If you are arriving without much background, this page is the on-ramp: a route through the list, and plain definitions for the dozen terms that turn up in nearly every entry.

**The shortest path from nothing to understanding a modern language model** is five entries, in this order:

1. [Karpathy on character RNNs](/foundation/book/sutskevers-list?section=sec-2-1) — a network that reads text one character at a time, in about a hundred lines of code. Everything later is a variation on this loop.
2. [Olah on LSTMs](/foundation/book/sutskevers-list?section=sec-2-2) — why that first network forgets, and the conveyor-belt fix. The clearest explanation of anything on this list.
3. [Bahdanau on attention](/foundation/book/sutskevers-list?section=sec-2-4) — score, normalise, average. Three steps, and they are the three steps underneath every model in use today.
4. [Attention Is All You Need](/foundation/book/sutskevers-list?section=sec-2-5) — what happens when you throw away everything except attention.
5. [The Annotated Transformer](/foundation/book/sutskevers-list?section=sec-2-6) — the same paper as running code. Read it with the notebook open.

After that, [the scaling laws](/foundation/book/sutskevers-list?section=sec-5-3) explain why the field looks the way it does, and [AlexNet](/foundation/book/sutskevers-list?section=sec-3-1) explains how it got started.

**The compression papers in Part 1 are the ones people skip and the ones that change how you think.** They are also the hardest, so they are a reasonable thing to come back to rather than begin with — but come back to them.

### Words that keep coming back

A **neural network** is a long chain of multiplications and additions with a simple squashing function between the stages. The numbers it multiplies by are its **parameters** or **weights** — a few hundred in the oldest paper here, hundreds of billions in a current model. Training means adjusting them.

A **loss** is a single number saying how wrong the model was on an example. Lower is better. Training is the search for weights that make it small.

A **gradient** answers one question: if I nudge this weight slightly, does the loss go up or down, and how fast? Compute that for every weight, step each one a little way downhill, and repeat a few million times. That is **gradient descent**, and it is essentially all of training. **Backpropagation** is the bookkeeping trick that computes all those gradients in one sweep backwards through the network rather than one at a time.

**Vanishing gradients** are what happens when that signal has to travel back through many stages and gets multiplied by something small at each one. It arrives as nothing, so the early stages never learn. A surprising share of this list is people solving this one problem — it is the reason for LSTMs, for residual connections, and for the shape of the Transformer.

**Overfitting** is a model that memorises its training examples, noise and all, and fails on anything new. **Regularization** is any technique that prevents it, usually by denying the model some of its freedom. **Dropout** is the most famous one: switch off random units during training so no unit can depend on any particular other one.

A **softmax** turns a list of arbitrary numbers into probabilities that add up to one. It appears at the end of almost every model here.

**Attention** is: score how relevant each thing is, turn those scores into weights that sum to one, then take the weighted average. That is the whole mechanism.

**Entropy** measures how unpredictable something is — how many bits you would need, on average, to record it. **Kolmogorov complexity** is the related but different idea of the shortest program that could print one particular object. The first is about a process, the second is about a thing, and Part 1 turns on the distinction.

**Perplexity** scores a language model: roughly, how many equally likely options it is choosing between at each word. Lower is better. **BLEU** scores a translation against human references, and **WER** counts word errors in transcribed speech — both are rough, and both are what the field used.

### One habit worth borrowing

Every entry here closes by saying what did not survive. When you read a paper, look for the same thing: which part was the real idea, and which part was scaffolding that the next five years removed. On this list, attention survived and the recurrence around it did not; residual connections survived and the thousand-layer networks did not. **Telling those apart is most of what it means to read this material well**, and it is a skill you can practise from the first paper.
