In 2022, John Carmack decided to move from graphics into AI and asked Ilya Sutskever what he should read. Sutskever gave him a list of around thirty papers and, as the story is always told, said: *"If you really learn all of these, you'll know 90% of what matters today."* Carmack later said he worked through all of them.

**Start with the provenance, because it is weaker than the internet suggests.** The list was never published by Sutskever or by Carmack. What circulates today — including the twenty-seven works catalogued here — is a community reconstruction, assembled from a [2024 social-media post](https://x.com/keshavchan/status/1787861946173186062) that cited no source, and since mirrored in [several](https://github.com/dzyim/ilya-sutskever-recommended-reading) [GitHub repositories](https://github.com/Justmalhar/ilya-sutskever-reading-list). Neither principal has ever confirmed it, a point raised repeatedly on [Hacker News](https://news.ycombinator.com/item?id=34641359). Carmack himself described "a list of like 40 research papers," which does not match the count.

So treat the framing as folklore and the contents as what they actually are: a coherent, unusually well-chosen syllabus of foundational deep-learning work. The reading list is worth doing whether or not Sutskever wrote it. That is the honest position, and it is the one taken throughout these notes.

**What makes the list distinctive is not the famous papers.** Anyone assembling a deep-learning reading list would include AlexNet, ResNet and *Attention Is All You Need*. What is unusual here is the other third: Hinton and van Camp on minimum description length, Grünwald's MDL tutorial, a textbook on Kolmogorov complexity, two pieces by Scott Aaronson on how to measure complexity, and Shane Legg's dissertation on formal definitions of intelligence.

Those are not architecture papers. They are information theory, and they encode a specific thesis — one Sutskever has argued publicly for years — that **learning is compression**. A model that predicts the next token well is a model that has found a short description of its training data, and finding short descriptions is what understanding *is*. Read that way, the list is not a survey. It is an argument, with the theory papers as the premise and the architecture papers as the evidence.

**How these notes are organised.** The circulating list is unordered. Reading it front to back means bouncing between a 1993 theory paper, a blog post about LSTMs, and a 2020 scaling-laws paper with no thread connecting them. I have regrouped the twenty-seven works into five parts that follow the argument rather than the shuffle:

- **1. Learning as Compression.** The theoretical spine: MDL, Kolmogorov complexity, and what "complexity" even means. Start here, and the rest of the list reads as one continuous claim.
- **2. Sequences and Attention.** The line from character-level RNNs through LSTMs and soft alignment to the Transformer.
- **3. Depth and Vision.** Why deep networks were hard to train, and the two ideas that fixed it.
- **4. Memory, Structure and Relations.** The road not taken, mostly: external memory, pointers, sets, graphs, relational modules.
- **5. Scale and Systems.** What happens when the engineering catches up, ending at the scaling laws.

Each entry gives the mechanism in enough detail to be useful without the paper open, then says plainly what did not survive. A good deal of this list did not survive. Neural Turing Machines are not in production anywhere. Dilated convolutions lost segmentation to Transformers. The scaling-laws paper's headline recommendation was corrected two years later. Saying so is more useful than reverence, and it is the only way a reading list from 2022 stays worth reading in 2026.

**One reading order, if the parts are too much:** Olah on LSTMs, then Bahdanau on attention, then *Attention Is All You Need* alongside *The Annotated Transformer* with the code running. That is the shortest path from nothing to understanding a modern language model. The compression papers in Part I are the ones people skip and the ones that change how you think.
