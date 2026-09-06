# 3.1 Why Probability?

Computer science is mostly deterministic. This section argues why machine learning cannot be, and the
argument is more interesting than the usual appeal to noisy data.

## Three sources of uncertainty

The book separates them cleanly:

1. **Inherent stochasticity.** The system being modelled is genuinely random — quantum mechanics, or a
   card game with a shuffled deck.
2. **Incomplete observability.** The system is deterministic but not fully visible. The Monty Hall
   problem is deterministic given where the prize is; the contestant's uncertainty is about what they
   cannot see.
3. **Incomplete modelling.** The model discards information deliberately. A robot that discretises space
   into a grid becomes uncertain about exact positions *because of a choice its designer made*.

The third is the one that matters for machine learning, and it comes with a claim the authors state
plainly: a simple but uncertain rule is usually preferable to a complex but certain one, even when the
complex rule is available. "Most birds fly" is a better model than a correct rule enumerating every
flightless species and every bird with a broken wing.

## Two readings of the word

**Frequentist** probability is a long-run rate: draw the hand many times and count. **Bayesian**
probability is a degree of belief, applicable to statements that happen only once — a doctor saying a
patient has a 40% chance of flu is not describing a repeatable experiment.

The book's position is that both obey the same rules. It cites the argument, going back to Ramsey and
Cox, that any system of reasoning under uncertainty satisfying a few common-sense desiderata reduces to
the axioms of probability. Probability is then not a special-purpose tool for randomness but an
**extension of logic to propositions that are not certain**: where logic gives true or false from true
or false, probability gives a likelihood from likelihoods.

## My take

The incomplete-modelling argument is the load-bearing one and it is easy to read past. It says that
uncertainty in a model is not a defect to be engineered away but a consequence of the abstraction the
model chose — which reframes the bias-variance discussion in Chapter 5 and the whole of Chapter 7. When
a network is regularised into being *less* able to fit the data, it is this argument being applied.

The logic-extension framing is also the honest answer to why cross-entropy is the default loss. It is not
a heuristic that happened to work; it is what maximum likelihood becomes when you accept probability as
the calculus of uncertain belief. Section 5.5 closes that loop.
