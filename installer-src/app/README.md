# Local Video Maker (100% Offline)

A Text-to-Video and Image-to-Video tool that runs **entirely inside your web
browser**, on your own Windows PC — no installation, no Python, no API keys,
no internet connection, and no AI models.

## How it works (no magic, no AI)

- **Image-to-Video**: You upload one or more photos. Each photo becomes a
  "scene" that is slowly zoomed/panned (the classic "Ken Burns effect") for a
  duration you choose, with a crossfade transition into the next photo.
- **Text-to-Video**: You type text on colored slides. Each slide fades in and
  is shown for a duration you choose, then crossfades into the next slide.
- Everything is drawn live onto an HTML5 `<canvas>` element using plain
  JavaScript — this is standard 2D drawing, not AI, so it runs instantly and
  smoothly even on a CPU-only, 8GB RAM machine.
- When you click **"Record Video"**, the browser's built-in `MediaRecorder`
  API captures that canvas animation (plus any background music you added)
  directly into a real `.webm` video file — which you can then download.

Nothing ever leaves your computer. There are no network requests at all;
you can even disconnect from the internet and it will work exactly the same.

## How to use it (no setup required)

1. You should see 3 files in the `local-video-maker` folder:
   - `index.html`
   - `style.css`
   - `app.js`
2. Just **double-click `index.html`**. It opens directly in your default
   browser (Microsoft Edge or Google Chrome — both already installed on
   Windows). That's it — no install, no server, no command line.
3. Pick a tab:
   - **🖼️ Image to Video** — click "Add image(s)" and choose photos from
     your PC. Adjust each scene's duration, reorder with ↑ / ↓, and remove
     any you don't want.
   - **🔤 Text to Video** — click "+ Add Text Slide", type your text, and
     pick a background/text color and font size for each slide.
4. Optionally add a background music file (mp3/wav) and set its volume.
5. Choose resolution and FPS. For your CPU-only PC, **854x480** will record
   fastest; 1280x720 is a good default; 1920x1080 will be slower.
6. Click **"▶ Preview"** to see it loop live without recording anything.
7. Click **"⏺ Record Video"**. The tool plays through your whole video once
   in real time (e.g. a 15-second video takes about 15 seconds to record)
   and then shows a video player with a **"⬇ Download video (.webm)"**
   button. Click it to save the `.mp4`-like `.webm` file anywhere on your PC.

## Notes and limits (being fully transparent)

- Recording happens in **real time** — a 30-second video takes about 30
  seconds to produce (this is very fast compared to any AI video generator,
  and is very light on your 8GB RAM / CPU-only machine).
- Output format is `.webm` (open, unencumbered video format). It plays
  natively in Chrome, Edge, Firefox, VLC, and most modern phones/TVs. If you
  specifically need `.mp4` for an older program, you can open the `.webm` in
  VLC and use "Convert/Save" — but this is optional; `.webm` already plays
  almost everywhere.
- This is **not** AI-generated video content — it does not invent new visuals
  from your text prompt like tools such as Sora or Runway do. It animates the
  images/text you provide (zoom, pan, fade, text reveal). This tradeoff is
  exactly what makes it possible to run instantly and reliably on your
  hardware with zero installs and zero API calls.
- Keep the browser tab focused/visible while recording for the smoothest
  result (backgrounded tabs can be throttled by the browser).

## Files

- `index.html` — page structure and controls
- `style.css` — visual styling
- `app.js` — all logic: slide management, canvas animation/rendering,
  timeline computation, and video recording via `MediaRecorder`
