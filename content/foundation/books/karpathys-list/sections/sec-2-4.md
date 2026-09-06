**Andrej Karpathy · 2022 · [karpathy.github.io/lecun1989](https://karpathy.github.io/2022/03/14/lecun1989/)**

LeCun et al.'s 1989 zip-code paper is plausibly the first neural network trained end-to-end with backpropagation and deployed on a real task. Karpathy reimplements it in PyTorch, matches it, then applies thirty-three years of progress one change at a time and measures each. The result is the cleanest available answer to a question the field asks constantly and rarely tests: **which of our improvements actually did the work?**

The original is small in a way that is worth stating precisely. `9,760` parameters, `64K` multiply-accumulates per forward pass, `7,291` training digits, `23` epochs, **three days** on a SUN-4/260. Test error `5.00%`. A modern laptop does that forward pass a hundred million times a second.

The reproduction lands at `4.09%` test error, close enough that the reimplementation is faithful and the small gap is attributable to details the paper does not fully specify. Then the modernisations, each measured on the same data:

- **Cross-entropy instead of mean squared error**, and dropping the output `tanh`: test error `4.38%`, *worse*, and training error goes to `0.00%`. The model now overfits, which is progress of a kind — it means capacity is no longer the binding constraint.
- **AdamW instead of SGD**, with a tuned learning rate: `3.59%`.
- **Data augmentation** — one-pixel shifts, sixty epochs: `2.19%`. This is the single largest jump in the sequence.
- **Dropout at `0.25` and ReLU instead of `tanh`**: `1.59%`.
- **The dataset scaled to `50K` examples**, everything else held: `1.25%`.

So thirty-three years of algorithmic progress takes `4.09%` to `1.59%`, and then simply having more of the same data takes it to `1.25%` on its own. Karpathy's conclusion is blunt: "Simply scaling up the dataset in 1989 would have been an effective way to drive up the performance of the system, at no cost to inference latency." The 1989 team could not have known that, because the compute to exploit a larger dataset did not exist and neither did the dataset. But the ordering of levers is the finding, and it is the same ordering [A Recipe for Training Neural Networks](/foundation/book/karpathys-list?section=sec-2-2) gives as advice and the [scaling papers](/foundation/book/karpathys-list?section=sec-3-3) later give as a power law.

The extrapolation half of the post is the part people quote. Run the argument forward: the networks of 2055 are the same networks, roughly a million times larger, trained on far more data, and the 2055 reader will find our models as quaint as we find a `9,760`-parameter convnet. It is a deliberately unexciting prediction, and it has held for the four years since better than most exciting ones.

> Thirty-three years of algorithmic improvement cut the error by roughly sixty per cent; more of the same data, with no algorithmic change at all, cut a further fifth off that.

**What to be careful with:** the experiment measures one small convolutional network on one small dataset, and generalising from it to "algorithms barely matter" is a misreading the post does not commit but is often used to support. Two of the five modernisations — the augmentation and the dropout — are data-and-regularisation moves rather than architectural ones, which is precisely why they win on a `7,291`-example problem, and there is no reason to expect that ranking at `10^12` tokens. The genuinely architectural change of the intervening period, attention, is absent from the comparison entirely, because a digit classifier has no use for it. The honest summary is narrower than the popular one: at small scale, on a task where the model already fits, data and regularisation dominate. What the post establishes beyond that is a method — reproduce the old result exactly, then change one thing at a time and report every number, including the change that made it worse.
