**Andrej Karpathy · 2019 · [karpathy.github.io/recipe](https://karpathy.github.io/2019/04/25/recipe/)**

The essay opens on two claims that together explain why training is harder than it looks. The first is the one from [the backprop essay](/foundation/book/karpathys-list?section=sec-1-2), generalised: neural network training is a leaky abstraction, and the `model.fit()` interface promises a plug-and-play experience the underlying process cannot deliver.

The second is sharper and does more work. **Neural network training fails silently.** Everything is syntactically valid, no exception is raised, the loss goes down, and the model is quietly worse than it should be. There is no other part of software engineering where the ordinary failure mode is a working program that is wrong by twenty per cent.

The recipe is a defence against exactly that. Its organising principle is to move in small steps, verifying at each one, "from simple to complex", never adding two things at once.

**Become one with the data.** Before writing any code: hours spent scanning thousands of examples. Duplicates, corrupted files, wrong labels, class imbalance, the resolution the images actually are rather than the resolution the paper claims. The point is not diligence for its own sake — the patterns you find here determine the architecture, and almost every preprocessing bug is visible to a human in twenty minutes and invisible to a loss curve forever.

**Set up the skeleton and get dumb baselines.** Fix the random seed. Turn augmentation off. Then a battery of checks, and this list is the most valuable page in the essay:

- **Verify the loss at initialisation is what the maths says.** An untrained classifier should be guessing uniformly, giving `-log(1/n_classes)` — so `2.303` for ten classes. If it is not, the final layer is badly initialised and the first stretch of training is wasted undoing that.
- **Initialise the final bias to the base rates**, so the model starts out already knowing how common each class is rather than having to learn it.
- **Run an input-independent baseline** by zeroing the inputs. It must do worse than the real thing. If it does not, your model is ignoring its input entirely and you would never know.
- **Overfit a single batch** of two examples all the way to zero loss. If it cannot memorise two examples, nothing else matters and no amount of tuning will save it.
- **Visualise the tensor immediately before it enters the network**, after all augmentation — because that is exactly where preprocessing bugs live and nowhere else will show them.
- **Use backpropagation as a debugger.** Set the loss to depend only on example `i`, then confirm the gradient is nonzero only at `i`. This one check catches every accidental leak of information across the batch or across time, a bug class that otherwise produces a model that looks fine and cheats.

**Overfit, then regularise.** Get a model large enough to drive training loss to zero before worrying about how it generalises. "Don't be a hero" — take the architecture from the nearest paper and change it later. Adam at `3e-4` is the safe default. Then add regularisation in a stated order, of which the first item is *get more data* and everything else is a substitute for it.

**Tune, then squeeze.** Random search rather than grid search, because most hyperparameters do not matter and a grid spends its budget proving that. Ensembles for a reliable couple of points. Then leave it training much longer than seems reasonable.

> The failure mode of neural network training is a program that runs correctly and learns badly, so the discipline is a sequence of assertions that each catch one specific silent failure.

**What did not survive:** the era. The recipe assumes you are training a model from scratch on a dataset you control, which in 2019 was what almost everyone did and in 2026 is what almost nobody does. Most work now starts from a pretrained checkpoint, and the failure surface has moved to data mixtures, contamination between fine-tuning and evaluation sets, chat templates that silently differ between training and inference, and reward models that are themselves learned. `3e-4` on Adam is no longer a sensible default at any scale that matters. What transfers completely is the epistemology — verify the loss at initialisation, overfit one batch, check the gradient reaches only where it should — and it transfers because those checks are all about whether information is flowing where you think it is, which is exactly what nobody can see in a fine-tuning stack either. Karpathy has not rewritten it for the pretrained era. Somebody should.
