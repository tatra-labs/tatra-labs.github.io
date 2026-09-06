# 9.7 Data Types

A short taxonomy: convolution applies to any data laid out on a grid, and the grid can have one, two or
three axes, with or without multiple channels.

## The grid

The book's table crosses two distinctions. The number of spatial axes gives **1-D** — audio waveforms,
where the axis is time — **2-D**, images with the axes being height and width, and **3-D**, volumetric
data such as CT scans or video, where the third axis is depth or time.

Crossing that with the channel count: single-channel 1-D is a mono waveform, multi-channel 1-D is
skeleton animation data with one channel per joint angle. Single-channel 2-D is a greyscale image or an
audio spectrogram, where the two axes are time and frequency and are *not* interchangeable — a shift in
time and a shift in frequency mean different things, so the network should treat the axes differently.
Multi-channel 2-D is a colour image. Multi-channel 3-D is colour video.

## Variable size

The other point of the section is that convolution handles inputs of varying spatial extent, which a
fixed-shape dense layer cannot. A kernel is simply applied more or fewer times, and the output size varies
accordingly.

This works when the variation is in *how much of the same kind of thing* there is — images of different
resolutions, recordings of different lengths. It does **not** address genuinely different kinds of input:
an image with an extra colour channel is not the same problem, because the channel axis carries semantic
identity rather than extent.

Where a fixed-size output is needed from a variable-size input, the pooling regions can be scaled with the
input so that a constant number of summaries is produced — the mechanism from 9.3.

## My take

The observation about spectrogram axes is the most useful thing here and it is stated in one sentence. A
2-D convolution over a spectrogram treats time and frequency identically, and they are not: shifting a
sound in time gives the same sound later, while shifting it in frequency gives a different pitch. Applying
an isotropic square kernel to a spectrogram embeds an assumption that is simply false, and it is a good
example of the infinitely-strong-prior warning from 9.4 arriving in a place where nobody thinks to look
for it.

The variable-size discussion also identifies a real limitation and understates it. Convolution tolerates
variable spatial extent, but the classifier on top usually does not, which is why fixed-size crops and
resizing dominated practice for so long. Global average pooling solved it properly and arrived from
elsewhere.

Worth noting what the taxonomy has to say about the modern situation. The reason a single architecture now
handles text, images, audio and video is not that someone generalised convolution to all four. It is that
transformers discard the grid entirely, treating everything as a set of tokens with learned positional
information — which turns the whole of this section from a design constraint into a preprocessing
decision.
