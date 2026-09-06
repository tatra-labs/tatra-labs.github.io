# 7.7 Multi-Task Learning

Train one model on several tasks at once, and the shared part of the model is regularised by having to
serve all of them.

## The structure

Examples from different tasks are pooled, and the model is split into two kinds of parameters:

- **Task-specific parameters**, which sit near the output and learn only from their own task's examples.
- **Generic parameters**, shared across all tasks, which learn from the pooled data of every task.

The typical arrangement is a shared lower stack producing a representation $h^{(\text{shared})}$, with
separate heads on top. The book notes that the shared parameters can often be assigned better
statistically because they are constrained by more data — the sample size for the shared part is the sum
across tasks, not the size of any one of them.

## The assumption

Improved generalisation depends on a prior belief the book states explicitly: among the factors
explaining the variation in the data for each task, some are **shared across two or more tasks**.
Multi-task learning encodes the assumption that different tasks arise from a common pool of underlying
causes. When it holds, each task acts as a source of evidence about that pool. When it does not, the
tasks compete for capacity and each is worse off.

## My take

This is a two-page section describing what became the default way of building large models, and the
vocabulary here is the right one for reading the modern version.

A pretrained backbone with task heads is exactly the structure above. So is a multilingual translation
model, and so is instruction tuning across a mixture of task formats. What changed is the number of tasks
and the source of the sharing: rather than a handful of tasks chosen because a designer believed they
shared structure, modern training uses thousands of implicit tasks arising from a single next-token
objective over heterogeneous text, and the sharing is discovered rather than asserted.

The failure mode the section does not name is **negative transfer**, and it is the reason multi-task
learning is harder in practice than the description suggests. Tasks that conflict pull the shared
parameters in incompatible directions, and the model ends up worse at each than a dedicated model would
be. Task weighting, gradient surgery and mixture-of-experts routing are all responses to it. Sparse
mixture-of-experts is the interesting one philosophically: it lets the model decide *how much* to share
per input, rather than fixing the shared and specific parameters in advance as this section does.

The statistical framing remains the best justification. Sharing parameters means the shared part sees
more data, and more data is the most reliable regulariser there is.
