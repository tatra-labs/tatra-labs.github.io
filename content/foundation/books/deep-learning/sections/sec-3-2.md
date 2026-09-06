# 3.2 Random Variables

Half a page, and almost entirely notation. It is worth pausing on anyway, because the notational
distinction introduced here is used silently for the next three hundred pages.

## The definition and the convention

A **random variable** is a variable that can take on different values at random. On its own it is just a
description of *what values are possible* — it says nothing about how likely each is. Pairing it with a
probability distribution is what makes it useful.

The book writes random variables in lowercase italic sans-serif, $\mathrm{x}$, and the values they may
take in ordinary italic, $x$. So $\mathrm{x} = x$ reads as "the random variable $\mathrm{x}$ takes the
value $x$". For vector-valued variables the variable is bold, $\mathbf{x}$, and an individual element is
$\mathrm x_i$.

Random variables are **discrete** — finite or countably infinite states, not necessarily numeric, since
the states may just be labels — or **continuous**, taking real values.

## My take

The typographic distinction between a random variable and its value is genuinely useful and almost
universally dropped, including later in this book and in essentially all papers. The reader is expected
to infer from context whether $p(x)$ means a function of the value, the distribution of the variable, or
the number obtained by evaluating one at the other.

Two consequences of that overloading are worth pre-empting, because both cause real confusion later:

**$p(x)$ can mean several things.** In Chapter 5, $p(x)$ appears as a data-generating distribution, as a
model, and as an empirical distribution over a finite sample, sometimes within one derivation. Keeping
track of *which* is nearly all of the difficulty in reading the maximum-likelihood arguments.

**Discrete states need not be numbers.** The definition permits states that are merely labels, which is
what licenses treating a softmax over vocabulary tokens as a probability distribution even though the
tokens have no arithmetic. Section 6.2.2 relies on this without restating it.
