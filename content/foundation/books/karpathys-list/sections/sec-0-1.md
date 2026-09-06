In November 2023 Andrej Karpathy posted a one-hour talk, *[Intro to Large Language Models](https://www.youtube.com/watch?v=zjkBMFhNj_g)*, that walks from "a language model is two files on a laptop" to jailbreaks and prompt injection without ever slowing down. More than thirty papers go past on screen. Within weeks a reading list was circulating under his name, and it is still being reposted as **"Andrej Karpathy's LLM Paper Reading List for LLM Mastery."**

**Start with the provenance, because there is less of it here than there was for Sutskever.** That list traces to a [Towards AI article](https://towardsai.net/p/data-science/andrej-karpathy-llm-paper-reading-list-for-llm-mastery) by Youssef Hosni, mirrored since onto Medium, Kaggle and LinkedIn. It cites no talk, no post, no repository — nothing by Karpathy at all. Where the Sutskever list has a contested origin story, this one has a headline and seven papers you would have guessed unaided: *Attention Is All You Need*, GPT-2, InstructGPT, Llama 2, Chinchilla, RLAIF, *Sparks of AGI*. I have kept a note on it in [Sutskever's List](/foundation/book/sutskevers-list?section=sec-0-1) about treating folklore as folklore. The same applies, harder.

So I did not use it. **These notes are built from two things Karpathy actually published**, which between them are a far better syllabus than the listicle:

- **The talk's citations.** Greg Schoeninger of Oxen.ai sat through the hour and [catalogued every work referenced](https://www.oxen.ai/blog/reading-list-for-andrej-karpathys-intro-to-large-language-models-video) — around thirty-four papers, books and repositories. He is explicit that he compiled it, which is the honest way to do this. That catalogue is the backbone of chapters 3 to 7 here.
- **His own artifacts.** [Neural Networks: Zero to Hero](https://github.com/karpathy/nn-zero-to-hero), eight lectures from a scalar autograd engine to a byte-pair tokenizer; the essays on [his blog](https://karpathy.github.io/); and the shrinking line of repositories from nanoGPT through llm.c and nanochat to microgpt. Chapters 1 and 2.

That second half is the part no reading list of papers can capture, and it is the reason a Karpathy syllabus is worth having at all when the papers are already on everyone else's list. **His distinctive claim is not about any paper. It is that you do not understand a system until you have written it from nothing**, and he has spent a decade making that cheaper for other people — first by removing dependencies, then by removing lines. Chapter 1 is that argument as a sequence of working programs.

**How these notes are organised.** Seven chapters, following the talk's own arc rather than the order the papers appeared:

- **1. The Workshop.** Build it yourself: micrograd, makemore, nanoGPT, the tokenizer, and the 200-line endpoint.
- **2. The Essays.** Four pieces of writing that shaped how the field talks about itself, including the one that made him famous.
- **3. Pretraining and Scale.** The Transformer, GPT-2, and the two scaling papers that disagree with each other.
- **4. Making an Assistant.** How a base model becomes something you can talk to: instruction tuning, preferences, and the two attempts to make the reward model unnecessary.
- **5. System Two.** Karpathy's framing of the open problem — models have intuition and no deliberation. Go, chains, trees, and one attempt at fixing attention itself.
- **6. The LLM OS.** The metaphor at the centre of the talk: the model as kernel, with memory, tools and senses bolted on.
- **7. Security.** Roughly the last third of the talk, and the chapter most reading lists drop.

**Two entries overlap with Sutskever's list**, which is not a coincidence — *Attention Is All You Need* and *Scaling Laws for Neural Language Models* are on every serious list. I have not repeated the notes. Those two sections here take the angle Karpathy takes, which is the implementer's: what the thing costs to write, and what breaks when you do. The paper-level readings are one click away and I link to them.

**What I have left out**, so the omissions are visible rather than quiet. From the talk: the multimodal papers beyond ViT, CLIP and LLaVA, several of which have already been superseded; llama.cpp and llama2.c, which are engineering rather than argument. From his own work: the reinforcement-learning post *Pong from Pixels*, the ConvNetJS-era writing, and *A Survival Guide to a PhD*, which is good and not about this. LLM101n, the Eureka Labs course, is unfinished; I would rather write it up once it exists than describe a syllabus.

**One reading order, if seven chapters are too much.** Watch the talk. Then do chapter 1 with an editor open — Zero to Hero is eight lectures and about twenty hours, and it is the highest-value twenty hours in this repository. Then read chapter 4, because instruction tuning is where a model stops being a curiosity, and chapter 7, because it is the part that will be your problem in production. Chapters 3, 5 and 6 you can take as the talk gives them: fast, and out of order.

Each entry gives the mechanism in enough detail to be useful without the source open, then says plainly what did not survive. A fair amount did not. Sparks of AGI has aged into a period piece. The scaling recommendation in chapter 3 was corrected two years later — the same correction the Sutskever notes record. Tree of Thoughts was overtaken by models trained to do the search internally. Saying so is more useful than reverence, and it is the only way a list assembled around a 2023 talk stays worth reading in 2026.
