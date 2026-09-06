# 5.8 Unsupervised Learning Algorithms

Unsupervised learning is defined here in practical terms — algorithms that see only features, no labels —
and then given a purpose: finding a "better" representation of the data.

## What makes a representation better

The book's answer is that a good representation is one that is simpler than the input while preserving as
much information as possible, and it names three overlapping notions:

- **Low-dimensional** — the same information compressed into fewer values.
- **Sparse** — most entries zero for most inputs, so the representation spreads information along the
  axes and each active unit carries more meaning.
- **Independent** — the dimensions are statistically independent, disentangling the factors of variation
  that generated the data.

These are not mutually exclusive, and most methods pursue more than one.

## Two algorithms

**PCA**, already derived in 2.12, is presented here as a representation learner. It produces a
lower-dimensional code, and it also **decorrelates** the data: the transformed representation has a
diagonal covariance, so the linear dependencies between the original features have been removed. It is
the simplest instance of a disentangling algorithm, and the book is careful that it removes only
*linear* dependence.

**k-means clustering** partitions the data into $k$ groups by alternating two steps: assign each example
to the nearest centroid, then move each centroid to the mean of its assigned points. The output is a
**one-hot** representation — an extreme form of sparsity, one active unit per example.

The book uses k-means to raise a real objection to one-hot codes. They lose all information about
similarity within a cluster, and they force the algorithm to commit to a single grouping when several
valid ones exist. Objects could be clustered by colour or by species; a one-hot code must pick one, while
a distributed representation can encode both at once with separate units.

## My take

The three criteria are the most useful thing here, because they are how to read the whole of Part III.
Chapter 13 pursues independence, Chapter 14 pursues low dimensionality and sparsity, and Chapter 15
pursues disentanglement explicitly. The chapters make more sense when read as different attacks on this
list than as a sequence of model families.

The critique of one-hot representations is the seed of Section 15.4 and worth carrying forward, because
it is the argument that distinguishes deep learning from clustering. A one-hot code over $k$ clusters
distinguishes $k$ things; a distributed code over $k$ binary units distinguishes $2^k$. That exponential
gap is the reason deep networks generalise to configurations they never saw, and it is stated for the
first time here in a discussion of k-means.

Where the section has dated is its implicit assumption that unsupervised learning means dimensionality
reduction or clustering. The unsupervised methods that actually scaled are neither. Next-token prediction
and contrastive learning both produce representations that are high-dimensional and dense, and neither
is trying to compress or to cluster. What they share with this section is only the goal — a
representation better than the raw input — and not a single one of its three criteria.
