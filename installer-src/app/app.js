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
  // Each slide picks its own transition — this is the effect played while
  // moving FROM that slide INTO the next one.
  const TRANSITION_TYPES = [
    { value: "fade", label: "🌫️ Fade (crossfade)" },
    { value: "cut", label: "✂️ Hard Cut (no transition)" },
    { value: "slide-left", label: "⬅️ Slide Left" },
    { value: "slide-right", label: "➡️ Slide Right" },
    { value: "slide-up", label: "⬆️ Slide Up" },
    { value: "slide-down", label: "⬇️ Slide Down" },
    { value: "zoom-in", label: "🔍 Zoom In" },
    { value: "zoom-out", label: "🔎 Zoom Out" },
    { value: "wipe-left", label: "◀️ Wipe Left" },
    { value: "wipe-right", label: "▶️ Wipe Right" },
  ];
  const DEFAULT_TRANSITION = "fade";

  function transitionOptionsHtml(selected) {
    return TRANSITION_TYPES.map(
      (t) =>
        `<option value="${t.value}"${t.value === selected ? " selected" : ""}>${t.label}</option>`
    ).join("");
  }

  const selectFieldStyle =
    "width:100%;background:var(--panel);border:1px solid var(--border);color:var(--text);padding:6px;border-radius:6px;";

  // ---------- State ----------
  let mode = "image"; // 'image' | 'text'
  let idCounter = 0;
  const nextId = () => ++idCounter;

  /** @type {Array<{id:number,img:HTMLImageElement,url:string,duration:number,zoomDir:string,p0x:number,p1x:number,p0y:number,p1y:number,transitionType:string}>} */
  let imageSlides = [];

  /** @type {Array<{id:number,text:string,bg:string,color:string,duration:number,fontSize:number,transitionType:string}>} */
  let textSlides = [
    {
      id: nextId(),
      text: "Your Title Here",
      bg: "#6c5ce7",
      color: "#ffffff",
      duration: 3,
      fontSize: 56,
      transitionType: DEFAULT_TRANSITION,
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
        transitionType: DEFAULT_TRANSITION,
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
        <div class="field" style="margin:8px 0 0;">
          <label style="font-size:12px;color:var(--text-dim);">Transition into next scene</label>
          <select data-id="${slide.id}" class="transition-input" style="${selectFieldStyle}">
            ${transitionOptionsHtml(slide.transitionType)}
          </select>
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
    imageSlideListEl.querySelectorAll(".transition-input").forEach((sel) =>
      sel.addEventListener("change", () => {
        const id = Number(sel.dataset.id);
        const slide = imageSlides.find((s) => s.id === id);
        if (slide) slide.transitionType = sel.value;
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
      transitionType: DEFAULT_TRANSITION,
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
        <div class="field" style="margin:8px 0 0;">
          <label style="font-size:12px;">Transition into next slide</label>
          <select data-id="${slide.id}" class="transition-input" style="${selectFieldStyle}">
            ${transitionOptionsHtml(slide.transitionType)}
          </select>
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
    textSlideListEl.querySelectorAll(".transition-input").forEach((sel) =>
      sel.addEventListener("change", () => {
        const slide = textSlides.find((s) => s.id === Number(sel.dataset.id));
        if (slide) slide.transitionType = sel.value;
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

  /**
   * Composite the outgoing slide (canvasA) and incoming slide (canvasB)
   * onto the main context `c`, according to the chosen VFX/transition type.
   * `alpha` goes from 0 (fully on A) to 1 (fully on B).
   */
  function compositeTransition(c, type, canvasA, canvasB, alpha, w, h) {
    switch (type) {
      case "slide-left": {
        c.drawImage(canvasA, -alpha * w, 0);
        c.drawImage(canvasB, w - alpha * w, 0);
        break;
      }
      case "slide-right": {
        c.drawImage(canvasA, alpha * w, 0);
        c.drawImage(canvasB, -w + alpha * w, 0);
        break;
      }
      case "slide-up": {
        c.drawImage(canvasA, 0, -alpha * h);
        c.drawImage(canvasB, 0, h - alpha * h);
        break;
      }
      case "slide-down": {
        c.drawImage(canvasA, 0, alpha * h);
        c.drawImage(canvasB, 0, -h + alpha * h);
        break;
      }
      case "zoom-in": {
        // Outgoing frame holds still; incoming frame grows in from small to full size.
        c.drawImage(canvasA, 0, 0);
        c.save();
        c.globalAlpha = alpha;
        const scale = 1.4 - 0.4 * alpha;
        const dw = w * scale,
          dh = h * scale;
        c.drawImage(canvasB, (w - dw) / 2, (h - dh) / 2, dw, dh);
        c.restore();
        break;
      }
      case "zoom-out": {
        // Outgoing frame grows/zooms away while fading; incoming frame fades in at normal size.
        c.save();
        c.globalAlpha = 1 - alpha;
        const scaleA = 1 + 0.4 * alpha;
        const dwA = w * scaleA,
          dhA = h * scaleA;
        c.drawImage(canvasA, (w - dwA) / 2, (h - dhA) / 2, dwA, dhA);
        c.restore();
        c.save();
        c.globalAlpha = alpha;
        c.drawImage(canvasB, 0, 0);
        c.restore();
        break;
      }
      case "wipe-left": {
        // Incoming frame is revealed by a hard edge sweeping from the right toward the left.
        c.drawImage(canvasA, 0, 0);
        const x = w - alpha * w;
        c.save();
        c.beginPath();
        c.rect(x, 0, w - x, h);
        c.clip();
        c.drawImage(canvasB, 0, 0);
        c.restore();
        break;
      }
      case "wipe-right": {
        // Incoming frame is revealed by a hard edge sweeping from the left toward the right.
        c.drawImage(canvasA, 0, 0);
        const width = alpha * w;
        c.save();
        c.beginPath();
        c.rect(0, 0, width, h);
        c.clip();
        c.drawImage(canvasB, 0, 0);
        c.restore();
        break;
      }
      case "fade":
      default: {
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
    const transitionType = seg.slide.transitionType || DEFAULT_TRANSITION;

    // No next slide, or this slide is set to a hard cut: draw plainly, no compositing.
    if (!nextSeg || transitionType === "cut") {
      drawSlideContent(c, seg.slide, curProgress, w, h);
      return;
    }

    const nextDur = nextSeg.end - nextSeg.start;
    const trans = Math.max(0, Math.min(transitionDuration, segDur, nextDur));

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
