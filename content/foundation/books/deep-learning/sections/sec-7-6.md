# 7.6 Semi-Supervised Learning

A short section on using unlabelled data alongside labelled data, and on the assumption that has to hold
for it to help.

## The setting

Semi-supervised learning uses both unlabelled examples from $P(x)$ and labelled examples from
$P(x, y)$ to estimate $P(y \mid x)$. In deep learning this usually means learning a **representation**
$h = f(x)$ such that examples of the same class end up close together, so that a simple classifier over
$h$ succeeds where one over $x$ would not.

Rather than training separate unsupervised and supervised components, the book advocates constructing a
generative model of either $P(x)$ or $P(x, y)$ that **shares parameters** with a discriminative model of
$P(y \mid x)$. The generative criterion is then traded against the supervised one, expressing a belief
that the structure of $P(x)$ is connected to the structure of $P(y \mid x)$ — a belief the shared
parameterisation makes explicit.

## My take

The assumption is doing all the work, and the section says so more quietly than it should. Semi-supervised
learning helps only when the input distribution's structure is informative about the labels — when class
boundaries lie in low-density regions, or when the factors generating $x$ include the ones determining
$y$. When that fails, unlabelled data is not merely unhelpful; a shared parameterisation can make things
worse by spending capacity on structure irrelevant to the task.

What is striking from 2026 is how completely the framing here was overtaken. The book imagines
semi-supervised learning as a joint objective trained on one dataset with a partial label set. What
actually worked was to sever the two stages entirely: pretrain on an enormous unlabelled corpus with a
purely self-supervised objective, then fine-tune on a small labelled set. The **pretrain-then-adapt**
pipeline is the same bet — that $P(x)$ tells you about $P(y \mid x)$ — placed at a scale where it pays
off decisively, and with no shared training run at all.

The book's own scepticism about unsupervised pretraining in Section 15.1 makes this doubly interesting.
Written in 2016, the evidence was that pretraining had stopped helping in vision; the authors concluded,
reasonably, that it was a technique of historical interest. The conclusion was right for the methods and
data of the time and wrong about the idea, and the difference was three orders of magnitude of unlabelled
text.
