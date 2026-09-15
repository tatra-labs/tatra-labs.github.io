**Lilian Weng · 2024 · [Lil'Log](https://lilianweng.github.io/posts/2024-02-05-human-data-quality/)**

The best post on this list, and the one with the fewest citations relative to its importance. It opens by quoting Sambasivan et al.: **"Everyone wants to do the model work, not the data work."** What follows is the data work, taken seriously, in two halves — how humans produce labels, and how models can find the bad ones.

The first half treats annotation as a designed process rather than a procurement exercise: task design, rater selection and training, and the aggregation step where several judgements become one label.

**Rater agreement is where the trouble starts.** The standard instinct is to treat disagreement as noise and push agreement up until it goes away. The post argues at length that this is often wrong, and the argument turns on one distinction.

**Prescriptive versus descriptive annotation.** A *prescriptive* paradigm writes a detailed guideline and enforces a single correct label, treating any deviation as rater error. It produces clean data, and it works when there genuinely is a right answer. A *descriptive* paradigm accepts that some items have more than one defensible reading, and tries to capture the spread of judgements rather than collapsing it.

Now apply that to the questions safety work is actually made of — subjective, cultural, identity-laden ones. On those, forcing convergence does not discover the truth. It **deletes the evidence that the question was contested at all.**

The methods follow from taking this seriously. **MACE** models each annotator's competence and trustworthiness explicitly, so an unreliable rater gets discounted rather than averaged in. **Jury learning** goes further: model *individual* annotators, including demographic information, then convene a jury and report what a chosen composition would decide — which turns "whose judgement is this?" into an explicit parameter rather than an accident of who happened to be hired.

The second half turns to finding mislabelled examples without retraining the model for each one. **Data maps** plot every training example by how confident the model is about it and how much that confidence wobbles across training, and the resulting picture sorts itself into three regions: easy-to-learn, hard-to-learn, and ambiguous. Mislabelled items cluster in the hard-to-learn corner. **Area Under the Margin** tracks the gap between the assigned label's score and its strongest competitor over training, which stays low or negative when the label is wrong. **Influence functions** estimate how much removing a single example would move the model, approximating the answer to "what if we had left this one out?" without actually retraining.

> Annotator disagreement is not always noise to be minimised — on subjective questions it is a measurement of how contested the item is, and aggregation is the step where that measurement is thrown away.

**What has happened since, and it runs directly against this post.** The field went hard toward synthetic preference data. [RLAIF](/foundation/book/karpathys-list?section=sec-4-4) established that model-generated labels are not detectably worse on many tasks at a fraction of the cost, and that is now the default.

But a model labeller returns **one confident verdict** — no spread, no demographic composition, no disagreement to inspect. Every concern in this post applies with more force to a pipeline whose annotator is a single model whose biases are correlated across every item it touches. And unlike a panel of humans, you cannot even measure the disagreement, because there is only one of it.

The same problem sits inside every reward model. A reward model maps a response to **one number**, trained on aggregated preferences — the prescriptive paradigm, hard-coded into the architecture of alignment. It cannot represent "half of thoughtful people would prefer the other answer", so a system optimising against it is driving toward the majority of an aggregate that may correspond to no actual person's preference. That is the honest version of InstructGPT's "aligned to whom", and this post is where the tools for asking it properly are laid out.
