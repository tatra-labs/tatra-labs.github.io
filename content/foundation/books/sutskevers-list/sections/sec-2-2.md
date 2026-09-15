**Christopher Olah · 2015 · [colah.github.io](https://colah.github.io/posts/2015-08-Understanding-LSTMs/)**

The character RNN of the previous section trains, but it cannot remember far back. Here is why, and it is worth getting straight because the fix defines everything that follows.

To learn, the network traces its error backwards through time: from the current step to the one before, then the one before that. Each step back multiplies the error signal by the same recurrent weight matrix $W$, and by a second term from the $\tanh$ that is never greater than 1. Multiply a number by roughly the same factor a hundred times and only two things can happen — it collapses to nothing, or it explodes. So an error signal that has to travel a hundred steps arrives as noise or as an overflow. This is the **vanishing gradient problem**, and Hochreiter (1991) and Bengio et al. (1994) had shown exactly why it happens.

The LSTM (Hochreiter & Schmidhuber, 1997) had been the standard answer for eighteen years. But its published descriptions were coupled equations and names — constant error carousel, gate units — that told you nothing about what actually moved where. Plenty of people trained LSTMs out of a library with no mental picture of the cell at all.

**Olah's post, dated 27 August 2015, supplies the picture.** The cell state $C_t$ runs as a horizontal line straight across the top of the diagram, touched by exactly one multiply and one add — "kind of like a conveyor belt". Everything else in the cell is machinery deciding what gets put on the belt and what comes off it. A **gate** is the tool for that: a sigmoid layer feeding a pointwise multiply. The sigmoid emits a number between 0 and 1 for each component, and multiplying by it means 0 blocks that component entirely, 1 lets it through untouched, and values in between let through a fraction. A gate is a set of valves.

Three gates read the same thing — the previous output and the current input, stuck together as $[h_{t-1}, x_t]$ — and each does one job. The forget gate $f_t$ decides how much of the old cell state to keep. The input gate $i_t$ decides how much of a proposed new value $\tilde C_t = \tanh(W_C \cdot [h_{t-1}, x_t] + b_C)$ to write in. The two combine by addition, which is the crucial part:

$$
C_t = f_t \odot C_{t-1} + i_t \odot \tilde C_t
$$

The output gate $o_t$ then sets how much of the state is exposed to the rest of the network, giving $h_t = o_t \odot \tanh(C_t)$. Olah runs a language-model example through it: a cell holding the current subject's gender so that a pronoun later in the sentence agrees with it, cleared out when a new subject arrives.

**The gradient fix falls straight out of the update's shape.** Ask how the cell state at one step depends on the cell state at the last, and the answer is just $f_t$, component by component — no weight matrix, no squashing function. So wherever a unit's forget gate sits near 1, error travels back through it across many steps essentially undamaged. The conveyor belt is a road the gradient can walk down.

The post became *the* reference explanation, and the conveyor belt is now the default drawing of an LSTM. It also surveys the variants without picking a winner: peephole connections, coupled forget and input gates, and the GRU (Cho et al., 2014), which merges forget and input into one update gate and folds the cell state into the hidden state. Olah reports Greff et al. (2015) finding the popular variants "all about the same", and Jozefowicz et al. (2015) testing more than ten thousand architectures, some better than LSTMs on particular tasks. It earns its place because the gated additive path it makes visible outlived the LSTM itself: the residual stream in a Transformer is this same trick with the gates taken out.

> Keep a channel that is only scaled and added to, never pushed through a weight matrix, and gradients will travel along it.

**The caveat:** the post asserts the gradient fix rather than deriving it, and the conveyor-belt image suggests LSTMs cannot forget. They can. The cell-state path accumulates the product of all those forget gates, so a unit whose $f_t$ settles below 1 decays error at its own exponential rate — the original problem, slowed down rather than removed. Olah credits the architecture to Hochreiter & Schmidhuber (1997) and leaves refinements to a footnote, so the forget gate reads as original; Gers, Schmidhuber and Cummins added it in 2000. His closing prediction, that attention was the next big step, named the right mechanism and the wrong carrier: attention arrived and then deleted the recurrence this post explains.
