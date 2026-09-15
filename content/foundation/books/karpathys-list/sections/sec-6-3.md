**Dosovitskiy, Beyer, Kolesnikov, Weissenborn, Zhai, Unterthiner, Dehghani, Minderer, Heigold, Gelly, Uszkoreit & Houlsby · 2020 · [arXiv:2010.11929](https://arxiv.org/abs/2010.11929)**

Convolutional networks had owned vision for eight years, and the reasons were principled rather than accidental. A convolution builds in three assumptions: **locality** (nearby pixels are related to each other), **translation equivariance** (a cat is a cat wherever it appears in the frame) and a hierarchy of scales. These are true facts about images, handed to the model for free — and a network that does not have to learn them can spend its data learning everything else.

This paper removes all of them. Cut the image into fixed `16x16` patches, flatten each one into a list of numbers, project it to a vector, add something marking where it came from, and feed the resulting sequence to a **standard transformer encoder** — the same one used for text, essentially unmodified. A patch is a token. The model is told nothing about two-dimensional structure beyond a position marker it has to work out the meaning of by itself.

**The interesting result is the failure.** Trained on ImageNet-1k's `1.3M` images, this model is *worse* than a comparable ResNet, and the paper says so plainly. Those built-in assumptions were doing real work, and removing them costs accuracy exactly as theory predicts.

Then the same models are pretrained on progressively larger corpora, and the curves cross. At JFT-300M — `300M` images — the transformer overtakes the convolutional networks and keeps going, with ViT-H/14 reaching `88.55%` ImageNet top-1 at substantially lower pretraining cost than the CNNs it displaced.

**The lesson generalises well beyond vision and is one of the most useful in the whole list. Inductive bias is a substitute for data.** A structural assumption is a prior; a prior helps when evidence is scarce and constrains you when evidence is abundant. Below some data scale, hand-designed structure wins. Above it, the same structure becomes a ceiling — because the model could have learned a better version of that assumption, or discovered the assumption is not quite true, if only you had let it.

For this chapter's purposes the consequence is architectural unification. If an image is a sequence of tokens then vision and language are the same problem, run through the same stack, and one model can take both. Every multimodal system in this list follows from that.

> Locality and translation equivariance are useful lies you tell a small model; with enough data they become constraints preventing it from learning something better.

**What did not survive:** the purity, and the data requirement that made the purity look expensive. The paper's own hybrid variant — a small convolutional stem producing the patch embeddings — quietly returned in most production vision encoders, because the first layer of a ViT is doing something a convolution does better and cheaper. The data-hunger conclusion was also substantially overturned within a year: DeiT showed that with distillation, strong augmentation and better training recipes, a ViT trains competitively on ImageNet-1k alone. So "transformers need three hundred million images" turned out to mean "transformers needed a training recipe nobody had written yet" — which is itself a lesson about how quickly a scaling conclusion can be an artifact of the state of the art in optimisation.

The patch grid itself is now the awkward part. Fixed `16x16` patches at a fixed input resolution handle a document, a chart or a high-resolution photograph badly, and the workarounds — tiling, multi-crop, resamplers, native-resolution schemes — are where much of the engineering in current vision-language models actually goes.
