**Andrej Karpathy · 2022 · [Lectures 2-6, nn-zero-to-hero](https://github.com/karpathy/nn-zero-to-hero)**

**makemore** makes more of the things you give it. The dataset is a text file of about thirty-two thousand names from US Social Security records, the model works one character at a time, and the task is to produce plausible names that are not already in the file. It is deliberately small enough to train in seconds and deliberately real enough that everything which goes wrong in language modelling goes wrong here first.

**The opening move is worth the whole lecture.** A bigram model — one that predicts each character from just the one before it — is built twice.

First by counting. Make a $27 \times 27$ table of "how often did character $j$ follow character $i$", then normalise each row so it reads as probabilities. No learning involved; just tallying.

Then as a neural network. Represent the input character as a vector of all zeros with a single 1 marking which character it is, multiply by a $27 \times 27$ weight matrix, softmax the result into probabilities, and tune the weights by gradient descent to make the true next character as likely as possible.

**The two converge to the same table.** The trained weights end up being the logarithms of the counts. And the correspondence goes further: adding one to every count before normalising — the classic smoothing trick that stops unseen pairs having probability zero — turns out to be exactly the same thing as penalising large weights on the network side.

This is a genuinely clarifying result, and worth sitting with if you are new. The neural network is not a different kind of object from the count table. It is a parameterisation of it — one that only starts to earn its keep once the table gets too large and too sparse to fill in directly.

Part 2 takes the obvious next step, following Bengio et al. (2003): give each character a short vector of its own, stick three of them together as context, push that through a hidden layer, read out scores. **The embedding table is the point** — characters that behave alike drift near each other without anyone ever specifying which ones should. This lecture also introduces the machinery around training rather than inside it: splitting data into train, dev and test, minibatches, and a crude but effective sweep for the learning rate.

**Part 3 is the most useful of the five and the least glamorous.** It opens by asking a question almost nobody asks: what *should* the loss be before any training at all? Twenty-seven characters, all equally likely, gives $-\log(1/27)$, about `3.29`. The network starts near `27` instead — because the output layer's initial weights are large enough to produce confidently wrong predictions, and the first few hundred steps are spent merely squashing them back down. That is the "hockey stick" at the start of every loss curve. Scale the last layer down at initialisation and the hockey stick disappears.

The same reasoning applied to the hidden layer gives Kaiming initialisation, and then batch normalisation as the general solution. What makes the lecture valuable is the diagnostics: histograms of activations, histograms of gradients, and the ratio of update size to parameter size, which should sit near `1e-3`. **These are the plots that tell you a network is sick before the loss does.**

Part 4 removes autograd entirely and works the gradients out by hand — through the cross-entropy, the $\tanh$, the batch-norm statistics, the embedding lookup. Part 5 replaces the flat concatenation with a tree, in the style of WaveNet, fusing two characters at a time so context is combined progressively rather than crushed into one layer.

> A one-layer neural network trained with cross-entropy on one-hot inputs is a smoothed count table; everything after that is a way of not having to store the table.

**What did not survive:** the destination. Part 5 ends by pointing at recurrent architectures as the natural continuation, and that lecture never arrived — the course jumps to [a transformer](/foundation/book/karpathys-list?section=sec-1-4) instead. In hindsight that is the right call, and the series is honest enough to leave the seam visible. Part 5 is also the weakest of the five: the hierarchical model wins only modestly over the flat one, and a good part of the lecture goes on shape debugging and module plumbing rather than on the idea. That makes it an accurate depiction of what the work actually feels like, and a poor argument for dilated convolutions, which lost anyway.
