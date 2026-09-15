**Adam Santoro, Ryan Faulkner, David Raposo et al. · 2018 · [arXiv:1806.01822](https://arxiv.org/abs/1806.01822)**

The memory architecture of [the Neural Turing Machine](/foundation/book/sutskevers-list?section=sec-4-1) — a controller, a matrix of slots, heads that find slots by content — has a gap that is easy to miss: **the slots never touch each other.** A read is a lookup. It fetches a weighted average of rows chosen by similarity to a query, and nothing in the machinery ever compares slot 3 to slot 7.

So when a task turns on how two stored items *relate*, the controller has to fetch them on separate timesteps and rebuild the relation inside its own recurrent state, one pair at a time. Santoro et al. built a task specifically to expose this: show the model 8 randomly labelled 16-dimensional vectors, then ask which is the N-th farthest from vector M. Answering requires holding all the pairwise distances at once. Neither an LSTM nor a DNC exceeded 30% best-batch accuracy.

**The Relational Memory Core replaces lookup with interaction.** Memory is a matrix of $N$ rows, one per slot. At each timestep the new input is appended as an extra row, and the whole stack is pushed through multi-head dot-product attention — queries from the memory rows, keys and values from the memory rows plus the input. Each slot's proposed new content is therefore a weighted combination of *every other slot* and the new observation, $\operatorname{softmax}\left( QK^{\top} / \sqrt{d_k} \right) V$. That is the all-pairs interaction of the Relation Network with learned weights, turned sideways: applied across a fixed set of slots rather than backwards along a growing sequence. A residual connection and a row-wise MLP with layer normalisation follow, so slots stay compartmentalised through the feedforward step.

The recurrent half is ordinary LSTM machinery applied to each row. **Attention proposes, gates decide how much lands:**

$$
m_{i,t} = \sigma(f_{i,t} + \tilde b_f) \odot m_{i,t-1} + \sigma(i_{i,t}) \odot g_\psi(\tilde m_{i,t})
$$

with the gates computed from the input and the previous slot contents, and $\tilde b_f$ a learned forget bias. Slots persist, get overwritten under gating, and — the new part — see each other on the way. Note what this buys: compute per step is set by the number of slots, not by how long the sequence is, and the memory never grows.

On the N-th farthest task the RMC reached 91%. It also took state-of-the-art perplexity on WikiText-103 (31.6 test), Project Gutenberg (42.0) and GigaWord v5 (38.3) — a drop of 1.4 to 5.4 perplexity over the best published results, the paper says, a 5-12% relative gain. The architecture itself went nowhere. The idea inside it went everywhere: self-attention is useful as an operation on a model's own *state*, not only on its input sequence. Every later attempt to give a Transformer a compressed recurrent memory works this same seam.

> Memory gets more useful when its contents can be compared against each other rather than only retrieved one at a time.

**The caveat:** the language modelling numbers — the paper's most cited result — came from a model with **one memory slot**. The appendix reports "2500 total units, 4 heads, 1 memory, a 5-layer MLP, and 1 attention block", selected on WikiText-103 validation error. With a single slot there is no slot-to-slot attention at all, so the mechanism the paper is named after contributed nothing to its headline result; the gain came from attention over the input and the gated MLP. The relational claim rests entirely on the synthetic tasks and the RL domains, and that evidence is narrower than it looks: the RMC still solved N-th farthest at 32 dimensions, but only for a few seeds and configurations, as the paper notes.
