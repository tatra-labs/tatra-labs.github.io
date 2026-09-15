**Schick, Dwivedi-Yu, Dessi, Raileanu, Lomeli, Zettlemoyer, Cancedda & Scialom · 2023 · [arXiv:2302.04761](https://arxiv.org/abs/2302.04761)**

Language models are unreliable at arithmetic, cannot know today's date, and cannot look anything up. All three are solved problems for ordinary software, so the question is not how to make the model better at them but how to make it **call something that already is** — and, harder, how it learns *when* calling is worth it. Toolformer's answer requires no human supervision of tool use whatsoever, and the trick that makes it work is why the paper is on this list.

The pipeline has three steps.

**Sample.** Given a handful of human-written examples of a tool being used, prompt the model to insert candidate API calls into a large body of ordinary text, at whatever positions it guesses a call might belong.

**Execute.** Run each candidate call and capture what comes back.

**Filter** — and this is the whole idea. Keep a call only if **inserting its result makes the tokens that follow easier to predict.**

That filter converts an unanswerable question into a measurable one. "Was this tool call appropriate?" needs a human to decide. "Did knowing the answer make the rest of the sentence easier to predict?" is a number the model computes for itself, using the same objective it was already trained on. A calculator call placed before a number the model would otherwise have to guess lowers the loss on that number. A calculator call in the middle of a paragraph about poetry does not, and is discarded. Then fine-tune on whatever survived, so the model learns to emit exactly the calls there was evidence for.

Five tools were used: a calculator, a question-answering system, a Wikipedia search, a calendar and a translator. The base model was GPT-J at `6.7B` parameters, and after tool training it beat substantially larger models on the tasks those tools addressed, without degrading its general language modelling — a claim the paper checks rather than assumes.

> Whether a tool call was worth making is not a judgement call — it is whether the result lowered the loss on what came next, which the model can evaluate for itself.

**What did not survive:** the shape of the interaction. Toolformer's calls are single-shot and non-interactive — emit a call, splice in one result, carry on generating. Real agentic work is a loop: call, read, notice the result is an error or is not what you wanted, call something else, repeat. Nothing in this design can express that. Tool use is now taught through instruction data and reinforcement learning against whether the task actually succeeded, standardised at the interface level by function-calling APIs and protocols like MCP rather than by a learned in-line syntax.

The perplexity filter has a specific limitation that explains why it did not generalise: **it can only detect a tool whose benefit is local.** A call whose result matters five hundred tokens later, or one that matters for whether the final answer is right rather than for the next few words, is invisible to the filter and gets thrown away. That covers most of what an agent actually does, which is why rewards based on task outcomes replaced it.

What deserves to survive, and largely has not, is the discipline. The dominant approach now is to hand a model a large catalogue of tools and hope instruction tuning teaches restraint — which produces agents that call tools they did not need and skip ones they did. Toolformer's question, *is there evidence this call helped*, remains the right one to ask, and almost nobody measures it.
