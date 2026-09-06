# 5.3 Hyperparameters and Validation Sets

Short, and about a discipline rather than an algorithm. Most of the value is in one argument about why a
third split of the data is necessary.

## Hyperparameters

A **hyperparameter** is a setting that controls the algorithm's behaviour and is not adapted by the
learning algorithm itself — polynomial degree, weight-decay coefficient, learning rate. Sometimes a
setting is made a hyperparameter simply because it is hard to optimise; more often because optimising it
on the training set would be actively wrong.

The book gives the clean case: any hyperparameter controlling capacity, if chosen by minimising training
error, will always select maximum capacity. Polynomial degree will go to infinity and weight decay to
zero. The failure is not incidental to the method — it is what the training objective *wants*.

## The validation set

The fix is a third partition. Split the training data — the book suggests roughly 80/20 — into a subset
used to fit parameters and a **validation set** used to choose hyperparameters. Both come from the
training data; the test set is touched by neither.

The reason for keeping the test set separate is that validation error **underestimates** generalisation
error, typically by a small amount, because hyperparameters were selected using it. Any data used to make
a choice is no longer a clean estimate of performance on unseen data.

## Cross-validation

When the dataset is small, a validation split leaves too few examples for a reliable estimate. **k-fold
cross-validation** partitions the data into $k$ subsets, trains $k$ times with a different subset held
out each time, and averages the resulting errors. The cost is $k$ training runs. The book notes a real
limitation: no unbiased estimator of the variance of this average is known, so confidence intervals over
cross-validated results rest on approximations.

## My take

The single most common methodological failure in applied machine learning is described in this two-page
section, and it is rarely committed in one obvious step. It happens gradually: a test-set number is
checked, an architecture is adjusted, the number is checked again. After twenty such cycles the test set
has become a validation set, and the reported figure is optimistic by an amount nobody can quantify.

This is also the sharpest thing to say about benchmark culture. A public leaderboard is a test set that
thousands of researchers have selected against, which makes it a validation set for the field as a whole.
The steady progress on ImageNet after 2015 is partly real and partly this effect, and the studies that
built fresh test sets for CIFAR-10 and ImageNet found consistent accuracy drops on the new data — exactly
the gap this section predicts.

The practical rule is to fix the number of test-set evaluations in advance and treat each one as
expensive. It is not a technical constraint but a procedural one, which is why it is so often ignored.
