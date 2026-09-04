# 1.1 Who Should Read This Book?

The authors name two audiences and, usefully, decline to write for both at once. The first is
university students — undergraduate or graduate — starting a career in machine learning. The second
is working software engineers with no machine-learning background who need to acquire it quickly to
ship something. The book is built so that each group can skip a different third of it.

## The two paths through the book

Part I is the applied mathematics and machine-learning background: linear algebra, probability,
numerical computation, and a compressed course in classical machine learning. The authors expect the
student audience to skim it and the engineering audience to read it properly. Part II is the deep
networks that are actually deployed in industry, and is the common core both audiences need. Part III
is the research frontier — generative models, inference, structured probabilistic models — and is
aimed at whoever intends to publish rather than deploy.

The prerequisite the authors do insist on is comfort with programming and a willingness to treat
calculus and linear algebra as tools rather than obstacles. They are explicit that no prior machine
learning is assumed.

## Why the structure matters

The three-part split is the book's real argument: that deep learning is not a bag of architectures
but a stack, and that the mathematics underneath it is load-bearing rather than ceremonial. A reader
who skips Part I and goes straight to convolutional networks can implement them, but cannot reason
about why a particular optimiser stalls or why an initialisation scheme matters.

The notation section that follows is worth reading once and returning to — the book is consistent
about it, and later chapters lean on that consistency. For example, a gradient step on parameters
$\theta$ with respect to a cost $J$ is written throughout as

$$
\theta \leftarrow \theta - \epsilon \nabla_\theta J(\theta)
$$

and the meaning of every symbol in that line is fixed in Chapter 2 rather than re-explained.

## My take

The engineering path is undersold. Reading Part I properly — rather than skimming it as the authors
permit — is what makes the rest of the book compress instead of accumulate. The chapters on
regularisation and optimisation only make sense as a single idea if the probability chapter is
already in place.
