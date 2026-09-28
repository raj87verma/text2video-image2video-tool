/* =========================================================================
   Local Video Maker
   100% client-side. No servers, no APIs, no AI models, no external files.
   Uses only native browser features: <canvas>, requestAnimationFrame,
   Web Audio API, and MediaRecorder to turn an animated canvas into a
   real .webm video file, entirely on this machine.
   ========================================================================= */

(() => {
  "use strict";

  // ---------- Feature detection ----------
  const canvasEl = document.getElementById("previewCanvas");
  const ctx = canvasEl.getContext("2d");
  const warnBox = document.getElementById("warnBox");

  function warn(msg) {
    warnBox.textContent = msg;
    warnBox.style.display = "block";
  }
  function clearWarn() {
    warnBox.style.display = "none";
    warnBox.textContent = "";
  }

  const supportsCapture =
    typeof canvasEl.captureStream === "function" &&
    typeof window.MediaRecorder !== "undefined";

  if (!supportsCapture) {
    warn(
      "Your browser does not support canvas.captureStream / MediaRecorder, " +
        "so recording to a video file is not available. Please use a recent " +
        "version of Microsoft Edge or Google Chrome (both already on Windows)."
    );
  }

  // ---------- Transition / VFX effect catalog ----------
  // Transitions are fully automatic: no per-slide manual picker. Every scene
  // automatically gets a DIFFERENT transition effect into the next one,
  // cycling through this full 62-effect pool based on its position in the
  // sequence — so reordering, adding, or removing scenes always keeps the
  // sequence varied without any manual selection.
  const AUTO_TRANSITION_POOL = [
    "cut",
    "fade",
    "dissolve",
    "wipe",
    "slide",
    "push",
    "zoom",
    "split",
    "reveal",
    "random-bars",
    "blinds",
    "box",
    "checkerboard",
    "diamond",
    "fly-in",
    "glitch",
    "morph",
    "page-turn",
    "peel",
    "ripple",
    "spiral",
    "swirl",
    "vortex",
    "wave",
    "zoom-rotate",
    "cube",
    "door",
    "flip",
    "gallery",
    "pan",
    "rotate",
    "orbit",
    "swap",
    "ferris-wheel",
    "fly-through",
    "flash",
    "burn",
    "color-wash",
    "light-leak",
    "shutter",
    "smear",
    "cross-zoom",
    "linear-wipe",
    "radial-wipe",
    "clock-wipe",
    "wedge",
    "comb",
    "shape-wipe",
    "barn-door",
    "iris",
    "venetian-blinds",
    "checker-board",
    "dissolve-noise",
    "fluid",
    "melt",
    "page-curl",
    "ripple-radial",
    "wave-horizontal",
    "cube-rotate",
    "stretch",
    "twirl",
    "warp",
  ];

  // Randomize where the cycle starts each time the app loads, so consecutive
  // sessions/videos don't always open with the same first transition.
  const AUTO_TRANSITION_START_OFFSET = Math.floor(
    Math.random() * AUTO_TRANSITION_POOL.length
  );

  function autoTransitionForIndex(index) {
    const i = (index + AUTO_TRANSITION_START_OFFSET) % AUTO_TRANSITION_POOL.length;
    return AUTO_TRANSITION_POOL[i];
  }

  const TRANSITION_LABELS = {
    cut: "✂️ Cut",
    fade: "🌫️ Fade",
    dissolve: "💫 Dissolve",
    wipe: "➡️ Wipe",
    slide: "🚪 Slide",
    push: "👉 Push",
    zoom: "🔍 Zoom",
    split: "◫ Split",
    reveal: "🌓 Reveal",
    "random-bars": "🎞️ Random Bars",
    blinds: "🪟 Blinds",
    box: "🔲 Box",
    checkerboard: "🏁 Checkerboard",
    diamond: "🔷 Diamond",
    "fly-in": "🛫 Fly In",
    glitch: "📺 Glitch",
    morph: "🌀 Morph",
    "page-turn": "📄 Page Turn",
    peel: "🍌 Peel",
    ripple: "🌊 Ripple",
    spiral: "🌪️ Spiral",
    swirl: "🔄 Swirl",
    vortex: "🕳️ Vortex",
    wave: "🌊 Wave",
    "zoom-rotate": "🔁 Zoom Rotate",
    cube: "🧊 Cube",
    door: "🚪 Door",
    flip: "🔃 Flip",
    gallery: "🖼️ Gallery",
    pan: "🎥 Pan",
    rotate: "🔄 Rotate",
    orbit: "🪐 Orbit",
    swap: "🔀 Swap",
    "ferris-wheel": "🎡 Ferris Wheel",
    "fly-through": "🚀 Fly Through",
    flash: "⚡ Flash",
    burn: "🔥 Burn",
    "color-wash": "🎨 Color Wash",
    "light-leak": "✨ Light Leak",
    shutter: "🎦 Shutter",
    smear: "🖌️ Smear",
    "cross-zoom": "🔎 Cross Zoom",
    "linear-wipe": "📏 Linear Wipe",
    "radial-wipe": "☢️ Radial Wipe",
    "clock-wipe": "🕐 Clock Wipe",
    wedge: "🍰 Wedge",
    comb: "🪮 Comb",
    "shape-wipe": "🔺 Shape Wipe",
    "barn-door": "🚪 Barn Door",
    iris: "👁️ Iris",
    "venetian-blinds": "🪟 Venetian Blinds",
    "checker-board": "♟️ Checker Board",
    "dissolve-noise": "📡 Dissolve Noise",
    fluid: "💧 Fluid",
    melt: "🫠 Melt",
    "page-curl": "📃 Page Curl",
    "ripple-radial": "🎯 Ripple Radial",
    "wave-horizontal": "〜 Wave Horizontal",
    "cube-rotate": "🧊 Cube Rotate",
    stretch: "🪢 Stretch",
    twirl: "🌀 Twirl",
    warp: "🌌 Warp",
  };
  function transitionLabel(type) {
    return TRANSITION_LABELS[type] || type;
  }

  // ---------- State ----------
  let mode = "image"; // 'image' | 'text'
  let idCounter = 0;
  const nextId = () => ++idCounter;

  /** @type {Array<{id:number,img:HTMLImageElement,url:string,duration:number,zoomDir:string,p0x:number,p1x:number,p0y:number,p1y:number}>} */
  let imageSlides = [];

  /** @type {Array<{id:number,text:string,bg:string,color:string,duration:number,fontSize:number}>} */
  let textSlides = [
    {
      id: nextId(),
      text: "Your Title Here",
      bg: "#6c5ce7",
      color: "#ffffff",
      duration: 3,
      fontSize: 56,
    },
  ];

  let audioFile = { image: null, text: null };

  let rafId = null;
  let isRecording = false;
  let isPreviewing = false;
  let startTimestamp = 0;
  let recorder = null;
  let recordedChunks = [];
  let activeAudioEl = null;
  let activeAudioCtx = null;

  // ---------- DOM refs ----------
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = {
    image: document.getElementById("tab-image"),
    text: document.getElementById("tab-text"),
  };

  const imgFileInput = document.getElementById("imgFileInput");
  const imageSlideListEl = document.getElementById("imageSlideList");
  const imgResolution = document.getElementById("imgResolution");
  const imgFps = document.getElementById("imgFps");
  const imgTransition = document.getElementById("imgTransition");
  const imgTransVal = document.getElementById("imgTransVal");
  const imgAudioInput = document.getElementById("imgAudioInput");
  const imgVolume = document.getElementById("imgVolume");
  const imgVolVal = document.getElementById("imgVolVal");
  const imgAudioLoop = document.getElementById("imgAudioLoop");

  const addTextSlideBtn = document.getElementById("addTextSlideBtn");
  const textSlideListEl = document.getElementById("textSlideList");
  const txtResolution = document.getElementById("txtResolution");
  const txtFps = document.getElementById("txtFps");
  const txtTransition = document.getElementById("txtTransition");
  const txtTransVal = document.getElementById("txtTransVal");
  const txtAudioInput = document.getElementById("txtAudioInput");
  const txtVolume = document.getElementById("txtVolume");
  const txtVolVal = document.getElementById("txtVolVal");
  const txtAudioLoop = document.getElementById("txtAudioLoop");

  const playPreviewBtn = document.getElementById("playPreviewBtn");
  const recordBtn = document.getElementById("recordBtn");
  const stopBtn = document.getElementById("stopBtn");
  const progressFill = document.getElementById("progressFill");
  const progressLabel = document.getElementById("progressLabel");
  const resultWrap = document.getElementById("resultWrap");
  const resultVideo = document.getElementById("resultVideo");
  const downloadLink = document.getElementById("downloadLink");

  // ---------- Tab switching ----------
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      stopAll();
      mode = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
      Object.entries(tabContents).forEach(([key, el]) =>
        el.classList.toggle("active", key === mode)
      );
      clearWarn();
      renderCurrentModePreviewFrame();
    });
  });

  // ---------- Range label wiring ----------
  imgTransition.addEventListener("input", () => (imgTransVal.textContent = imgTransition.value));
  txtTransition.addEventListener("input", () => (txtTransVal.textContent = txtTransition.value));
  imgVolume.addEventListener("input", () => (imgVolVal.textContent = imgVolume.value));
  txtVolume.addEventListener("input", () => (txtVolVal.textContent = txtVolume.value));

  imgAudioInput.addEventListener("change", (e) => {
    audioFile.image = e.target.files[0] || null;
  });
  txtAudioInput.addEventListener("change", (e) => {
    audioFile.text = e.target.files[0] || null;
  });

  // ---------- Image slides ----------
  imgFileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        renderImageSlideList();
        renderCurrentModePreviewFrame();
      };
      img.src = url;
      const zoomDir = Math.random() > 0.5 ? "in" : "out";
      imageSlides.push({
        id: nextId(),
        img,
        url,
        duration: 3,
        zoomDir,
        p0x: 0.15 + Math.random() * 0.2,
        p1x: 0.65 + Math.random() * 0.2,
        p0y: 0.15 + Math.random() * 0.2,
        p1y: 0.65 + Math.random() * 0.2,
      });
    });
    imgFileInput.value = "";
    renderImageSlideList();
  });

  function renderImageSlideList() {
    imageSlideListEl.innerHTML = "";
    imageSlides.forEach((slide, i) => {
      const item = document.createElement("div");
      item.className = "slide-item";
      item.innerHTML = `
        <div class="slide-head">
          <span>Scene ${i + 1}</span>
          <button class="remove-slide" data-id="${slide.id}">✕ remove</button>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <img src="${slide.url}" style="width:64px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" />
          <div style="flex:1;">
            <label style="font-size:12px;color:var(--text-dim);">Duration (seconds)</label>
            <input type="number" min="0.5" max="20" step="0.5" value="${slide.duration}" data-id="${slide.id}" class="dur-input" style="width:100%;background:var(--panel);border:1px solid var(--border);color:var(--text);padding:6px;border-radius:6px;" />
          </div>
        </div>
        <div class="hint" style="margin-top:6px;">
          Transition to next: <strong>${transitionLabel(autoTransitionForIndex(i))}</strong> (automatic)
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button class="btn btn-secondary move-up" data-id="${slide.id}" style="padding:5px 8px;font-size:12px;">↑ Up</button>
          <button class="btn btn-secondary move-down" data-id="${slide.id}" style="padding:5px 8px;font-size:12px;">↓ Down</button>
        </div>
      `;
      imageSlideListEl.appendChild(item);
    });

    imageSlideListEl.querySelectorAll(".remove-slide").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        imageSlides = imageSlides.filter((s) => s.id !== id);
        renderImageSlideList();
        renderCurrentModePreviewFrame();
      })
    );
    imageSlideListEl.querySelectorAll(".dur-input").forEach((inp) =>
      inp.addEventListener("input", () => {
        const id = Number(inp.dataset.id);
        const slide = imageSlides.find((s) => s.id === id);
        if (slide) slide.duration = Math.max(0.5, parseFloat(inp.value) || 3);
      })
    );
    imageSlideListEl.querySelectorAll(".move-up").forEach((btn) =>
      btn.addEventListener("click", () => {
        moveSlide(imageSlides, Number(btn.dataset.id), -1);
        renderImageSlideList();
      })
    );
    imageSlideListEl.querySelectorAll(".move-down").forEach((btn) =>
      btn.addEventListener("click", () => {
        moveSlide(imageSlides, Number(btn.dataset.id), 1);
        renderImageSlideList();
      })
    );
  }

  function moveSlide(list, id, dir) {
    const idx = list.findIndex((s) => s.id === id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= list.length) return;
    const tmp = list[idx];
    list[idx] = list[newIdx];
    list[newIdx] = tmp;
  }

  // ---------- Text slides ----------
  addTextSlideBtn.addEventListener("click", () => {
    textSlides.push({
      id: nextId(),
      text: "New slide text",
      bg: randomColor(),
      color: "#ffffff",
      duration: 3,
      fontSize: 48,
    });
    renderTextSlideList();
    renderCurrentModePreviewFrame();
  });

  function randomColor() {
    const palette = ["#6c5ce7", "#00b894", "#e17055", "#0984e3", "#d63031", "#00cec9", "#fd79a8"];
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function renderTextSlideList() {
    textSlideListEl.innerHTML = "";
    textSlides.forEach((slide, i) => {
      const item = document.createElement("div");
      item.className = "slide-item";
      item.innerHTML = `
        <div class="slide-head">
          <span>Slide ${i + 1}</span>
          <button class="remove-slide" data-id="${slide.id}">✕ remove</button>
        </div>
        <textarea data-id="${slide.id}" class="text-input" placeholder="Slide text...">${escapeHtml(slide.text)}</textarea>
        <div class="row" style="margin-top:8px;">
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:12px;">Background</label>
            <input type="color" data-id="${slide.id}" class="bg-input" value="${slide.bg}" />
          </div>
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:12px;">Text color</label>
            <input type="color" data-id="${slide.id}" class="color-input" value="${slide.color}" />
          </div>
        </div>
        <div class="row" style="margin-top:8px;">
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:12px;">Font size (px)</label>
            <input type="number" min="16" max="140" step="2" data-id="${slide.id}" class="fontsize-input" value="${slide.fontSize}" style="width:100%;background:var(--panel);border:1px solid var(--border);color:var(--text);padding:6px;border-radius:6px;" />
          </div>
          <div class="field" style="margin-bottom:0;">
            <label style="font-size:12px;">Duration (s)</label>
            <input type="number" min="0.5" max="20" step="0.5" data-id="${slide.id}" class="dur-input" value="${slide.duration}" style="width:100%;background:var(--panel);border:1px solid var(--border);color:var(--text);padding:6px;border-radius:6px;" />
          </div>
        </div>
        <div class="hint" style="margin-top:6px;">
          Transition to next: <strong>${transitionLabel(autoTransitionForIndex(i))}</strong> (automatic)
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;">
          <button class="btn btn-secondary move-up" data-id="${slide.id}" style="padding:5px 8px;font-size:12px;">↑ Up</button>
          <button class="btn btn-secondary move-down" data-id="${slide.id}" style="padding:5px 8px;font-size:12px;">↓ Down</button>
        </div>
      `;
      textSlideListEl.appendChild(item);
    });

    textSlideListEl.querySelectorAll(".remove-slide").forEach((btn) =>
      btn.addEventListener("click", () => {
        const id = Number(btn.dataset.id);
        textSlides = textSlides.filter((s) => s.id !== id);
        renderTextSlideList();
        renderCurrentModePreviewFrame();
      })
    );
    textSlideListEl.querySelectorAll(".text-input").forEach((inp) =>
      inp.addEventListener("input", () => {
        const slide = textSlides.find((s) => s.id === Number(inp.dataset.id));
        if (slide) slide.text = inp.value;
        renderCurrentModePreviewFrame();
      })
    );
    textSlideListEl.querySelectorAll(".bg-input").forEach((inp) =>
      inp.addEventListener("input", () => {
        const slide = textSlides.find((s) => s.id === Number(inp.dataset.id));
        if (slide) slide.bg = inp.value;
        renderCurrentModePreviewFrame();
      })
    );
    textSlideListEl.querySelectorAll(".color-input").forEach((inp) =>
      inp.addEventListener("input", () => {
        const slide = textSlides.find((s) => s.id === Number(inp.dataset.id));
        if (slide) slide.color = inp.value;
        renderCurrentModePreviewFrame();
      })
    );
    textSlideListEl.querySelectorAll(".fontsize-input").forEach((inp) =>
      inp.addEventListener("input", () => {
        const slide = textSlides.find((s) => s.id === Number(inp.dataset.id));
        if (slide) slide.fontSize = parseInt(inp.value, 10) || 48;
        renderCurrentModePreviewFrame();
      })
    );
    textSlideListEl.querySelectorAll(".dur-input").forEach((inp) =>
      inp.addEventListener("input", () => {
        const slide = textSlides.find((s) => s.id === Number(inp.dataset.id));
        if (slide) slide.duration = Math.max(0.5, parseFloat(inp.value) || 3);
      })
    );
    textSlideListEl.querySelectorAll(".move-up").forEach((btn) =>
      btn.addEventListener("click", () => {
        moveSlide(textSlides, Number(btn.dataset.id), -1);
        renderTextSlideList();
      })
    );
    textSlideListEl.querySelectorAll(".move-down").forEach((btn) =>
      btn.addEventListener("click", () => {
        moveSlide(textSlides, Number(btn.dataset.id), 1);
        renderTextSlideList();
      })
    );
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------- Config helpers ----------
  function getActiveConfig() {
    if (mode === "image") {
      const [w, h] = imgResolution.value.split("x").map(Number);
      return {
        slides: imageSlides,
        w,
        h,
        fps: parseInt(imgFps.value, 10),
        transition: parseFloat(imgTransition.value),
        audioFile: audioFile.image,
        volume: parseInt(imgVolume.value, 10) / 100,
        loop: imgAudioLoop.checked,
      };
    } else {
      const [w, h] = txtResolution.value.split("x").map(Number);
      return {
        slides: textSlides,
        w,
        h,
        fps: parseInt(txtFps.value, 10),
        transition: parseFloat(txtTransition.value),
        audioFile: audioFile.text,
        volume: parseInt(txtVolume.value, 10) / 100,
        loop: txtAudioLoop.checked,
      };
    }
  }

  function computeTimeline(slides) {
    let acc = 0;
    const timeline = [];
    for (const s of slides) {
      const d = Math.max(0.1, s.duration || 3);
      timeline.push({ start: acc, end: acc + d, slide: s });
      acc += d;
    }
    return { timeline, total: acc };
  }

  // ---------- Rendering ----------
  function drawImageSlideContent(c, slide, progress, w, h) {
    c.fillStyle = "#000";
    c.fillRect(0, 0, w, h);
    if (!slide.img || !slide.img.complete || slide.img.naturalWidth === 0) return;
    const iw = slide.img.naturalWidth;
    const ih = slide.img.naturalHeight;
    const canvasAspect = w / h;

    let fullCropW, fullCropH;
    if (iw / ih > canvasAspect) {
      fullCropH = ih;
      fullCropW = ih * canvasAspect;
    } else {
      fullCropW = iw;
      fullCropH = iw / canvasAspect;
    }

    const zoomFrom = slide.zoomDir === "in" ? 1.0 : 1.25;
    const zoomTo = slide.zoomDir === "in" ? 1.25 : 1.0;
    const zoom = zoomFrom + (zoomTo - zoomFrom) * progress;

    let cropW = Math.min(fullCropW / zoom, iw);
    let cropH = Math.min(fullCropH / zoom, ih);

    const minCx = cropW / 2,
      maxCx = Math.max(minCx, iw - cropW / 2);
    const minCy = cropH / 2,
      maxCy = Math.max(minCy, ih - cropH / 2);

    const cx0 = minCx + (maxCx - minCx) * slide.p0x;
    const cx1 = minCx + (maxCx - minCx) * slide.p1x;
    const cy0 = minCy + (maxCy - minCy) * slide.p0y;
    const cy1 = minCy + (maxCy - minCy) * slide.p1y;

    const cx = cx0 + (cx1 - cx0) * progress;
    const cy = cy0 + (cy1 - cy0) * progress;

    const sx = Math.max(0, Math.min(iw - cropW, cx - cropW / 2));
    const sy = Math.max(0, Math.min(ih - cropH, cy - cropH / 2));

    c.drawImage(slide.img, sx, sy, cropW, cropH, 0, 0, w, h);
  }

  function wrapLines(c, text, maxWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = "";
    words.forEach((word) => {
      const test = current ? current + " " + word : word;
      if (c.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  function drawTextSlideContent(c, slide, progress, w, h) {
    c.fillStyle = slide.bg || "#222";
    c.fillRect(0, 0, w, h);

    const fadeIn = Math.min(1, progress / 0.18);
    const liftY = (1 - fadeIn) * 18;

    c.save();
    c.globalAlpha = fadeIn;
    c.fillStyle = slide.color || "#fff";
    c.textAlign = "center";
    c.textBaseline = "middle";
    const fontSize = Math.max(12, slide.fontSize || 48) * (w / 1280);
    c.font = `700 ${fontSize}px "Segoe UI", Arial, sans-serif`;

    const maxWidth = w * 0.82;
    const lines = wrapLines(c, slide.text || "", maxWidth);
    const lineHeight = fontSize * 1.25;
    const totalHeight = lineHeight * lines.length;
    let y = h / 2 - totalHeight / 2 + lineHeight / 2 - liftY;

    lines.forEach((line) => {
      c.fillText(line, w / 2, y);
      y += lineHeight;
    });
    c.restore();
  }

  function drawSlideContent(c, slide, progress, w, h) {
    if (mode === "image") drawImageSlideContent(c, slide, progress, w, h);
    else drawTextSlideContent(c, slide, progress, w, h);
  }

  // ---------- Offscreen buffers used to composite transition effects ----------
  const offA = document.createElement("canvas");
  const offB = document.createElement("canvas");
  const offCtxA = offA.getContext("2d");
  const offCtxB = offB.getContext("2d");

  function ensureOffscreenSize(w, h) {
    if (offA.width !== w || offA.height !== h) {
      offA.width = w;
      offA.height = h;
    }
    if (offB.width !== w || offB.height !== h) {
      offB.width = w;
      offB.height = h;
    }
  }

  // ---------- Transition math helpers ----------
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const ease = (t) => t * t * (3 - 2 * t); // smoothstep

  // Deterministic pseudo-random in [0,1) from an integer index — used so
  // "random" looking effects (dissolve, glitch, random bars) render
  // identically every frame instead of flickering with true randomness.
  function hashRand(i) {
    const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function drawTransformed(c, canvas, w, h, scale, angle = 0, offX = 0, offY = 0, scaleY) {
    c.save();
    c.translate(w / 2 + offX, h / 2 + offY);
    if (angle) c.rotate(angle);
    c.scale(scale, scaleY === undefined ? scale : scaleY);
    c.drawImage(canvas, -w / 2, -h / 2, w, h);
    c.restore();
  }

  /** Simple full-frame cross zoom/rotate/fade blend, parameterized. */
  function zoomBlend(c, canvasA, canvasB, alpha, w, h, opts = {}) {
    const { aScaleTo = 1.2, bScaleFrom = 0.8, rotate = 0 } = opts;
    c.save();
    c.globalAlpha = clamp01(1 - alpha);
    drawTransformed(c, canvasA, w, h, 1 + (aScaleTo - 1) * alpha, -rotate * alpha);
    c.restore();
    c.save();
    c.globalAlpha = clamp01(alpha);
    drawTransformed(c, canvasB, w, h, bScaleFrom + (1 - bScaleFrom) * alpha, rotate * (1 - alpha));
    c.restore();
  }

  /** Clip-path reveal: draw A fully, then reveal B through a growing path. */
  function shapeClipReveal(c, canvasA, canvasB, alpha, w, h, pathFn) {
    c.drawImage(canvasA, 0, 0);
    if (alpha <= 0) return;
    c.save();
    c.beginPath();
    pathFn(c, alpha, w, h);
    c.clip();
    c.drawImage(canvasB, 0, 0);
    c.restore();
  }

  /**
   * Grid-based reveal: canvas split into a cols x rows grid; each cell
   * reveals B once `alpha` passes a per-cell delay (from orderFn), giving
   * checkerboard / box / diamond / random / glitch style reveals.
   */
  function gridReveal(c, canvasA, canvasB, alpha, w, h, cols, rows, orderFn, opts = {}) {
    const spread = opts.spread ?? 0.6;
    const duration = opts.duration ?? 0.5;
    c.drawImage(canvasA, 0, 0);
    const cellW = w / cols,
      cellH = h / rows;
    const orders = [];
    let maxOrder = 0;
    for (let r = 0; r < rows; r++) {
      orders.push([]);
      for (let col = 0; col < cols; col++) {
        const o = orderFn(r, col, rows, cols);
        orders[r].push(o);
        if (o > maxOrder) maxOrder = o;
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        const delay = maxOrder > 0 ? (orders[r][col] / maxOrder) * spread : 0;
        const ca = clamp01((alpha - delay) / duration);
        if (ca <= 0) continue;
        c.save();
        c.beginPath();
        c.rect(col * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
        c.clip();
        c.globalAlpha = ca;
        c.drawImage(canvasB, 0, 0);
        c.restore();
      }
    }
  }

  /**
   * Curtain reveal: canvas split into strips; B is drawn full underneath,
   * then each strip of A slides away (direction/timing per strip), giving
   * blinds / venetian blinds / shutter / comb style effects.
   */
  function curtainReveal(c, canvasA, canvasB, alpha, w, h, strips) {
    c.drawImage(canvasB, 0, 0);
    strips.forEach((s) => {
      const duration = s.duration ?? 0.9;
      const ca = clamp01((alpha - (s.delay || 0)) / duration);
      if (ca >= 1) return; // strip fully slid away, B already showing beneath
      c.save();
      c.beginPath();
      c.rect(s.x, s.y, s.w + 0.5, s.h + 0.5);
      c.clip();
      c.drawImage(canvasA, (s.dx || 0) * ca * w, (s.dy || 0) * ca * h);
      c.restore();
    });
  }

  function stripsRows(w, h, n, dirFn, delayFn) {
    const sh = h / n;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const d = dirFn(i, n);
      arr.push({ x: 0, y: i * sh, w, h: sh, dx: d.dx, dy: d.dy, delay: delayFn ? delayFn(i, n) : 0 });
    }
    return arr;
  }
  function stripsCols(w, h, n, dirFn, delayFn) {
    const sw = w / n;
    const arr = [];
    for (let i = 0; i < n; i++) {
      const d = dirFn(i, n);
      arr.push({ x: i * sw, y: 0, w: sw, h, dx: d.dx, dy: d.dy, delay: delayFn ? delayFn(i, n) : 0 });
    }
    return arr;
  }

  /** Concentric ring rotation warp — cheap approximation of twirl/vortex/spiral. */
  function ringRotateWarp(c, canvasA, canvasB, alpha, w, h, opts = {}) {
    const { rings = 8, maxAngle = Math.PI / 2, shrink = 0.15, reverse = false } = opts;
    c.drawImage(canvasA, 0, 0);
    c.save();
    c.globalAlpha = clamp01(alpha);
    const cx = w / 2,
      cy = h / 2;
    const maxR = Math.hypot(w, h) / 2;
    for (let i = 0; i < rings; i++) {
      const rInner = (maxR * i) / rings;
      const rOuter = (maxR * (i + 1)) / rings;
      const t = i / Math.max(1, rings - 1);
      const angle = (reverse ? -1 : 1) * maxAngle * (1 - alpha) * (1 - t * 0.5);
      c.save();
      c.beginPath();
      c.arc(cx, cy, rOuter, 0, Math.PI * 2);
      c.arc(cx, cy, rInner, 0, Math.PI * 2, true);
      c.clip("evenodd");
      c.translate(cx, cy);
      c.rotate(angle);
      const scale = 1 - shrink * (1 - alpha) * t;
      c.scale(scale, scale);
      c.drawImage(canvasB, -cx, -cy);
      c.restore();
    }
    c.restore();
  }

  /** Concentric rings expanding outward from center, revealing B ring by ring. */
  function rippleReveal(c, canvasA, canvasB, alpha, w, h, rings = 10, wobble = 0) {
    c.drawImage(canvasA, 0, 0);
    const cx = w / 2,
      cy = h / 2;
    const maxR = Math.hypot(w, h) / 2;
    for (let i = 0; i < rings; i++) {
      const rOuter = (maxR * (i + 1)) / rings;
      const rInner = (maxR * i) / rings;
      const threshold = i / rings + wobble * Math.sin(i * 1.3);
      const ca = clamp01((alpha - threshold * 0.7) / 0.3);
      if (ca <= 0) continue;
      c.save();
      c.beginPath();
      c.arc(cx, cy, rOuter, 0, Math.PI * 2);
      c.arc(cx, cy, rInner, 0, Math.PI * 2, true);
      c.clip("evenodd");
      c.globalAlpha = ca;
      c.drawImage(canvasB, 0, 0);
      c.restore();
    }
  }

  /** Wavy-boundary linear wipe (vertical strips wiping left-to-right, or transposed). */
  function waveWipe(c, canvasA, canvasB, alpha, w, h, horizontal = false, amplitude = 0.06, freq = 3, n = 40) {
    c.drawImage(canvasA, 0, 0);
    const size = horizontal ? w / n : h / n;
    for (let i = 0; i < n; i++) {
      const off = Math.sin((i / n) * Math.PI * 2 * freq) * amplitude;
      const bandAlpha = clamp01(alpha + off);
      if (bandAlpha <= 0) continue;
      c.save();
      c.beginPath();
      if (horizontal) {
        c.rect(i * size, 0, size + 0.5, bandAlpha * h);
      } else {
        c.rect(0, i * size, bandAlpha * w, size + 0.5);
      }
      c.clip();
      c.drawImage(canvasB, 0, 0);
      c.restore();
    }
  }

  /** Fade through a color/gradient overlay (color-wash / light-leak / flash / burn). */
  function colorOverlayTransition(c, canvasA, canvasB, alpha, w, h, fillFn, peak = 0.5, spread = 0.5) {
    const showB = alpha >= 0.5;
    c.drawImage(showB ? canvasB : canvasA, 0, 0);
    const dist = Math.abs(alpha - peak);
    const overlayAlpha = clamp01(1 - dist / spread);
    if (overlayAlpha > 0) {
      c.save();
      c.globalAlpha = overlayAlpha;
      fillFn(c, w, h);
      c.restore();
    }
  }

  /**
   * Composite the outgoing slide (canvasA) and incoming slide (canvasB)
   * onto the main context `c`, according to the chosen VFX/transition type.
   * `alpha` goes from 0 (fully on A) to 1 (fully on B).
   */
  function compositeTransition(c, type, canvasA, canvasB, alpha, w, h) {
    switch (type) {
      // ---- Simple ----
      case "fade": {
        c.drawImage(canvasA, 0, 0);
        c.save();
        c.globalAlpha = alpha;
        c.drawImage(canvasB, 0, 0);
        c.restore();
        break;
      }
      case "dissolve": {
        gridReveal(c, canvasA, canvasB, alpha, w, h, 10, 6, (r, col) => hashRand(r * 10 + col) * 100, {
          spread: 0.7,
          duration: 0.45,
        });
        break;
      }
      case "dissolve-noise": {
        gridReveal(c, canvasA, canvasB, alpha, w, h, 18, 10, (r, col) => hashRand((r * 18 + col) * 7 + 3) * 100, {
          spread: 0.75,
          duration: 0.3,
        });
        break;
      }
      case "glitch": {
        // Fine horizontal bands reveal in random order with shrinking jitter.
        const rows = 20;
        const rh = h / rows;
        c.drawImage(canvasA, 0, 0);
        for (let i = 0; i < rows; i++) {
          const delay = hashRand(i) * 0.6;
          const ca = clamp01((alpha - delay) / 0.2);
          if (ca <= 0) continue;
          const jitter = (hashRand(i * 3 + 1) - 0.5) * 24 * (1 - ca);
          c.save();
          c.beginPath();
          c.rect(0, i * rh, w, rh + 0.5);
          c.clip();
          c.globalAlpha = ca;
          c.drawImage(canvasB, jitter, 0);
          c.restore();
        }
        break;
      }

      // ---- Wipes / shape reveals ----
      case "wipe":
      case "linear-wipe":
        shapeClipReveal(c, canvasA, canvasB, alpha, w, h, (cc, a, ww, hh) => cc.rect(0, 0, a * ww, hh));
        break;
      case "split":
        shapeClipReveal(c, canvasA, canvasB, alpha, w, h, (cc, a, ww, hh) =>
          cc.rect(ww / 2 - (a * ww) / 2, 0, a * ww, hh)
        );
        break;
      case "reveal":
        shapeClipReveal(c, canvasA, canvasB, alpha, w, h, (cc, a, ww, hh) =>
          cc.rect(ww / 2 - (a * ww) / 2, hh / 2 - (a * hh) / 2, a * ww, a * hh)
        );
        break;
      case "iris":
        shapeClipReveal(c, canvasA, canvasB, alpha, w, h, (cc, a, ww, hh) =>
          cc.arc(ww / 2, hh / 2, a * (Math.hypot(ww, hh) / 2), 0, Math.PI * 2)
        );
        break;
      case "radial-wipe":
        shapeClipReveal(c, canvasA, canvasB, alpha, w, h, (cc, a, ww, hh) =>
          cc.arc(0, 0, a * Math.hypot(ww, hh), 0, Math.PI * 2)
        );
        break;
      case "clock-wipe":
        shapeClipReveal(c, canvasA, canvasB, alpha, w, h, (cc, a, ww, hh) => {
          const cx = ww / 2,
            cy = hh / 2,
            r = Math.hypot(ww, hh);
          cc.moveTo(cx, cy);
          cc.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + a * Math.PI * 2);
          cc.closePath();
        });
        break;
      case "wedge":
        shapeClipReveal(c, canvasA, canvasB, alpha, w, h, (cc, a, ww, hh) => {
          const cx = ww / 2,
            cy = hh / 2,
            r = Math.hypot(ww, hh);
          cc.moveTo(cx, cy);
          cc.arc(cx, cy, r, Math.PI, Math.PI + a * Math.PI * 2);
          cc.closePath();
        });
        break;
      case "shape-wipe":
        shapeClipReveal(c, canvasA, canvasB, alpha, w, h, (cc, a, ww, hh) => {
          const cx = ww / 2,
            cy = hh / 2;
          const r = a * (Math.hypot(ww, hh) / 2);
          const points = 6;
          for (let i = 0; i <= points; i++) {
            const ang = (i / points) * Math.PI * 2 - Math.PI / 2;
            const rr = i % 2 === 0 ? r : r * 0.55;
            const x = cx + Math.cos(ang) * rr;
            const y = cy + Math.sin(ang) * rr;
            i === 0 ? cc.moveTo(x, y) : cc.lineTo(x, y);
          }
          cc.closePath();
        });
        break;
      case "diamond":
        shapeClipReveal(c, canvasA, canvasB, alpha, w, h, (cc, a, ww, hh) => {
          const cx = ww / 2,
            cy = hh / 2;
          const r = a * (Math.hypot(ww, hh) / 2);
          cc.moveTo(cx, cy - r);
          cc.lineTo(cx + r, cy);
          cc.lineTo(cx, cy + r);
          cc.lineTo(cx - r, cy);
          cc.closePath();
        });
        break;
      case "barn-door": {
        c.drawImage(canvasB, 0, 0);
        c.save();
        c.beginPath();
        c.rect(0, 0, w / 2, h);
        c.clip();
        c.drawImage(canvasA, -alpha * (w / 2), 0);
        c.restore();
        c.save();
        c.beginPath();
        c.rect(w / 2, 0, w / 2, h);
        c.clip();
        c.drawImage(canvasA, alpha * (w / 2), 0);
        c.restore();
        break;
      }

      // ---- Grid reveals ----
      case "checkerboard":
        gridReveal(c, canvasA, canvasB, alpha, w, h, 8, 6, (r, col) => (r + col) % 2, { spread: 0.5, duration: 0.55 });
        break;
      case "checker-board":
        gridReveal(c, canvasA, canvasB, alpha, w, h, 12, 8, (r, col) => (r + col) % 2, {
          spread: 0.55,
          duration: 0.4,
        });
        break;
      case "box":
        gridReveal(
          c,
          canvasA,
          canvasB,
          alpha,
          w,
          h,
          9,
          7,
          (r, col, rows, cols) => Math.max(Math.abs(r - (rows - 1) / 2), Math.abs(col - (cols - 1) / 2)),
          { spread: 0.7, duration: 0.4 }
        );
        break;
      case "random-bars": {
        const strips = stripsCols(w, h, 16, () => ({ dx: 0, dy: -1 }), (i) => hashRand(i) * 0.5);
        curtainReveal(c, canvasA, canvasB, alpha, w, h, strips);
        break;
      }

      // ---- Curtain slides ----
      case "blinds": {
        const strips = stripsRows(w, h, 10, () => ({ dx: 0, dy: -1 }));
        curtainReveal(c, canvasA, canvasB, alpha, w, h, strips);
        break;
      }
      case "venetian-blinds": {
        const strips = stripsRows(w, h, 16, () => ({ dx: 0, dy: 1 }));
        curtainReveal(c, canvasA, canvasB, alpha, w, h, strips);
        break;
      }
      case "shutter": {
        const strips = stripsCols(w, h, 8, (i, n) => ({ dx: i < n / 2 ? -1 : 1, dy: 0 }));
        curtainReveal(c, canvasA, canvasB, alpha, w, h, strips);
        break;
      }
      case "comb": {
        const strips = stripsCols(w, h, 12, (i) => ({ dx: 0, dy: i % 2 === 0 ? -1 : 1 }));
        curtainReveal(c, canvasA, canvasB, alpha, w, h, strips);
        break;
      }
      case "melt": {
        const cols = 14;
        const strips = stripsCols(w, h, cols, () => ({ dx: 0, dy: 1 }), (i) => {
          const centerDist = Math.abs(i - (cols - 1) / 2) / (cols / 2);
          return centerDist * 0.4;
        });
        curtainReveal(c, canvasA, canvasB, alpha, w, h, strips);
        break;
      }
      case "smear": {
        // Directional motion-smear: several offset, fading copies of B are
        // drawn sliding in over A, approximating a paintbrush/smear blend.
        c.drawImage(canvasA, 0, 0);
        const streaks = 6;
        for (let i = streaks; i >= 1; i--) {
          const t = i / streaks;
          const off = (1 - alpha) * w * 0.4 * t;
          c.save();
          c.globalAlpha = clamp01(alpha * (1 - t * 0.6));
          c.drawImage(canvasB, off, 0);
          c.restore();
        }
        c.save();
        c.globalAlpha = clamp01(alpha);
        c.drawImage(canvasB, 0, 0);
        c.restore();
        break;
      }
      case "fluid": {
        const rows = 14;
        const rh = h / rows;
        c.drawImage(canvasB, 0, 0);
        for (let i = 0; i < rows; i++) {
          const ca = clamp01(alpha * 1.3 - (i / rows) * 0.3);
          if (ca >= 1) continue;
          const jitter = Math.sin(i * 1.7 + alpha * 8) * (1 - ca) * 14;
          c.save();
          c.beginPath();
          c.rect(0, i * rh, w, rh + 0.5);
          c.clip();
          c.globalAlpha = 1 - ca;
          c.drawImage(canvasA, jitter, 0);
          c.restore();
        }
        break;
      }

      // ---- Slide / push / directional ----
      case "slide": {
        c.drawImage(canvasA, -alpha * w, 0);
        c.drawImage(canvasB, w - alpha * w, 0);
        break;
      }
      case "push": {
        c.drawImage(canvasA, 0, -alpha * h);
        c.drawImage(canvasB, 0, h - alpha * h);
        break;
      }
      case "pan": {
        const s = 1 + 0.06 * Math.sin(alpha * Math.PI);
        c.save();
        drawTransformed(c, canvasA, w, h, s, 0, -alpha * w);
        c.restore();
        c.save();
        drawTransformed(c, canvasB, w, h, s, 0, w - alpha * w);
        c.restore();
        break;
      }
      case "gallery": {
        c.save();
        c.globalAlpha = clamp01(1 - alpha * 1.3);
        drawTransformed(c, canvasA, w, h, 1 - 0.1 * alpha, -0.05 * alpha, -alpha * w * 0.5);
        c.restore();
        c.save();
        c.globalAlpha = clamp01(alpha * 1.3);
        drawTransformed(c, canvasB, w, h, 0.9 + 0.1 * alpha, 0.05 * (1 - alpha), (1 - alpha) * w * 0.5);
        c.restore();
        break;
      }
      case "swap": {
        const e = ease(alpha);
        c.drawImage(canvasA, 0, -e * h);
        c.drawImage(canvasB, 0, h - e * h);
        break;
      }
      case "stretch": {
        c.save();
        c.beginPath();
        c.rect(0, 0, w * (1 - alpha), h);
        c.clip();
        drawTransformed(c, canvasA, w, h, 1 - alpha, 0, (-alpha * w) / 2, 0, 1);
        c.restore();
        c.save();
        c.beginPath();
        c.rect(w * (1 - alpha), 0, w * alpha, h);
        c.clip();
        drawTransformed(c, canvasB, w, h, alpha, 0, ((1 - alpha) * w) / 2, 0, 1);
        c.restore();
        break;
      }

      // ---- Zoom family ----
      case "zoom":
        zoomBlend(c, canvasA, canvasB, alpha, w, h, { aScaleTo: 1.15, bScaleFrom: 0.85 });
        break;
      case "cross-zoom":
        zoomBlend(c, canvasA, canvasB, alpha, w, h, { aScaleTo: 1.6, bScaleFrom: 0.4 });
        break;
      case "zoom-rotate":
        zoomBlend(c, canvasA, canvasB, alpha, w, h, { aScaleTo: 1.3, bScaleFrom: 0.6, rotate: 0.6 });
        break;
      case "morph":
        zoomBlend(c, canvasA, canvasB, alpha, w, h, { aScaleTo: 1.05, bScaleFrom: 0.95 });
        break;
      case "warp": {
        c.save();
        c.globalAlpha = clamp01(1 - alpha);
        c.setTransform(1 + alpha * 0.3, alpha * 0.15, 0, 1 - alpha * 0.15, 0, 0);
        c.drawImage(canvasA, 0, 0, w, h);
        c.restore();
        c.save();
        c.globalAlpha = clamp01(alpha);
        c.setTransform(1 - (1 - alpha) * 0.3, -(1 - alpha) * 0.15, 0, 1 + (1 - alpha) * 0.15, 0, 0);
        c.drawImage(canvasB, 0, 0, w, h);
        c.restore();
        break;
      }
      case "fly-in": {
        c.drawImage(canvasA, 0, 0);
        const e = ease(alpha);
        const s = 0.15 + 0.85 * e;
        const x = -w * 0.6 * (1 - e);
        const y = -h * 0.6 * (1 - e);
        c.save();
        c.globalAlpha = clamp01(alpha * 2);
        drawTransformed(c, canvasB, w, h, s, 0, x, y);
        c.restore();
        break;
      }
      case "fly-through": {
        c.save();
        c.globalAlpha = clamp01(1 - alpha * 1.3);
        drawTransformed(c, canvasA, w, h, 1 + alpha * 2.2);
        c.restore();
        c.save();
        c.globalAlpha = ease(alpha);
        c.drawImage(canvasB, 0, 0);
        c.restore();
        break;
      }
      case "orbit": {
        c.drawImage(canvasA, 0, 0);
        const ang = Math.PI * 1.2 * (1 - alpha) + Math.PI / 2;
        const radius = Math.hypot(w, h) * 0.5 * (1 - alpha);
        const x = Math.cos(ang) * radius;
        const y = Math.sin(ang) * radius * 0.5;
        c.save();
        c.globalAlpha = clamp01(alpha * 1.4);
        drawTransformed(c, canvasB, w, h, 0.5 + 0.5 * alpha, (1 - alpha) * 0.8, x, y);
        c.restore();
        break;
      }
      case "ferris-wheel": {
        c.drawImage(canvasA, 0, 0);
        const ang = Math.PI * (1 - alpha) + Math.PI / 2;
        const radius = h * 0.7 * (1 - alpha);
        const x = Math.cos(ang) * radius * 0.3;
        const y = Math.sin(ang) * radius;
        c.save();
        c.globalAlpha = clamp01(alpha * 1.4);
        drawTransformed(c, canvasB, w, h, 0.6 + 0.4 * alpha, (1 - alpha) * 1.2, x, y * 0.5);
        c.restore();
        break;
      }

      // ---- Flip / 3D-ish ----
      case "flip": {
        if (alpha < 0.5) {
          drawTransformed(c, canvasA, w, h, Math.max(0.001, 1 - alpha * 2), 0, 0, 0, 1);
        } else {
          drawTransformed(c, canvasB, w, h, Math.max(0.001, (alpha - 0.5) * 2), 0, 0, 0, 1);
        }
        break;
      }
      case "rotate": {
        c.save();
        c.globalAlpha = clamp01(1 - alpha);
        drawTransformed(c, canvasA, w, h, 1 - 0.3 * alpha, -alpha * 0.9);
        c.restore();
        c.save();
        c.globalAlpha = clamp01(alpha);
        drawTransformed(c, canvasB, w, h, 0.7 + 0.3 * alpha, (1 - alpha) * 0.9);
        c.restore();
        break;
      }
      case "door": {
        c.drawImage(canvasB, 0, 0);
        c.save();
        c.beginPath();
        c.rect(0, 0, w, h);
        c.clip();
        drawTransformed(c, canvasA, w, h, Math.max(0.001, 1 - alpha), 0, (-alpha * w) / 2, 0, 1);
        c.restore();
        break;
      }
      case "cube": {
        c.save();
        c.beginPath();
        c.rect(0, 0, w * (1 - alpha), h);
        c.clip();
        c.setTransform(1, 0, alpha * 0.3, 1, -alpha * w * 0.3, 0);
        c.drawImage(canvasA, 0, 0, w, h);
        c.restore();
        c.save();
        c.beginPath();
        c.rect(w * (1 - alpha), 0, w * alpha, h);
        c.clip();
        c.setTransform(1, 0, -(1 - alpha) * 0.3, 1, w - (1 - alpha) * w * 0.7, 0);
        c.drawImage(canvasB, 0, 0, w, h);
        c.restore();
        break;
      }
      case "cube-rotate": {
        c.save();
        c.globalAlpha = clamp01(1 - alpha);
        c.setTransform(1 - alpha * 0.6, 0, 0, 1, alpha * w * 0.3, 0);
        c.drawImage(canvasA, 0, 0, w, h);
        c.restore();
        c.save();
        c.globalAlpha = clamp01(alpha);
        c.setTransform(alpha * 0.6 + 0.001, 0, 0, 1, -(1 - alpha) * w * 0.3, 0);
        c.drawImage(canvasB, 0, 0, w, h);
        c.restore();
        break;
      }
      case "page-turn": {
        c.drawImage(canvasB, 0, 0);
        c.save();
        c.beginPath();
        c.rect(0, 0, w, h);
        c.clip();
        const scaleX = Math.max(0.001, 1 - alpha);
        c.setTransform(scaleX, alpha * 0.08, 0, 1, 0, 0);
        c.drawImage(canvasA, 0, 0, w, h);
        c.restore();
        break;
      }
      case "page-curl": {
        c.drawImage(canvasB, 0, 0);
        c.save();
        c.beginPath();
        c.rect(0, 0, w, h);
        c.clip();
        const scaleX = Math.max(0.001, 1 - alpha);
        const scaleY = Math.max(0.001, 1 - alpha * 0.25);
        c.setTransform(scaleX, alpha * 0.12, alpha * 0.05, scaleY, w * alpha * 0.05, h * alpha * 0.05);
        c.drawImage(canvasA, 0, 0, w, h);
        c.restore();
        break;
      }
      case "peel": {
        c.drawImage(canvasB, 0, 0);
        c.save();
        c.beginPath();
        // Diagonal clip line sweeping across, so A appears to peel off corner-first.
        const diag = (1 - alpha) * (w + h);
        c.moveTo(0, 0);
        c.lineTo(Math.min(w, diag), 0);
        c.lineTo(0, Math.min(h, diag));
        c.closePath();
        c.clip();
        c.setTransform(1, alpha * 0.05, alpha * 0.05, 1, -alpha * 20, -alpha * 20);
        c.drawImage(canvasA, 0, 0, w, h);
        c.restore();
        break;
      }

      // ---- Wave / organic warp (approximated with strips, no per-pixel cost) ----
      case "wave":
        waveWipe(c, canvasA, canvasB, alpha, w, h, false, 0.07, 3, 44);
        break;
      case "wave-horizontal":
        waveWipe(c, canvasA, canvasB, alpha, w, h, true, 0.07, 3, 44);
        break;
      case "ripple":
        rippleReveal(c, canvasA, canvasB, alpha, w, h, 9, 0);
        break;
      case "ripple-radial":
        rippleReveal(c, canvasA, canvasB, alpha, w, h, 14, 0.04);
        break;
      case "swirl":
        ringRotateWarp(c, canvasA, canvasB, alpha, w, h, { rings: 7, maxAngle: Math.PI * 0.6, shrink: 0.1 });
        break;
      case "twirl":
        ringRotateWarp(c, canvasA, canvasB, alpha, w, h, { rings: 9, maxAngle: Math.PI * 0.9, shrink: 0.15 });
        break;
      case "vortex":
        ringRotateWarp(c, canvasA, canvasB, alpha, w, h, {
          rings: 10,
          maxAngle: Math.PI * 1.3,
          shrink: 0.3,
          reverse: true,
        });
        break;
      case "spiral":
        ringRotateWarp(c, canvasA, canvasB, alpha, w, h, {
          rings: 12,
          maxAngle: Math.PI * 1.6,
          shrink: 0.2,
        });
        break;

      // ---- Color overlay ----
      case "color-wash":
        colorOverlayTransition(c, canvasA, canvasB, alpha, w, h, (cc, ww, hh) => {
          cc.fillStyle = "#6c5ce7";
          cc.fillRect(0, 0, ww, hh);
        });
        break;
      case "light-leak":
        colorOverlayTransition(
          c,
          canvasA,
          canvasB,
          alpha,
          w,
          h,
          (cc, ww, hh) => {
            const g = cc.createRadialGradient(ww * 0.8, hh * 0.2, 0, ww * 0.8, hh * 0.2, Math.hypot(ww, hh) * 0.7);
            g.addColorStop(0, "rgba(255,244,214,1)");
            g.addColorStop(1, "rgba(255,244,214,0)");
            cc.fillStyle = g;
            cc.fillRect(0, 0, ww, hh);
          },
          0.5,
          0.55
        );
        break;
      case "flash":
        colorOverlayTransition(
          c,
          canvasA,
          canvasB,
          alpha,
          w,
          h,
          (cc, ww, hh) => {
            cc.fillStyle = "#ffffff";
            cc.fillRect(0, 0, ww, hh);
          },
          0.5,
          0.18
        );
        break;
      case "burn":
        colorOverlayTransition(
          c,
          canvasA,
          canvasB,
          alpha,
          w,
          h,
          (cc, ww, hh) => {
            const g = cc.createRadialGradient(ww / 2, hh / 2, 0, ww / 2, hh / 2, Math.hypot(ww, hh) / 2);
            g.addColorStop(0, "rgba(255,150,20,1)");
            g.addColorStop(0.6, "rgba(120,20,0,1)");
            g.addColorStop(1, "rgba(0,0,0,1)");
            cc.fillStyle = g;
            cc.fillRect(0, 0, ww, hh);
          },
          0.5,
          0.4
        );
        break;

      default: {
        // Fallback: plain crossfade for any unmapped type.
        c.drawImage(canvasA, 0, 0);
        c.save();
        c.globalAlpha = alpha;
        c.drawImage(canvasB, 0, 0);
        c.restore();
        break;
      }
    }
  }

  function renderAt(c, timeline, total, t, w, h, transitionDuration) {
    c.clearRect(0, 0, w, h);
    if (timeline.length === 0) {
      c.fillStyle = "#000";
      c.fillRect(0, 0, w, h);
      return;
    }
    const tt = Math.max(0, Math.min(t, total));
    let idx = timeline.findIndex((seg) => tt >= seg.start && tt < seg.end);
    if (idx === -1) idx = timeline.length - 1;
    const seg = timeline[idx];
    const segDur = seg.end - seg.start;
    const localT = segDur > 0 ? (tt - seg.start) / segDur : 1;
    const curProgress = Math.min(Math.max(localT, 0), 1);

    const nextSeg = timeline[idx + 1];
    // Fully automatic: the transition used is determined purely by this
    // slide's position in the sequence, cycling through the effect pool.
    const transitionType = autoTransitionForIndex(idx);

    // No next slide: draw plainly, no compositing.
    if (!nextSeg) {
      drawSlideContent(c, seg.slide, curProgress, w, h);
      return;
    }

    const nextDur = nextSeg.end - nextSeg.start;
    // "cut" is an instant switch — treat its effective transition duration
    // as zero regardless of the slider, so it never blends.
    const trans =
      transitionType === "cut" ? 0 : Math.max(0, Math.min(transitionDuration, segDur, nextDur));

    if (trans <= 0 || tt < seg.end - trans) {
      drawSlideContent(c, seg.slide, curProgress, w, h);
      return;
    }

    // We're inside the transition window leading into the next slide.
    const alpha = Math.max(0, Math.min(1, (tt - (seg.end - trans)) / trans));
    ensureOffscreenSize(w, h);
    offCtxA.clearRect(0, 0, w, h);
    offCtxB.clearRect(0, 0, w, h);
    drawSlideContent(offCtxA, seg.slide, curProgress, w, h);
    drawSlideContent(offCtxB, nextSeg.slide, 0, w, h);
    compositeTransition(c, transitionType, offA, offB, alpha, w, h);
  }

  function renderCurrentModePreviewFrame() {
    if (isPreviewing || isRecording) return;
    const { slides, w, h, transition } = getActiveConfig();
    canvasEl.width = w;
    canvasEl.height = h;
    const { timeline, total } = computeTimeline(slides);
    renderAt(ctx, timeline, total, 0, w, h, transition);
  }

  // ---------- Progress UI ----------
  function updateProgress(elapsed, total, label) {
    const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;
    progressFill.style.width = pct.toFixed(1) + "%";
    progressLabel.textContent =
      label || `${elapsed.toFixed(1)}s / ${total.toFixed(1)}s`;
  }

  // ---------- Stop everything ----------
  function stopAll() {
    isPreviewing = false;
    if (isRecording) {
      isRecording = false;
      try {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      } catch (e) {}
    }
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (activeAudioEl) {
      try {
        activeAudioEl.pause();
      } catch (e) {}
      activeAudioEl = null;
    }
    if (activeAudioCtx) {
      try {
        activeAudioCtx.close();
      } catch (e) {}
      activeAudioCtx = null;
    }
    playPreviewBtn.disabled = false;
    recordBtn.disabled = false;
    stopBtn.disabled = true;
  }

  // ---------- Preview ----------
  playPreviewBtn.addEventListener("click", () => {
    clearWarn();
    const { slides, w, h, transition, audioFile: af, volume, loop } = getActiveConfig();
    if (slides.length === 0) {
      warn("Add at least one slide before previewing.");
      return;
    }
    stopAll();
    canvasEl.width = w;
    canvasEl.height = h;
    const { timeline, total } = computeTimeline(slides);
    if (total <= 0) {
      warn("Total duration is zero. Increase slide durations.");
      return;
    }

    let audioEl = null;
    if (af) {
      audioEl = new Audio(URL.createObjectURL(af));
      audioEl.volume = volume;
      audioEl.loop = loop;
      audioEl.play().catch(() => {});
      activeAudioEl = audioEl;
    }

    isPreviewing = true;
    playPreviewBtn.disabled = true;
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    startTimestamp = performance.now();

    const loopFn = (now) => {
      if (!isPreviewing) return;
      let elapsed = (now - startTimestamp) / 1000;
      if (elapsed >= total) {
        startTimestamp = now;
        elapsed = 0;
        if (audioEl) {
          audioEl.currentTime = 0;
          audioEl.play().catch(() => {});
        }
      }
      renderAt(ctx, timeline, total, elapsed, w, h, transition);
      updateProgress(elapsed, total, `Previewing... ${elapsed.toFixed(1)}s / ${total.toFixed(1)}s (loops)`);
      rafId = requestAnimationFrame(loopFn);
    };
    rafId = requestAnimationFrame(loopFn);
  });

  stopBtn.addEventListener("click", () => {
    stopAll();
    updateProgress(0, 1, "Stopped.");
    progressFill.style.width = "0%";
  });

  // ---------- Recording ----------
  function pickMimeType() {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9",
      "video/webm",
    ];
    for (const c of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) return c;
    }
    return "video/webm";
  }

  recordBtn.addEventListener("click", () => {
    clearWarn();
    if (!supportsCapture) {
      warn("Recording is not supported in this browser.");
      return;
    }
    const { slides, w, h, fps, transition, audioFile: af, volume, loop } = getActiveConfig();
    if (slides.length === 0) {
      warn("Add at least one slide before recording.");
      return;
    }
    const { timeline, total } = computeTimeline(slides);
    if (total <= 0) {
      warn("Total duration is zero. Increase slide durations.");
      return;
    }

    stopAll();
    resultWrap.style.display = "none";
    canvasEl.width = w;
    canvasEl.height = h;
    renderAt(ctx, timeline, total, 0, w, h, transition);

    const videoStream = canvasEl.captureStream(fps);
    let combinedStream = videoStream;
    let audioEl = null;
    let audioCtx = null;

    if (af) {
      audioEl = new Audio(URL.createObjectURL(af));
      audioEl.loop = loop;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(audioEl);
        const gain = audioCtx.createGain();
        gain.gain.value = volume;
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(gain);
        gain.connect(dest);
        gain.connect(audioCtx.destination); // also let user hear it live
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } catch (e) {
        console.warn("Audio setup failed, recording video only.", e);
        combinedStream = videoStream;
      }
    }

    activeAudioEl = audioEl;
    activeAudioCtx = audioCtx;

    const mimeType = pickMimeType();
    recordedChunks = [];
    try {
      recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 4_000_000,
      });
    } catch (e) {
      warn("Could not start recorder: " + e.message);
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      resultVideo.src = url;
      const ext = mimeType.includes("webm") ? "webm" : "mp4";
      const filename = `local-video-${Date.now()}.${ext}`;
      downloadLink.href = url;
      downloadLink.download = filename;
      resultWrap.style.display = "block";
      updateProgress(total, total, "Done! Video ready below.");
      playPreviewBtn.disabled = false;
      recordBtn.disabled = false;
      stopBtn.disabled = true;
    };

    recorder.start();
    if (audioEl) {
      audioEl.currentTime = 0;
      audioEl.play().catch(() => {});
    }

    isRecording = true;
    playPreviewBtn.disabled = true;
    recordBtn.disabled = true;
    stopBtn.disabled = false;
    startTimestamp = performance.now();

    const loopFn = (now) => {
      if (!isRecording) return;
      const elapsed = (now - startTimestamp) / 1000;
      if (elapsed >= total) {
        renderAt(ctx, timeline, total, total, w, h, transition);
        finishRecording();
        return;
      }
      renderAt(ctx, timeline, total, elapsed, w, h, transition);
      updateProgress(elapsed, total, `Recording... ${elapsed.toFixed(1)}s / ${total.toFixed(1)}s`);
      rafId = requestAnimationFrame(loopFn);
    };
    rafId = requestAnimationFrame(loopFn);
  });

  function finishRecording() {
    isRecording = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (activeAudioEl) {
      try {
        activeAudioEl.pause();
      } catch (e) {}
    }
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  // ---------- Init ----------
  renderImageSlideList();
  renderTextSlideList();
  renderCurrentModePreviewFrame();
})();
