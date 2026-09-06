# 2.1 Scalars, Vectors, Matrices and Tensors

This section is bookkeeping, and the book treats it that way: four object types, a notation for each, and
two operations. It is worth reading once carefully because every later chapter assumes the conventions
without restating them.

## The four objects

A **scalar** is a single number, written in italics: $s \in \mathbb{R}$. A **vector** is an ordered array
of scalars, written in bold lowercase $x$, with elements $x_1, x_2, \ldots, x_n$; a vector in
$\mathbb{R}^n$ is a point in $n$-dimensional space. A **matrix** is a 2-D array, bold uppercase $A$, with
entry $A_{i,j}$ at row $i$ and column $j$, and shape written $A \in \mathbb{R}^{m \times n}$. A **tensor**
is the generalisation to any number of axes.

Two indexing conventions recur constantly and are easy to misread: $A_{i,:}$ is the $i$-th row and
$A_{:,i}$ is the $i$-th column. The authors also allow a set of indices, so $x_S$ selects the elements of
$x$ whose positions lie in $S$.

## Transpose and broadcasting

The **transpose** mirrors a matrix across its main diagonal:

$$
B = A^{\top} \iff B_{i,j} = A_{j,i}
$$

A vector is treated as a matrix with one column, so a row vector is written $x^{\top}$; a scalar is its
own transpose.

**Broadcasting** is the one genuinely modern convention here. The book permits

$$
C = A + b
$$

where $b$ is a vector and the addition is applied to every row of $A$ — the vector is implicitly copied
to the required shape. This is not standard linear-algebra notation. It is deep-learning notation,
adopted because adding a bias vector to a batch of activations is the single most common operation in
the field, and writing the copy explicitly every time would be noise.

## My take

The tensor definition here is thinner than a reader coming from physics or differential geometry
expects, and that is intentional. In this book a tensor is *an array with more than two axes* — nothing
about covariance, basis independence or multilinear maps. Arriving with the geometric definition in mind
means waiting for structure that never comes.

The broadcasting rule is the part to actually internalise. It is the source of a whole category of silent
bugs in practice: a shape mismatch that NumPy or PyTorch resolves by broadcasting instead of raising,
producing an output of the wrong rank that then trains to a plausible-looking loss. The notation makes
the operation invisible, which is exactly why it goes unnoticed in code.
