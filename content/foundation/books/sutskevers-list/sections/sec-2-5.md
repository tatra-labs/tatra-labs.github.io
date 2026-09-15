**Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser & Polosukhin · 2017 · [arXiv:1706.03762](https://arxiv.org/abs/1706.03762)**

Attention fixed the fixed-length bottleneck but left the recurrence underneath it, and recurrence has one fatal property: **it is a chain.** A recurrent encoder computes each state from the one before it, so a sequence of length $n$ costs $n$ steps that must happen in order, no matter how wide your GPU is. You can process many examples at once, but within a single sentence you can do nothing in parallel. Convolutional sequence models cut the number of sequential steps but still needed a deep enough stack for distant positions to reach one another, so the number of layers between two tokens grew with the distance between them. The constraint was the time axis itself.

**The Transformer removes it by pointing the previous section's score-normalize-average recipe at a sequence and itself**, with a much cheaper scoring function. Every position emits a query (what am I looking for), a key (what do I offer), and a value (what I will hand over). Each output is a weighted average of all the values, with the weights coming from query-key dot products:

$$
\operatorname{softmax}\left(QK^{\mathsf T} / \sqrt{d_k}\right)V
$$

No small network, no recurrence, just one matrix multiply. **Every position can therefore be computed at the same time as every other.**

The $\sqrt{d_k}$ has a specific reason worth knowing, because it is a good example of how these models actually break. If the components of $q$ and $k$ are independent with mean 0 and variance 1, their dot product has variance $d_k$. At $d_k = 64$ the scores arrive with a standard deviation of 8 — big numbers, which push softmax into the region where one entry gets nearly all the weight and the gradients almost vanish. Dividing by $\sqrt{d_k}$ pulls the spread back to 1. The paper notes that without it, the older scoring network beats dot products at large $d_k$.

**Multi-head attention splits the work rather than widening it.** One softmax-weighted average blends everything into a single blur, which is a real limitation: a word usually stands in several relations at once — grammatical subject, topic, the thing a pronoun refers to. So instead of one attention over the full width of 512, the model projects into 8 separate heads of 64 dimensions each, attends inside each subspace in parallel, concatenates the results and projects back — at roughly the cost of a single full-width head. Eight heads can track eight relations.

One problem is left over. Attention treats its input as an unordered set — shuffle the words and the maths gives the same answer — so position has to be injected by hand. The paper adds sinusoids of geometrically increasing wavelength, $\operatorname{PE}(\text{pos}, 2i) = \sin\left(\text{pos} / 10000^{2i/d_{\mathrm{model}}}\right)$, with cosine in the odd dimensions, straight onto the input embeddings.

The payoff is in Table 1. A self-attention layer needs a constant number of sequential operations against $n$ for a recurrent layer, and the longest path any signal must travel between two positions is constant rather than growing with $n$. Cost per layer is $O(n^2 \cdot d)$ rather than $O(n \cdot d^2)$ — the cheaper side whenever the sequence is shorter than the model is wide, which is true of sentences and false of documents. The base model trained for 100,000 steps in 12 hours on eight P100 GPUs; the big model took 300,000 steps and 3.5 days, for 28.4 BLEU on WMT 2014 English–German and 41.8 on English–French.

> Deleting recurrence moved the sequence dimension out of time and into a matrix multiply, which turned scale into an engineering problem rather than an architectural one.

**What did not survive:** the positional encoding. The authors reported that simply learning the position vectors performed about the same, and chose sinusoids partly on the hypothesis that they would extrapolate to sequences longer than those seen in training — a hypothesis the paper did not test and that later work found weak. Absolute position gave way to relative schemes, then to rotary embeddings and ALiBi. The $O(n^2)$ term stayed, and is still the reason long context costs what it does.
