# 1.2 Historical Trends in Deep Learning

Deep learning is old. The book opens its history by making that point deliberately, because the field's
apparent novelty in 2016 was mostly a naming artifact. The same ideas have surfaced three times under
three different banners, and each time the banner changed after the previous one had exhausted its
credibility.

## Three waves, three names

**Cybernetics, 1940s-1960s.** McCulloch and Pitts (1943) proposed a linear threshold unit whose weights
were set by hand. Rosenblatt's perceptron (1958) was the first model that *learned* its weights from
examples. ADALINE (Widrow and Hoff, 1960) trained a linear output by a rule that is stochastic gradient
descent in everything but name — still, essentially unchanged, the core of modern training. The wave
collapsed after Minsky and Papert (1969) proved that a linear model cannot represent XOR. The proof was
correct and the inference drawn from it was not: it was read as a verdict on neural networks generally
rather than on linear ones specifically.

**Connectionism, 1980s to mid-1990s.** The organising idea was the **distributed representation** — that
a concept should be a pattern across many units rather than one unit, so that $n$ features with $k$
values each describe $k^n$ concepts. Back-propagation (Rumelhart, Hinton and Williams, 1986) made
training practical, and LSTM (Hochreiter and Schmidhuber, 1997) solved long-range credit assignment. The
wave ended not because the methods failed but because they were oversold: venture funding arrived on
promises of human-level AI, and kernel methods and graphical models delivered better results on the
benchmarks of the day with cleaner theory.

**Deep learning, 2006 onward.** Hinton (2006) showed that a deep belief network could be trained by
greedy layer-wise unsupervised pretraining; Bengio and Ranzato extended the idea to other architectures
in 2007. The term "deep learning" was adopted in part to distance the work from the two previous
failures. Within six years, supervised training with more data and better hardware had made the
pretraining step unnecessary — the technique that reopened the field was discarded by the field it
reopened.

## What actually changed

The book is unusually direct about this: the algorithms of 2016 were "fairly similar" to those of the
1980s. What changed was scale.

- **Data.** Digitisation put labelled sets within reach. The rule of thumb the authors give — around
  5,000 labelled examples per category for acceptable performance, and roughly 10 million to match or
  exceed human performance — is the most quoted number in the chapter.
- **Model size.** Network size has roughly doubled every 2.4 years. As of 2016 the number of
  *connections per neuron* had reached the mammalian range, but total neuron count was still around that
  of a frog. Extrapolating the doubling put human-brain scale somewhere in the 2050s.
- **Accuracy and reach.** ILSVRC top-5 error fell from about 28% in 2010 to below 4% by 2015, and the
  field moved from toy digits to production speech, translation and vision.

## My take

The neuron-count extrapolation is the part of this chapter that has aged worst, and it is worth noticing
why. It projected a smooth exponential and got the mechanism wrong: after 2018 parameter counts jumped by
orders of magnitude in a few years, driven by capital and interconnect rather than by any biological
ceiling. The 2.4-year figure described a funding regime, not a law.

What has held up is the deflationary argument. Three waves, three collapses, each following a period when
the field's promises outran its results — that pattern is the most useful thing in Chapter 1, and the
reason to read it before anything else in the book.
