# Local Video Maker (100% Offline)

A Text-to-Video and Image-to-Video tool that runs **entirely inside your web
browser**, on your own Windows PC — no Python, no API keys, no internet
connection, and no AI models.

## 🚀 Easiest way to install: `LocalVideoMaker-Setup.exe`

1. Download **[`LocalVideoMaker-Setup.exe`](./LocalVideoMaker-Setup.exe)** from
   this repo (click the file → click the "Download raw file" / download
   button on GitHub).
2. Double-click it on your Windows PC. It's a normal Windows installer — no
   internet access is used and no admin rights are required (it installs to
   your user profile under `%LOCALAPPDATA%\LocalVideoMaker`).
3. It creates a **"Local Video Maker" shortcut** on your Desktop and in the
   Start Menu. Click it any time to open the app in your default browser.
4. To remove it later, use **"Add or Remove Programs" → Local Video Maker**,
   or the Uninstall shortcut in the Start Menu folder.

The installer itself just copies the same `index.html` / `app.js` /
`style.css` files (see `installer-src/`) to a folder on your PC and sets up
shortcuts — it does not download anything or contact any server, during
installation or while the app runs.

> Note: Since this installer isn't digitally signed with a paid certificate,
> Windows SmartScreen may show a warning the first time you run it — see the
> detailed walkthrough below for exactly what it looks like and how to
> proceed safely.

## ⚠️ Windows SmartScreen warning — detailed guide

**Why this happens:** Windows SmartScreen flags any downloaded `.exe` that
isn't signed with a paid Microsoft-recognized certificate (these cost money
and require a business identity to obtain) and doesn't yet have a large
install base. This is **normal for small/independent tools** — it is not an
indication that the file is unsafe. This project is fully open-source (every
file is in this repo, [`installer-src/`](./installer-src)), so you can read
exactly what it does before trusting it.

*(I can't attach a real screenshot here since I don't have a Windows machine
to capture one — but the layout and wording below is accurate to how the
dialog actually appears, based on
[Microsoft's own documentation](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation).)*

**Step 1 — You'll see this first screen** when you double-click
`LocalVideoMaker-Setup.exe`:

```
┌──────────────────────────────────────────────────┐
│                                                    │
│   🛡️  Windows protected your PC                   │
│                                                    │
│   Microsoft Defender SmartScreen prevented an     │
│   unrecognized app from starting. Running this    │
│   app might put your PC at risk.                  │
│                                                    │
│                                    [ More info ]  │  ← click this
│                                                    │
└──────────────────────────────────────────────────┘
```

**Step 2 — Click "More info".** The dialog expands and now shows the
publisher, file name, and a new button:

```
┌──────────────────────────────────────────────────┐
│                                                    │
│   🛡️  Windows protected your PC                   │
│                                                    │
│   Microsoft Defender SmartScreen prevented an     │
│   unrecognized app from starting. Running this    │
│   app might put your PC at risk.                  │
│                                                    │
│   App:       LocalVideoMaker-Setup.exe            │
│   Publisher: Unknown publisher                    │
│                                                    │
│              [ Run anyway ]     [ Don't run ]     │  ← click "Run anyway"
│                                                    │
└──────────────────────────────────────────────────┘
```

**Step 3 — Click "Run anyway".** The normal installer wizard opens and
proceeds exactly as described above (choose install folder → Install →
Finish).

**Before you click "Run anyway", verify you trust the source:**
- ✅ You downloaded it from **this exact repo**:
  `github.com/raj87verma/text2video-image2video-tool`
- ✅ The source code for both the app (`index.html`, `app.js`, `style.css`)
  and the installer itself (`installer-src/installer.nsi`) is visible in this
  repo — nothing is hidden or obfuscated.
- ✅ The app makes **zero network requests** — you can verify this yourself
  by opening Windows Task Manager → Resource Monitor → Network while using
  the app, or simply by disconnecting from Wi-Fi before using it.

**Why "Unknown publisher" appears:** Publisher verification requires an
OV/EV code-signing certificate, which costs money annually and requires a
registered business identity — not something practical for a personal/local
tool like this one. This is the same warning you'd see on countless free
open-source Windows utilities distributed directly via GitHub rather than
the Microsoft Store.

**If you'd rather avoid the warning entirely,** skip the installer and use
the zero-install browser method in the next section instead — it requires no
`.exe` file at all, so SmartScreen never gets involved.

## Or run it with zero installation at all

If you'd rather not install anything at all, you don't have to — see below.

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
