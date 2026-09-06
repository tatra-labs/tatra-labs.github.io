# 5.1 Learning Algorithms

Chapter 5 is a compressed machine-learning course, and it opens by defining its subject precisely enough
to be checkable.

## The definition

The book adopts Mitchell's formulation: a program learns from experience $E$ with respect to a class of
tasks $T$ and performance measure $P$ if its performance at tasks in $T$, as measured by $P$, improves
with experience $E$. The value of the definition is that it forces all three to be named. A vague claim
about a system "learning" becomes a claim about a specific task, a specific measure, and a specific
source of experience.

**The task, $T$.** Learning is the means, not the task; the task is what you want done. The book
enumerates a long list — classification, classification with missing inputs, regression, transcription,
machine translation, structured output, anomaly detection, synthesis and sampling, imputation of missing
values, denoising, and density estimation. Two entries are worth separating out. Classification with
missing inputs requires not one function but a *set* of them, one per subset of available inputs, which
is impractical unless the model instead learns a joint distribution and marginalises. And density
estimation is the most demanding, because a model of $p(x)$ can in principle answer all the others.

**The performance measure, $P$.** Usually **accuracy**, or equivalently **error rate** — the expected
0-1 loss. For continuous-output tasks a hard success/failure criterion makes no sense, and the average
log-probability of the data is used instead. The measure must be evaluated on a **test set**, held apart
from the data used for training. The book is candid that choosing $P$ is often the hardest part of the
design: what is easy to measure and what is actually wanted are frequently different things.

**The experience, $E$.** **Unsupervised** algorithms see a dataset of examples and learn structure in
$p(x)$; **supervised** algorithms see examples paired with labels and learn $p(y \mid x)$. The book
immediately blurs the line, and the argument is important: by the chain rule, an unsupervised problem
over $n$ variables decomposes into $n$ supervised ones, and a supervised problem can be solved by
learning the joint $p(x, y)$ and applying Bayes' rule. The two are conventions rather than distinct
formal categories.

Data is normally arranged as a **design matrix**, one row per example, one column per feature — which
requires every example to have the same shape, an assumption that fails for variable-length inputs and
motivates the architectures of Chapters 9 and 10.

## The worked example

Linear regression, $\hat{y} = w^{\top} x$, with $P$ the mean squared error on the test set. Minimising
the training MSE gives the normal equations, and the section notes the extension to an affine model with
a bias term — a term whose name comes from this offset, unrelated to statistical bias in 5.4.

## My take

The observation that supervised and unsupervised learning are not fundamentally distinct is the most
consequential paragraph in the section, and in 2016 it read as a technicality. It is now the entire
foundation of self-supervised learning: predicting the next token converts an unlabelled corpus into a
supervised problem via the chain rule, exactly as described here, with no annotation required. The book
states the principle and treats it as a definitional curiosity; a decade later it is the dominant
training paradigm in the field.

The remark about choosing $P$ deserves equal weight in the other direction. Most disappointing deployed
models are not optimisation failures — they are systems that maximised a measurable proxy while the thing
actually wanted went unmeasured.
