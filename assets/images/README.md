# Blog images

Place image files here and reference them in posts with path `/assets/images/filename.png`.

For the RAG workflow post: download your diagram from Google Drive and save it as **workflow-of-RAG.png** in this folder.

## `projects/`

Screenshots and clips for the Projects tab. Each project card in `content/projects/index.json` points its `image` at one of these, and the write-up reuses it as the page's hero.

| File | Used by |
|------|---------|
| `jobs-occupations-map.webp` | `us-job-market` — card preview and hero |
| `jobs-what-to-learn.webp`, `jobs-tech-quadrant.webp`, `jobs-remote-states.webp` | `us-job-market` — in-page figures |
| `crossword-studio.webp` | `crossword-puzzle-agent` — card preview and in-page figure |
| `crossword-demo.mp4`, `crossword-demo-poster.webp` | `crossword-puzzle-agent` — the looping hero clip and its poster |

Card previews are cropped to **2:1** by CSS, so keep the subject near the centre.

Screenshots are WebP (roughly half the bytes of the source PNG at the same size), and the clip is silent H.264 rather than a GIF — the full 57-second MP4 is 563 KB against 1.35 MB for an 18-second GIF of the same recording:

```bash
ffmpeg -i shot.png -vf "scale='min(1600,iw)':-2" -quality 82 out.webp
ffmpeg -i clip.mp4 -an -vf scale=1100:-2 -c:v libx264 -pix_fmt yuv420p \
       -crf 28 -preset slow -movflags +faststart out.mp4
```
