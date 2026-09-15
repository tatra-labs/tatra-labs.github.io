This list has an advantage the other two do not: **a large part of it is something you can run.** So the route through it for a beginner is not really a reading order, it is a building order, and that is the strong recommendation of this page.

**Do this first.** Watch the [talk](https://www.youtube.com/watch?v=zjkBMFhNj_g) — one hour, no preparation needed, and it gives you the map that every chapter here hangs off.

**Then work chapter 1, with an editor open.** That is the whole recommendation. Zero to Hero is eight lectures and about twenty hours, and it is the highest-value twenty hours available anywhere on this subject. The order is already correct:

1. [micrograd](/foundation/book/karpathys-list?section=sec-1-1) — a hundred lines that compute gradients. Once you have written this, backpropagation stops being a word.
2. [makemore](/foundation/book/karpathys-list?section=sec-1-3) — build a bigram model twice, by counting and by gradient descent, and watch them arrive at the same answer.
3. [Let's build GPT](/foundation/book/karpathys-list?section=sec-1-4) — attention derived as the fourth way of writing "average the previous tokens". This is the one to watch twice.
4. [The tokenizer](/foundation/book/karpathys-list?section=sec-1-5) — why models cannot spell.

**Then read two chapters and skim the rest.** [Chapter 4](/foundation/book/karpathys-list?section=sec-4-1) is where a model stops being a curiosity and becomes something you can talk to — the single most useful thing to understand if you are building anything. [Chapter 7](/foundation/book/karpathys-list?section=sec-7-3) is the one that will be your problem in production, and it is the chapter most reading lists drop. Chapters 3, 5 and 6 you can take as the talk gives them: fast, and out of order.

### Words that keep coming back

A **token** is a chunk of text — usually part of a word — and a model sees only a sequence of these, never letters. **Tokenization** is the procedure that decides which chunks exist, and it is settled before training starts.

A **parameter** or **weight** is one of the numbers inside the model. **Training** means adjusting them; **inference** means running the finished model. Costs are paid in both places, and confusing the two is the most common mistake in reasoning about the economics.

**Pretraining** is the long, expensive phase where a model learns to predict the next token over a vast corpus. It produces a **base model**, which completes text and does not answer questions. **Post-training** is everything done afterwards to make it useful — instruction tuning, preference tuning, and reinforcement learning. Chapter 4 is entirely about this, and the gap between the two is the subject of the list's best joke: ask a base model a question and it is quite likely to reply with another question.

**Fine-tuning** is further training of an existing model on a smaller, more specific dataset. **RLHF** is reinforcement learning from human feedback: people rank the model's answers, a second model learns to imitate their rankings, and the first model is optimised against that.

The **context window** is how much text a model can consider at once. Everything the model is working from — your question, the conversation, any retrieved document — lives inside it, and nothing outside it exists as far as the model is concerned.

**Attention** is: score how relevant each token is to the one being computed, turn those scores into weights that sum to one, then take a weighted average. Everything else in a transformer exists to make that step trainable.

**Inference-time** or **test-time compute** means work done while answering rather than while training — thinking longer about a harder question. Chapter 5 is the story of the field discovering this was a dial it could turn.

**Hallucination** is a model stating something false with the same fluency it states something true. **RAG** — retrieval-augmented generation — is the standard partial fix: look the facts up, paste them into the context, then answer.

A **benchmark** is a fixed set of test questions with known answers. **Contamination** is when those questions were in the training data, which makes the score meaningless and is much more common than reported scores imply.

### Two habits worth borrowing from this list specifically

**Type it.** Karpathy's whole argument is that reading about a system and having built one are different states of knowledge, and he has spent a decade making the second one cheap. Chapter 1 exists so you can take him up on it.

**Look for what did not survive.** Every entry here closes by naming the part of the work that was scaffolding. The transformer paper's own positional encoding is gone. Chain-of-thought as a prompting trick is gone, absorbed into training. Tree of Thoughts is gone. Telling the durable idea apart from the thing built around it is most of what it means to read this material well — and it is the difference between learning the field and memorising its current configuration.
