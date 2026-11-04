/* index.html — every figure on the page. content lives in data/*.json (loaded by cv.js), helpers in lib.js. */
(() => {
  "use strict";
  const {
    root, still, $, $$, S, H, esc, palette, rgba, mix, flow, onTheme, fit, loop, onceVisible, onResize,
    rng, clamp, lerp, ease, noise1, lorenz, lorenzStep, spline, resample, dft, contours, braille, sci, ym, tenure, nowYears,
  } = L;
  let C, FAM, FAM_KEYS; // filled in once data/*.json has loaded (see the bottom of this file)
  const NOW = nowYears();
  let P = palette();
  const famVar = (f) => `var(--${FAM[f].color})`;
  const FONT = getComputedStyle(document.body).fontFamily;
  const end = (r) => (r.end ? C.years(r.end) : NOW);

  // ── theme & accent ────────────────────────────────────────────────────
  const themeBtn = $("#theme"), themeName = $("#theme-name"), metaTheme = $('meta[name="theme-color"]');
  function applyThemeUI() {
    const dark = root.dataset.theme === "dark";
    themeName.textContent = dark ? "dark" : "light";
    themeBtn.setAttribute("aria-pressed", String(dark));
    themeBtn.setAttribute("aria-label", `theme is ${dark ? "dark" : "light"}; switch to ${dark ? "light" : "dark"}`);
    metaTheme.content = dark ? "#282828" : "#fbf1c7";
  }
  function refresh() { P = palette(); document.dispatchEvent(new Event("themechange")); }
  function setTheme(dark) {
    if (dark) root.dataset.theme = "dark"; else delete root.dataset.theme;
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) { /* private mode */ }
    applyThemeUI(); refresh();
  }
  function setAccent(name) {
    if (!name || name === "orange") delete root.dataset.accent; else root.dataset.accent = name;
    try { localStorage.setItem("accent", name || "orange"); } catch (e) { /* private mode */ }
    refresh();
  }
  themeBtn.addEventListener("click", () => setTheme(root.dataset.theme !== "dark"));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "t" || e.metaKey || e.ctrlKey || e.altKey || /input|textarea|select/i.test(e.target.tagName)) return;
    setTheme(root.dataset.theme !== "dark");
  });
  applyThemeUI();

  // ── bar, scrollspy, downloads ─────────────────────────────────────────
  const bar = $("#bar");
  const onScroll = () => bar.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const tocLinks = $$(".toc a");
  const spy = new IntersectionObserver((es) => {
    for (const e of es) if (e.isIntersecting) tocLinks.forEach((a) => a.classList.toggle("on", a.hash === "#" + e.target.id));
  }, { rootMargin: "-40% 0px -55% 0px" });
  $$("main > section[id], main > footer[id]").forEach((s) => spy.observe(s));

  const dlBtn = $("#dl-btn"), dlMenu = $("#dl-menu");
  const closeDl = () => { dlMenu.hidden = true; dlBtn.setAttribute("aria-expanded", "false"); };
  dlBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = dlMenu.hidden;
    dlMenu.hidden = !open;
    dlBtn.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (e) => { if (!dlMenu.hidden && !e.target.closest("#dl")) closeDl(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDl(); });

  // ── tooltip ───────────────────────────────────────────────────────────
  const tipEl = $("#tip");
  const tip = {
    show(html, x, y) {
      tipEl.innerHTML = html;
      tipEl.hidden = false;
      const r = tipEl.getBoundingClientRect();
      let px = x + 16, py = y + 16;
      if (px + r.width > innerWidth - 8) px = x - r.width - 16;
      if (py + r.height > innerHeight - 8) py = y - r.height - 16;
      tipEl.style.left = Math.max(8, px) + "px";
      tipEl.style.top = Math.max(8, py) + "px";
    },
    hide() { tipEl.hidden = true; },
  };
  addEventListener("scroll", () => tip.hide(), { passive: true });

  // ── shared svg defs: a hand-drawn wobble and a hatch fill ─────────────
  const defs = S("svg", { width: 0, height: 0, "aria-hidden": "true", style: "position:absolute;pointer-events:none" }, document.body);
  defs.innerHTML = `<defs>
    <filter id="rough" x="-4%" y="-4%" width="108%" height="108%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter>
    <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(38)"><path d="M0 0V5" style="stroke:var(--accent);stroke-width:.9;opacity:.5"/></pattern>
  </defs>`;

  /** measure every stroke that draws itself on, then draw them once el scrolls into view */
  function reveal(el) {
    $$("[data-draw]", el).forEach((p, i) => {
      const len = Math.ceil(p.getTotalLength?.() || 0) + 2;
      p.style.setProperty("--L", len);
      p.style.transitionDelay = `${Math.min(i * 0.06, 1.2).toFixed(2)}s`;
    });
    if (still) el.classList.add("on");
    else onceVisible(el, () => requestAnimationFrame(() => el.classList.add("on")), 0.3);
  }
  /** a hand-inked polyline through pts, with a little tremor */
  function hand(pts, r, amp = 0.7) {
    return "M" + pts.map(([x, y]) => `${(x + (r() - 0.5) * amp).toFixed(1)} ${(y + (r() - 0.5) * amp).toFixed(1)}`).join("L");
  }
  const ink = (parent, d, cls = "ink", extra = {}) => S("path", { d, class: cls, "data-draw": cls.includes("dash") ? null : "", ...extra }, parent);
  function label(parent, x, y, s, extra = {}) {
    const t = S("text", { x, y, ...extra }, parent);
    t.textContent = s;
    return t;
  }

  // ── the title types itself in ─────────────────────────────────────────
  function initType() {
    const nm = $("h1 .nm"), cur = $("h1 .cursor");
    if (still || !root.classList.contains("pre-type")) return;
    const full = nm.textContent;
    nm.textContent = "";
    root.classList.remove("pre-type");
    cur.classList.add("typing");
    let i = 0;
    const next = () => {
      nm.textContent = full.slice(0, ++i);
      if (i < full.length) setTimeout(next, 60 + Math.random() * 80 + (full[i] === " " ? 150 : 0));
      else setTimeout(() => cur.classList.remove("typing"), 600);
    };
    setTimeout(next, 420);
  }

  // ═════════════════════════════════════════════════════════════════════
  // fig. 1 — the lorenz attractor
  // ═════════════════════════════════════════════════════════════════════
  function initLorenz() {
    const stage = $("#lorenz-stage"), cv = $("#lorenz"), icv = $("#lyap"), readout = $("#readout"), hint = $(".hint", stage);
    const DEF = { sigma: 10, rho: 28, beta: 8 / 3 };
    const prm = { ...DEF };
    const LAMBDA = 0.9056; // largest lyapunov exponent at the classic parameters
    let eps = 1e-6;
    let traj = null, n = 0, cen = [0, 0, 0], ext = { rxy: 1, zr: 1 };
    let W = 1, Hh = 1, ctx = null, scale = 0, target = 0;
    let yaw = -0.52, pitch = 0.12, baseYaw = -0.52, oscAmp = 0, oscPhase = 0, lastUser = -1e9;
    let dirty = true, proj = new Float32Array(0), frameNo = 0, first = true;
    const buf = document.createElement("canvas");
    let bctx = buf.getContext("2d");
    const A = new Float64Array(3), B = new Float64Array(3);
    const TRAIL = 70, trailA = [], trailB = [];
    let simT = 0, satAt = null, runs = [], run = null;
    const DT = 0.003, SUB = 7;
    const NC = 16, ND = 3;
    let colors = [];

    function rebuild() {
      traj = lorenz({ ...prm, n: 12000, dt: 0.006, skip: 1200 });
      n = traj.length / 3;
      let sx = 0, sy = 0, sz = 0;
      for (let i = 0; i < n; i++) { sx += traj[i * 3]; sy += traj[i * 3 + 1]; sz += traj[i * 3 + 2]; }
      cen = [sx / n, sy / n, sz / n];
      let rxy = 0, zr = 0;
      for (let i = 0; i < n; i++) {
        rxy = Math.max(rxy, Math.hypot(traj[i * 3] - cen[0], traj[i * 3 + 1] - cen[1]));
        zr = Math.max(zr, Math.abs(traj[i * 3 + 2] - cen[2]));
      }
      ext = { rxy: Math.max(rxy, 1.5), zr: Math.max(zr, 1.5) };
      proj = new Float32Array(n * 2);
      seed(Math.floor(n * 0.37));
      fitScale();
      if (first) { scale = target; first = false; }
      dirty = true;
    }
    function fitScale() {
      const hx = ext.rxy, hy = ext.zr * Math.cos(pitch) + ext.rxy * Math.abs(Math.sin(pitch));
      target = Math.min((W * 0.45) / hx, (Hh * 0.44) / hy);
      if (!scale) scale = target;
    }
    function seed(idx) {
      idx = clamp(idx, 0, n - 1);
      A[0] = traj[idx * 3]; A[1] = traj[idx * 3 + 1]; A[2] = traj[idx * 3 + 2];
      B.set(A); B[0] += eps;
      trailA.length = trailB.length = 0;
      simT = 0; satAt = null;
      run = { eps, pts: [[0, Math.log10(eps)]] };
      runs.push(run);
      if (runs.length > 6) runs.shift();
    }
    function resize() {
      ({ ctx, w: W, h: Hh } = fit(cv));
      buf.width = cv.width; buf.height = cv.height;
      bctx = buf.getContext("2d");
      bctx.setTransform(cv.width / W, 0, 0, cv.height / Hh, 0, 0);
      scale = 0; fitScale(); if (!traj) scale = 0; dirty = true;
    }
    function recolor() {
      colors = Array.from({ length: NC }, (_, k) => flow(P, (k + 0.5) / NC));
      dirty = true;
    }

    // project world → screen with the current view
    let cY, sY, cP, sP, D;
    function view() { cY = Math.cos(yaw); sY = Math.sin(yaw); cP = Math.cos(pitch); sP = Math.sin(pitch); D = ext.rxy * 4.2; }
    function pr(x, y, z) {
      const X = x - cen[0], Y = y - cen[1], Z = z - cen[2];
      const x1 = X * cY - Y * sY, y1 = X * sY + Y * cY;
      const y2 = y1 * cP - Z * sP, z2 = y1 * sP + Z * cP;
      const f = D / (D + y2);
      return [W / 2 + x1 * scale * f, Hh * 0.5 - z2 * scale * f, y2];
    }

    function drawCurve() {
      view();
      const g = bctx;
      g.clearRect(0, 0, W, Hh);
      const paths = Array.from({ length: NC * ND }, () => new Path2D());
      const R = ext.rxy;
      let px = 0, py = 0;
      for (let i = 0; i < n; i++) {
        const x = traj[i * 3], y = traj[i * 3 + 1], z = traj[i * 3 + 2];
        const [sx, sy, d] = pr(x, y, z);
        proj[i * 2] = sx; proj[i * 2 + 1] = sy;
        if (i) {
          const c = Math.floor(clamp((x - cen[0]) / (2 * R) + 0.5, 0, 0.999) * NC);
          const dd = Math.floor(clamp((d + R) / (2 * R), 0, 0.999) * ND);
          const p = paths[c * ND + dd];
          p.moveTo(px, py); p.lineTo(sx, sy);
        }
        px = sx; py = sy;
      }
      const alphas = P.dark ? [0.95, 0.66, 0.36] : [0.92, 0.62, 0.32];
      g.lineWidth = P.dark ? 0.75 : 0.72;
      for (let c = 0; c < NC; c++) for (let d = 0; d < ND; d++) {
        g.strokeStyle = colors[c];
        g.globalAlpha = alphas[d];
        g.stroke(paths[c * ND + d]);
      }
      g.globalAlpha = 1;

      // the two unstable fixed points, C±
      if (prm.rho > 1) {
        const q = Math.sqrt(prm.beta * (prm.rho - 1));
        g.strokeStyle = P.muted; g.fillStyle = P.muted; g.lineWidth = 0.9;
        g.font = "italic 10px " + FONT;
        for (const [s, lab] of [[1, "C⁺"], [-1, "C⁻"]]) {
          const [x, y] = pr(s * q, s * q, prm.rho - 1);
          g.beginPath(); g.moveTo(x - 4, y); g.lineTo(x + 4, y); g.moveTo(x, y - 4); g.lineTo(x, y + 4); g.stroke();
          g.fillText(lab, x + 6, y - 5);
        }
      }
      // axis gizmo
      const ox = 30, oy = Hh - 28, Lg = 20;
      const axes = [["x", cY, -(sY * sP)], ["y", -sY, -(cY * sP)], ["z", 0, -cP]];
      g.lineWidth = 1; g.strokeStyle = P.muted; g.fillStyle = P.muted;
      for (const [nm, dx, dy] of axes) {
        g.globalAlpha = 0.85;
        g.beginPath(); g.moveTo(ox, oy); g.lineTo(ox + dx * Lg, oy + dy * Lg); g.stroke();
        g.fillText(nm, ox + dx * (Lg + 7) - 3, oy + dy * (Lg + 7) + 3);
      }
      g.globalAlpha = 1;
      g.beginPath(); g.arc(ox, oy, 1.6, 0, 7); g.fill();
      dirty = false;
    }

    function drawTwins() {
      ctx.clearRect(0, 0, W, Hh);
      ctx.drawImage(buf, 0, 0, W, Hh);
      view();
      for (const [trail, col] of [[trailB, P.inkB], [trailA, P.inkA]]) {
        if (trail.length < 2) continue;
        ctx.lineWidth = 1.7; ctx.lineCap = "round"; ctx.strokeStyle = col;
        for (let i = 1; i < trail.length; i++) {
          const a = pr(...trail[i - 1]), b = pr(...trail[i]);
          ctx.globalAlpha = (i / trail.length) ** 1.6;
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const [hx, hy] = pr(...trail[trail.length - 1]);
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(hx, hy, 3.3, 0, 7); ctx.fill();
        ctx.strokeStyle = P.bg; ctx.lineWidth = 1.2; ctx.stroke();
      }
    }

    function drawInset() {
      const { ctx: g, w, h } = fit(icv);
      g.clearRect(0, 0, w, h);
      const pad = { l: 6, r: 6, t: 16, b: 8 };
      const T = 40, ylo = -13, yhi = 2;
      const X = (t) => pad.l + (t / T) * (w - pad.l - pad.r);
      const Y = (v) => pad.t + (1 - (v - ylo) / (yhi - ylo)) * (h - pad.t - pad.b);
      g.font = "8px " + FONT;
      g.lineWidth = 0.6;
      for (const v of [0, -6, -12]) {
        g.strokeStyle = P.line2; g.beginPath(); g.moveTo(pad.l, Y(v)); g.lineTo(w - pad.r, Y(v)); g.stroke();
        g.fillStyle = P.faint; g.fillText(v === 0 ? "1" : `10${L.sup(v)}`, w - pad.r - 22, Y(v) - 2);
      }
      const classic = Math.abs(prm.sigma - 10) < 0.05 && Math.abs(prm.rho - 28) < 0.05 && Math.abs(prm.beta - 8 / 3) < 0.01;
      if (classic && run) {
        g.setLineDash([2, 3]); g.strokeStyle = P.muted; g.lineWidth = 0.8;
        const y0 = Math.log10(run.eps), tEnd = (yhi - y0) / (LAMBDA / Math.LN10);
        g.beginPath(); g.moveTo(X(0), Y(y0)); g.lineTo(X(Math.min(T, tEnd)), Y(y0 + (LAMBDA / Math.LN10) * Math.min(T, tEnd))); g.stroke();
        g.setLineDash([]);
      }
      runs.forEach((rn, k) => {
        if (rn.pts.length < 2) return;
        const cur = rn === run;
        g.strokeStyle = cur ? P.inkA : P.faint;
        g.globalAlpha = cur ? 1 : 0.25 + (0.4 * k) / runs.length;
        g.lineWidth = cur ? 1.3 : 0.8;
        g.beginPath();
        rn.pts.forEach(([t, v], i) => (i ? g.lineTo(X(t), Y(clamp(v, ylo, yhi))) : g.moveTo(X(t), Y(clamp(v, ylo, yhi)))));
        g.stroke();
      });
      g.globalAlpha = 1;
    }

    // the twins advance in simulated time (1.26 units per real second), not per frame, so their
    // speed holds at any frame rate; a trail point is laid every SUB substeps
    let sub = 0, simAcc = 0, lastD = 0;
    function lay() {
      trailA.push([A[0], A[1], A[2]]); trailB.push([B[0], B[1], B[2]]);
      if (trailA.length > TRAIL) { trailA.shift(); trailB.shift(); }
      const d = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
      if ((sub / SUB) % 2 === 0 && run.pts.length < 4000) run.pts.push([simT, Math.log10(Math.max(d, 1e-16))]);
      if (d > 8 && satAt == null) satAt = simT;
      lastD = d;
      if ((satAt != null && simT - satAt > 6) || simT > 44) seed(Math.floor(Math.random() * n));
    }
    function advance(dt) {
      simAcc += dt * 60 * SUB * DT;
      for (let guard = 0; simAcc >= DT && guard < SUB * 4; guard++) {
        lorenzStep(A, DT, prm.sigma, prm.rho, prm.beta);
        lorenzStep(B, DT, prm.sigma, prm.rho, prm.beta);
        simT += DT; simAcc -= DT;
        if (++sub % SUB === 0) lay();
      }
      return lastD;
    }
    function writeReadout(d) {
      const f = (v) => (v < 0 ? "−" : " ") + Math.abs(v).toFixed(2).padStart(5);
      readout.innerHTML =
        `<span class="a">a</span>  ${f(A[0])} ${f(A[1])} ${f(A[2])}\n` +
        `<span class="b">b</span>  ${f(B[0])} ${f(B[1])} ${f(B[2])}\n` +
        `|a − b| = ${sci(d)}   t = ${simT.toFixed(1)}`;
    }

    function frame(now, dt) {
      if (!traj) return;
      frameNo++;
      if (!dragging) {
        const idle = now - lastUser > 2600;
        oscAmp += ((idle ? 0.42 : 0) - oscAmp) * (1 - Math.exp(-dt * 0.48));
        if (idle) oscPhase += 0.252 * dt;
        const ny = baseYaw + oscAmp * Math.sin(oscPhase);
        if (Math.abs(ny - yaw) > 1e-5) { yaw = ny; dirty = true; }
      }
      if (Math.abs(target - scale) > 0.002) { scale += (target - scale) * (1 - Math.exp(-dt * 7.7)); dirty = true; }
      if (dirty) drawCurve();
      const d = advance(dt);
      drawTwins();
      if (frameNo % 2 === 0) drawInset();
      if (frameNo % 4 === 0) writeReadout(d);
    }
    function renderStill() {
      if (!traj) return;
      drawCurve();
      if (!trailA.length) for (let i = 0; i < TRAIL * 2 && trailA.length < TRAIL; i++) advance(1 / 60);
      drawTwins(); drawInset(); writeReadout(Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]));
    }
    const redraw = () => (still ? requestAnimationFrame(renderStill) : null);

    // interaction
    let dragging = false, moved = 0, px = 0, py = 0;
    stage.addEventListener("pointerdown", (e) => {
      if (e.button > 0 || e.target.closest(".inset")) return;
      dragging = true; moved = 0; px = e.clientX; py = e.clientY;
      stage.setPointerCapture(e.pointerId);
      oscAmp = 0; oscPhase = 0; baseYaw = yaw; lastUser = performance.now();
      hint.classList.add("gone");
    });
    stage.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - px, dy = e.clientY - py;
      moved += Math.abs(dx) + Math.abs(dy);
      px = e.clientX; py = e.clientY;
      yaw += dx * 0.008; pitch = clamp(pitch + dy * 0.006, -1.35, 1.35);
      baseYaw = yaw; fitScale(); dirty = true; lastUser = performance.now();
      redraw();
    });
    const release = (e) => {
      if (!dragging) return;
      dragging = false; lastUser = performance.now();
      if (moved < 5 && e.type === "pointerup") {
        const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
        let best = 0, bd = Infinity;
        for (let i = 0; i < n; i += 3) {
          const dd = (proj[i * 2] - mx) ** 2 + (proj[i * 2 + 1] - my) ** 2;
          if (dd < bd) { bd = dd; best = i; }
        }
        seed(best); redraw();
      }
    };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);

    // parameters
    const sliders = { sigma: $("#p-sigma"), rho: $("#p-rho"), beta: $("#p-beta") };
    let pending = 0;
    const schedule = () => { clearTimeout(pending); pending = setTimeout(() => { rebuild(); redraw(); }, 50); };
    for (const [k, el] of Object.entries(sliders)) {
      el.addEventListener("input", () => {
        prm[k] = +el.value;
        el.nextElementSibling.textContent = prm[k].toFixed(k === "beta" ? 2 : 1);
        schedule();
      });
    }
    $("#p-reset").addEventListener("click", () => {
      Object.assign(prm, DEF);
      for (const [k, el] of Object.entries(sliders)) { el.value = DEF[k]; el.nextElementSibling.textContent = DEF[k].toFixed(k === "beta" ? 2 : 1); }
      runs = []; yaw = baseYaw = -0.52; pitch = 0.12;
      rebuild(); redraw();
    });
    $$("#lorenz-controls .seg button").forEach((b) => b.addEventListener("click", () => {
      eps = +b.dataset.eps;
      $$("#lorenz-controls .seg button").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      seed(Math.floor(Math.random() * n)); redraw();
    }));

    recolor();
    onResize(stage, () => { resize(); if (!traj) rebuild(); redraw(); });
    onTheme(() => { recolor(); redraw(); });
    loop(stage, frame);
  }

  // ═════════════════════════════════════════════════════════════════════
  // background sketch: the golden rectangle and its spiral, behind the title
  // ═════════════════════════════════════════════════════════════════════
  function initGolden() {
    const svg = $("#golden");
    const W = 1000, Hh = W / 1.6180339887;
    svg.setAttribute("viewBox", `0 0 ${W} ${Hh.toFixed(1)}`);
    svg.setAttribute("preserveAspectRatio", "xMinYMid meet");
    svg.classList.add("draw");
    const g = S("g", { filter: "url(#rough)" }, svg);
    ink(g, `M0 0H${W}V${Hh}H0Z`, "pencil");
    let x = 0, y = 0, w = W, h = Hh, d = "", marks = "";
    for (let i = 0; i < 11; i++) {
      const k = i % 4;
      if (k === 0) { const s = h; ink(g, `M${x + s} ${y}V${y + h}`, "pencil"); d += `${i ? "" : `M${x} ${y + s}`}A${s} ${s} 0 0 1 ${x + s} ${y}`; marks += `M${x + s - 3} ${y + s}h6M${x + s} ${y + s - 3}v6`; x += s; w -= s; }
      else if (k === 1) { const s = w; ink(g, `M${x} ${y + s}H${x + w}`, "pencil"); d += `A${s} ${s} 0 0 1 ${x + s} ${y + s}`; marks += `M${x - 3} ${y + s}h6M${x} ${y + s - 3}v6`; y += s; h -= s; }
      else if (k === 2) { const s = h; ink(g, `M${x + w - s} ${y}V${y + h}`, "pencil"); d += `A${s} ${s} 0 0 1 ${x + w - s} ${y + s}`; marks += `M${x + w - s - 3} ${y}h6M${x + w - s} ${y - 3}v6`; w -= s; }
      else { const s = w; ink(g, `M${x} ${y + h - s}H${x + w}`, "pencil"); d += `A${s} ${s} 0 0 1 ${x} ${y + h - s}`; marks += `M${x + w - 3} ${y + h - s}h6M${x + w} ${y + h - s - 3}v6`; h -= s; }
    }
    ink(g, d, "ink");
    S("path", { d: marks, class: "pencil fade", "stroke-width": 0.7 }, g);
    const t = S("g", { class: "fade" }, svg);
    label(t, W - 4, Hh + 22, "φ = (1 + √5) / 2 = 1.6180339…", { "text-anchor": "end" });
    label(t, 4, Hh + 22, "a + b : a = a : b");
    reveal(svg);
    // every so often, while it is on screen, the construction is rubbed out and drawn again
    if (still) return;
    let seen = false;
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(svg);
    const again = () => setTimeout(() => {
      if (seen && !document.hidden && svg.classList.contains("on")) {
        svg.classList.add("rub"); svg.classList.remove("on");
        setTimeout(() => { svg.classList.remove("rub"); svg.classList.add("on"); }, 1700);
      }
      again();
    }, 6000 + Math.random() * 3000);
    again();
  }

  // background of §0 — a galton board across the whole section. small balls drop about ten a second,
  // rattle down the pegs and stack single file in narrow slots, filling up to the faint red bell;
  // when the tallest slot is full the floor opens and it starts over (about a minute and a half)
  function initGalton() {
    const cv = $("#galton");
    const ROWS = 14, HOP = 0.1, EVERY = 0.1, CAP = 18, START = 0.4; // CAP: balls at the top of the bell when full
    const BOUNCE = 0.5; // the last bounce scatters by N(0, (0.5 peg)²)
    const rand = rng(17);
    const choose = (n, k) => { let c = 1; for (let i = 1; i <= k; i++) c = (c * (n - i + 1)) / i; return c; };
    const binom = Array.from({ length: ROWS + 1 }, (_, k) => choose(ROWS, k) / 2 ** ROWS);
    const stat = document.createElement("canvas"), pile = document.createElement("canvas");
    let ctx, W, Hh, g = null, cols = [], reserved = [], expect = [], balls = [], falling = [], total = 0, spawnAcc = 0, state = "fill";

    const pegY = (i) => g.pegTop + i * g.dy;
    const colOf = (x) => clamp(Math.floor((x - g.x0) / g.colW), 0, g.n - 1);
    const colX = (c) => g.x0 + (c + 0.5) * g.colW;
    const restY = (n) => g.floor - g.r - n * 2 * g.r;
    const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand());
    // Φ, by Abramowitz & Stegun 7.1.26
    const Phi = (z) => {
      const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
      const e = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
      return 0.5 * (1 + Math.sign(z) * e);
    };
    /** where a ball leaving the last row ends up: binomial pegs, then a bounce off the last one */
    const landing = (k) => g.cx + (k - ROWS / 2) * g.dx + gauss() * BOUNCE * g.dx;
    function layout() {
      ({ ctx, w: W, h: Hh } = fit(cv));
      const dpr = cv.width / W;
      for (const c of [stat, pile]) { c.width = cv.width; c.height = cv.height; c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0); }
      const dx = clamp(W * 0.06, 22, 72), r = clamp(W / 420, 1.8, 2.9), colW = 2 * r + 1.2;
      const top = 26, pegTop = top + 24, floor = Hh - 26, binTop = floor - (CAP + 1) * 2 * r;
      const dy = clamp((binTop - pegTop - 6) / (ROWS - 0.5), 10, 34);
      const n = Math.floor((W - 8) / colW);
      g = { dx, dy, r, colW, n, x0: (W - n * colW) / 2, cx: W / 2, top, pegTop, floor, binTop, cap: CAP };
      // expected share of each slot: the binomial, smeared by the bounce
      expect = Array.from({ length: n }, (_, c) => {
        const a = g.x0 + c * colW, b = a + colW, sd = BOUNCE * dx;
        return binom.reduce((p, q, k) => { const m = g.cx + (k - ROWS / 2) * dx; return p + q * (Phi((b - m) / sd) - Phi((a - m) / sd)); }, 0);
      });
      g.peak = Math.max(...expect);
      const old = cols;
      cols = Array.from({ length: n }, () => 0); reserved = Array.from({ length: n }, () => 0); balls = [];
      if (!old.length) seed(Math.round((START * CAP) / g.peak)); else old.forEach((v, c) => { cols[Math.min(n - 1, Math.round((c * n) / old.length))] += v; });
      total = cols.reduce((a, v) => a + v, 0);
      drawStatic(); drawPile();
    }
    // the board does not start empty: a few hundred balls are already in, so the bell shows from the first look
    function seed(count) {
      for (let i = 0; i < count; i++) {
        let k = 0;
        for (let j = 0; j < ROWS; j++) k += rand() < 0.5 ? 1 : 0;
        const c = colOf(landing(k));
        if (cols[c] < g.cap - 2) cols[c]++;
      }
    }
    function drawStatic() {
      const c = stat.getContext("2d");
      c.clearRect(0, 0, W, Hh);
      c.strokeStyle = rgba(P.faint, 0.8); c.lineWidth = 1; c.lineCap = "round";
      c.beginPath();
      c.moveTo(g.cx - 26, g.top - 14); c.lineTo(g.cx - 4, g.top + 6);
      c.moveTo(g.cx + 26, g.top - 14); c.lineTo(g.cx + 4, g.top + 6);
      c.stroke();
      c.fillStyle = rgba(P.faint, 0.5);
      const pr = clamp(g.r * 0.55, 1, 1.8);
      for (let i = 0; i < ROWS; i++) {
        const off = (i % 2) * 0.5, y = pegY(i);
        for (let k = -60; k <= 60; k++) {
          const x = g.cx + (k + off) * g.dx;
          if (x > 3 && x < W - 3) { c.beginPath(); c.arc(x, y, pr, 0, 7); c.fill(); }
        }
      }
      c.strokeStyle = rgba(P.faint, 0.55); c.lineWidth = 0.8;
      c.beginPath(); c.moveTo(4, g.floor + 0.5); c.lineTo(W - 4, g.floor + 0.5); c.stroke();
      // the bell the slots fill to: the expected pile when the tallest slot holds CAP balls
      c.strokeStyle = rgba(P.red, P.dark ? 0.5 : 0.38); c.lineWidth = 1.2; c.lineJoin = "round";
      c.beginPath();
      let on = false;
      expect.forEach((e, i) => {
        const hgt = (e / g.peak) * CAP * 2 * g.r;
        if (hgt < 0.4) { on = false; return; }
        on ? c.lineTo(colX(i), g.floor - hgt) : c.moveTo(colX(i), g.floor - hgt);
        on = true;
      });
      c.stroke();
      c.font = `italic 10px ${FONT}`; c.fillStyle = rgba(P.faint, 0.95); c.textAlign = "center";
      const sd = g.dx * Math.sqrt(ROWS / 4 + BOUNCE * BOUNCE);
      for (const [z, lab] of [[0, "μ"], [-1, "−σ"], [1, "+σ"], [-2, "−2σ"], [2, "+2σ"]]) c.fillText(lab, g.cx + z * sd, g.floor + 15);
    }
    function dot(c, x, y) { c.beginPath(); c.arc(x, y, g.r, 0, 7); c.fill(); }
    function drawPile() {
      const c = pile.getContext("2d");
      c.clearRect(0, 0, W, Hh);
      c.fillStyle = rgba(P.muted, 0.42);
      cols.forEach((v, i) => { for (let j = 0; j < v; j++) dot(c, colX(i), restY(j)); });
    }
    // hop k runs from the top of a peg in row k to the top of the peg below, half a peg left or right;
    // hop −1 is the drop out of the funnel. off the last row the ball falls free into its slot
    function ends(b) {
      const lift = g.r * 1.8;
      if (b.k < 0) return [[g.cx, g.top], [g.cx, g.pegTop - lift]];
      return [[b.x, pegY(b.k) - lift], [b.x + (b.side ? 0.5 : -0.5) * g.dx, pegY(b.k + 1) - lift]];
    }
    function step(dt) {
      if (state === "fill") {
        spawnAcc += dt;
        while (spawnAcc > EVERY) { spawnAcc -= EVERY * (0.7 + rand() * 0.6); balls.push({ k: -1, x: g.cx, u: 0, side: 0, rights: 0, c: -1 }); }
      }
      for (const b of balls) {
        if (b.c < 0) {
          b.u += dt / HOP;
          while (b.u >= 1 && b.c < 0) {
            b.u -= 1;
            if (b.k >= 0) { b.x += (b.side ? 0.5 : -0.5) * g.dx; b.rights += b.side; }
            b.k += 1;
            b.side = rand() < 0.5 ? 0 : 1;
            if (b.k >= ROWS - 1) {
              // the last peg: one more deflection, a little scatter, and down into a slot
              b.rights += b.side;
              b.c = colOf(landing(b.rights));
              b.ty = restY(cols[b.c] + reserved[b.c]++);
              b.x0 = b.x; b.tx = colX(b.c); b.y = b.y0 = pegY(ROWS - 1) - g.r * 1.8; b.vy = 40;
            }
          }
        } else {
          b.vy += 1100 * dt; b.y += b.vy * dt;
          b.x = b.x0 + (b.tx - b.x0) * Math.min(1, (b.y - b.y0) / (g.dy * 1.5));
          if (b.y >= b.ty) {
            b.done = true; reserved[b.c]--; cols[b.c]++; total++;
            const c = pile.getContext("2d"); c.fillStyle = rgba(P.muted, 0.42); dot(c, b.tx, b.ty);
          }
        }
      }
      balls = balls.filter((b) => !b.done);
      // full when the pile holds a whole bell's worth (single slots are noisy, so not when the first touches the curve)
      if (state === "fill" && (total >= CAP / g.peak || cols.some((v) => v >= CAP * 1.6))) state = "settle";
      if (state === "settle" && !balls.length) {
        falling = [];
        cols.forEach((v, i) => { for (let j = 0; j < v; j++) falling.push({ x: colX(i), y: restY(j), vy: rand() * 60 }); });
        cols.fill(0); reserved.fill(0); total = 0; state = "drain";
        drawPile();
      }
      if (state === "drain") {
        for (const f of falling) { f.vy += 1100 * dt; f.y += f.vy * dt; }
        falling = falling.filter((f) => f.y < Hh + 10);
        if (!falling.length) { state = "fill"; spawnAcc = -1; }
      }
    }
    function ballAt(b) {
      if (b.c >= 0) return [b.x, b.y];
      const [S, E] = ends(b), u = b.u, bounce = b.k < 0 ? 0 : Math.sin(Math.PI * u) * g.dy * 0.35;
      return [S[0] + (E[0] - S[0]) * u, S[1] + (E[1] - S[1]) * u * u - bounce];
    }
    function draw() {
      ctx.clearRect(0, 0, W, Hh);
      ctx.drawImage(stat, 0, 0, W, Hh);
      ctx.drawImage(pile, 0, 0, W, Hh);
      ctx.fillStyle = rgba(P.fg2, 0.5);
      for (const b of balls) { const [x, y] = ballAt(b); dot(ctx, x, y); }
      ctx.fillStyle = rgba(P.muted, 0.42);
      for (const f of falling) dot(ctx, f.x, f.y);
      ctx.font = `italic 10px ${FONT}`; ctx.fillStyle = rgba(P.faint, 0.95); ctx.textAlign = "left";
      ctx.fillText(`galton board · ${ROWS} rows · p = ½ · n = ${total}`, g.cx + 34, g.top - 6);
    }
    onResize(cv, () => { layout(); draw(); });
    onTheme(() => { if (g) { drawStatic(); drawPile(); draw(); } });
    if (still) {
      requestAnimationFrame(() => { layout(); seed(Math.round((0.35 * CAP) / g.peak)); total = cols.reduce((a, v) => a + v, 0); drawPile(); draw(); });
      return;
    }
    loop(cv, (t, dt) => { if (!g) layout(); step(dt); draw(); });
  }

  // background of §1 — the logistic map, drawn large. the paragraph sits in the quiet stretch at its
  // top left, where every r still has a single fixed point, and the plot keeps its curve clear of the text
  function initBifurcation() {
    const cv = $("#bifurcation"), text = $("#trajectory .main p:last-of-type");
    const R0 = 1.8, R1 = 4.0;
    let ctx, W, Hh, dpr, dens = null, probe = 3.2, sweep = 0;
    const pad = { l: 8, r: 12, t: 20, b: 30 };
    function compute() {
      ({ ctx, w: W, h: Hh, dpr } = fit(cv));
      // the single branch peaks at x = 2/3 when r = 3; set the top margin so that it passes a line below the text
      const tb = text.getBoundingClientRect().bottom - cv.getBoundingClientRect().top;
      pad.t = clamp((tb + 18 - (Hh - pad.b) / 3) * 1.5, 14, Hh * 0.6);
      const pw = Math.max(1, Math.round((W - pad.l - pad.r) * dpr)), ph = Math.max(1, Math.round((Hh - pad.t - pad.b) * dpr));
      const off = document.createElement("canvas");
      off.width = pw; off.height = ph;
      const o = off.getContext("2d"), img = o.createImageData(pw, ph);
      const counts = new Uint16Array(pw * ph);
      for (let i = 0; i < pw; i++) {
        const rr = R0 + (i / pw) * (R1 - R0);
        let x = 0.5;
        for (let k = 0; k < 400; k++) x = rr * x * (1 - x);
        for (let k = 0; k < 300; k++) {
          x = rr * x * (1 - x);
          counts[Math.floor((1 - x) * (ph - 1)) * pw + i]++;
        }
      }
      const [cr, cg, cb] = L.rgb(P.faint);
      for (let q = 0; q < counts.length; q++) {
        const c = counts[q];
        if (!c) continue;
        img.data[q * 4] = cr; img.data[q * 4 + 1] = cg; img.data[q * 4 + 2] = cb;
        img.data[q * 4 + 3] = Math.min(200, 46 + c * 16);
      }
      o.putImageData(img, 0, 0);
      dens = off;
    }
    const rToX = (rr) => pad.l + ((rr - R0) / (R1 - R0)) * (W - pad.l - pad.r);
    const xToY = (x) => pad.t + (1 - x) * (Hh - pad.t - pad.b);
    function orbit(rr) {
      let x = 0.5;
      for (let k = 0; k < 1500; k++) x = rr * x * (1 - x);
      const vals = [];
      for (let k = 0; k < 128; k++) { x = rr * x * (1 - x); vals.push(x); }
      const uniq = [];
      for (const v of vals) if (!uniq.some((u) => Math.abs(u - v) < 2e-4)) uniq.push(v);
      return { vals, period: uniq.length > 64 ? Infinity : uniq.length };
    }
    function draw() {
      if (!dens) compute();
      ctx.clearRect(0, 0, W, Hh);
      ctx.drawImage(dens, pad.l, pad.t, W - pad.l - pad.r, Hh - pad.t - pad.b);
      const axis = Hh - pad.b + 6;
      ctx.strokeStyle = rgba(P.faint, 0.8); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(pad.l, axis + 0.5); ctx.lineTo(W - pad.r, axis + 0.5); ctx.stroke();
      ctx.font = `9px ${FONT}`; ctx.fillStyle = rgba(P.faint, 0.95); ctx.textAlign = "center";
      for (const [rr, lab] of [[2, "2"], [2.5, "2.5"], [3, "3"], [3.449, "3.45"], [3.5699, "3.57"], [3.8284, "3.83"], [4, "4"]]) {
        const x = rToX(rr);
        if (W < 520 && (lab === "3.45" || lab === "3.83")) continue;
        ctx.beginPath(); ctx.moveTo(x, axis); ctx.lineTo(x, axis + 4); ctx.stroke();
        ctx.fillText(lab, clamp(x, 10, W - 10), axis + 15);
      }
      const x = rToX(probe), o = orbit(probe);
      const tr = text.getBoundingClientRect(), cr = cv.getBoundingClientRect();
      const under = x < tr.right - cr.left + 10 ? tr.bottom - cr.top + 12 : pad.t;
      ctx.strokeStyle = rgba(P.muted, 0.45); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, Math.max(pad.t, under)); ctx.lineTo(x, axis); ctx.stroke();
      ctx.fillStyle = rgba(P.muted, 0.85);
      for (const v of o.vals.slice(0, o.period === Infinity ? 128 : o.period)) {
        ctx.beginPath(); ctx.arc(x, xToY(v), o.period === Infinity ? 1 : 2.6, 0, 7); ctx.fill();
      }
      const desc = o.period === Infinity ? "chaos" : o.period === 1 ? "a fixed point" : `period ${o.period}`;
      // notes in the empty lower left, under the single branch
      ctx.font = `italic 10px ${FONT}`; ctx.fillStyle = rgba(P.faint, 0.95); ctx.textAlign = "left";
      ctx.fillText(`r = ${probe.toFixed(2)} · ${desc}`, pad.l + 2, axis - 10);
      ctx.fillText("logistic map · xₙ₊₁ = r·xₙ(1 − xₙ)", pad.l + 2, axis - 24);
    }
    onResize(cv, () => { dens = null; draw(); });
    onTheme(() => { dens = null; draw(); });
    if (still) return;
    loop(cv, (t, dt) => {
      sweep += 0.085 * dt;
      probe = 2.05 + 1.94 * (0.5 - 0.5 * Math.cos(sweep));
      draw();
    });
  }

  // ═════════════════════════════════════════════════════════════════════
  // fig. 2 — career as a piano roll
  // ═════════════════════════════════════════════════════════════════════
  const scoreRows = new Map();
  function chordGlyph(r, { sp = 17, y = 0, x0 = 0, parent }) {
    FAM_KEYS.forEach((f, i) => {
      const k = r.skills.filter((id) => C.skillIndex[id].fam === f).length;
      const cx = x0 + i * sp;
      if (k) S("circle", { cx, cy: y, r: (1.7 + 1.35 * Math.sqrt(k)).toFixed(2), style: `fill:${famVar(f)}`, opacity: 0.92 }, parent);
      else S("circle", { cx, cy: y, r: 1.2, style: "fill:var(--line2)" }, parent);
    });
  }
  function roleTip(r) {
    const a = C.years(r.start), b = end(r);
    const fams = FAM_KEYS.map((f) => [f, r.skills.filter((id) => C.skillIndex[id].fam === f).length]).filter(([, k]) => k);
    return `<b>${esc(r.role)}</b><span class="t-sub">${esc(r.where)}${r.org ? " · " + esc(r.org.toLowerCase()) : ""}</span>` +
      `<span class="t-row"><em>${ym(r.start)} — ${ym(r.end)}</em> · ${tenure(a, b)}</span>` +
      (r.text ? `<span class="t-row" style="color:var(--fg2)">${esc(r.text)}</span>` : "") +
      (fams.length ? `<span class="t-row">chord: ${fams.map(([f, k]) => `<em style="color:${famVar(f)}">${FAM[f].label}</em> ×${k}`).join(" · ")}</span>` : "");
  }
  function initScore() {
    const svg = $("#score"), box = svg.parentElement;
    let compact = null;
    // narrow screens drop the "where" column so the notes start on screen
    function draw() {
      svg.innerHTML = "";
      scoreRows.clear();
      const W = compact ? 660 : 1160, X0 = compact ? 24 : 414, X1 = compact ? 540 : 988, CHX = compact ? 562 : 1030, CHS = compact ? 13 : 17, rowH = 22;
      const WX = compact ? null : 224;
      svg.style.minWidth = compact ? "620px" : "900px";
      const t0 = 2010.4, t1 = Math.max(NOW, 2026.5) + 0.5;
      const X = (t) => X0 + ((t - t0) / (t1 - t0)) * (X1 - X0);
      const layout = [];
      let y = 70;
      for (const g of Object.keys(C.GROUPS)) {
        layout.push({ kind: "group", g, y }); y += 19;
        for (const r of C.CAREER.filter((c) => c.group === g)) { layout.push({ kind: "role", r, y }); y += rowH; }
        y += 10;
      }
      const pooledY = y + 12, dynY = pooledY + 50, axisY = dynY + 32, Hh = axisY + 34;
      svg.setAttribute("viewBox", `0 0 ${W} ${Hh}`);
      const rowY = {};

      // header
      if (!compact) label(svg, 24, 40, "role", { class: "t-faint", "letter-spacing": 1.2 });
      if (WX) label(svg, WX, 40, "where", { class: "t-faint", "letter-spacing": 1.2 });
      label(svg, (X0 + X1) / 2, 40, "tenure", { class: "t-faint", "letter-spacing": 1.2, "text-anchor": "middle" });
      FAM_KEYS.forEach((f, i) => {
        const x = CHX + i * CHS;
        label(svg, x + 2, 42, f === "noble" ? "infra" : f, { class: "t-faint", transform: `rotate(-58 ${x + 2} 42)`, "font-size": 9, style: `fill:${famVar(f)}` });
      });
      S("path", { d: `M16 50H${W - 16}`, class: "staff", "stroke-width": 1 }, svg);

      // year grid + now
      for (let yr = 2010; yr <= t1; yr += 2) if (X(yr) >= X0) S("path", { d: `M${X(yr).toFixed(1)} 56V${axisY}`, class: "grid" }, svg);
      const xn = X(NOW);
      S("path", { d: `M${xn.toFixed(1)} 56V${axisY}`, class: "now" }, svg);

      const rowsG = S("g", {}, svg);
      for (const it of layout) {
        if (it.kind === "group") {
          label(svg, 24, it.y + 4, it.g.toUpperCase(), { "letter-spacing": 1.8, "font-size": 9.5, style: `fill:var(--${C.GROUPS[it.g]})` });
          continue;
        }
        const r = it.r, yy = it.y, a = C.years(r.start), b = end(r), col = `var(--${C.GROUPS[r.group]})`;
        rowY[r.id] = yy;
        const row = S("g", { class: "row", "data-id": r.id, tabindex: 0, role: "button", "aria-label": `${r.role}, ${r.where}, ${ym(r.start)} to ${ym(r.end)}` }, rowsG);
        S("rect", { class: "row-hit", x: 12, y: yy - rowH / 2, width: W - 24, height: rowH, rx: 4 }, row);
        S("path", { d: `M${X0 - 8} ${yy}H${X1 + 8}M${CHX - 8} ${yy}H${CHX + 6 * CHS + 8}`, class: "staff" }, row);
        const xa = X(a), xb = X(b), name = r.roleShort || r.role;
        if (compact) {
          const left = xa - 10 - name.length * 6.1 > 6;
          label(row, left ? xa - 9 : xb + (r.end ? 6 : 13), yy + 3.5, name, { class: r.group === "before data" ? "t-muted" : "", "text-anchor": left ? "end" : "start", "font-size": 10.5 });
        } else {
          label(row, 24, yy + 4, name, { class: r.group === "before data" ? "t-muted" : "" });
          if (WX) label(row, WX, yy + 4, r.short || r.where, { class: "t-muted" });
        }
        S("rect", { x: xa.toFixed(1), y: yy - 2.6, width: Math.max(1.5, xb - xa).toFixed(1), height: 5.2, rx: 2.6, style: `fill:${col}`, opacity: 0.85 }, row);
        S("ellipse", { cx: (xa + 1).toFixed(1), cy: yy, rx: 5.4, ry: 3.8, transform: `rotate(-24 ${(xa + 1).toFixed(1)} ${yy})`, style: `fill:${col}` }, row);
        if (!r.end) {
          S("path", { d: `M${(xb + 7).toFixed(1)} ${yy}l-7 -4.2v8.4z`, style: `fill:${col}` }, row);
          S("path", { d: `M${(xb - 5).toFixed(1)} ${yy - 7}a5 5 0 0 1 10 0`, style: `stroke:${col}`, fill: "none", "stroke-width": 1.2 }, row);
          S("circle", { cx: xb.toFixed(1), cy: yy - 8.4, r: 1, style: `fill:${col}` }, row);
        } else {
          S("path", { d: `M${xb.toFixed(1)} ${yy - 4}v8`, style: `stroke:${col}`, "stroke-width": 1.3 }, row);
        }
        chordGlyph(r, { sp: CHS, y: yy, x0: CHX, parent: row });
        scoreRows.set(r.id, row);
      }

      // pooled estimate
      S("path", { d: `M16 ${pooledY - 16}H${W - 16}`, class: "staff", "stroke-width": 1 }, svg);
      const pa = X(C.years(C.POOLED.start));
      S("path", { d: `M${pa.toFixed(1)} ${pooledY}L${((pa + xn) / 2).toFixed(1)} ${pooledY - 6.5}L${xn.toFixed(1)} ${pooledY}L${((pa + xn) / 2).toFixed(1)} ${pooledY + 6.5}z`, style: "fill:var(--fg)" }, svg);
      if (compact) label(svg, pa - 10, pooledY + 4, C.POOLED.label, { "font-weight": 700, style: "fill:var(--fg)", "text-anchor": "end" });
      else label(svg, 24, pooledY + 4, C.POOLED.label, { "font-weight": 700, style: "fill:var(--fg)" });
      if (WX) label(svg, WX, pooledY + 4, `${C.POOLED.where} · ${tenure(C.years(C.POOLED.start), NOW)}`, { class: "t-muted" });

      // dynamics: how many parts play at once
      const step = 1 / 24, counts = [];
      for (let t = t0; t <= NOW; t += step) counts.push([t, C.CAREER.filter((r) => C.years(r.start) <= t && t < (r.end ? C.years(r.end) : NOW + 1)).length]);
      const sm = counts.map((c, i) => [c[0], (counts[Math.max(0, i - 1)][1] + 2 * c[1] + counts[Math.min(counts.length - 1, i + 1)][1]) / 4]);
      const k = 5.5;
      const top = sm.map(([t, v]) => `${X(t).toFixed(1)} ${(dynY - v * k).toFixed(1)}`);
      const bot = sm.slice().reverse().map(([t, v]) => `${X(t).toFixed(1)} ${(dynY + v * k).toFixed(1)}`);
      S("path", { d: `M${top.join("L")}L${bot.join("L")}Z`, style: "fill:var(--fg2);stroke:var(--fg2)", "fill-opacity": 0.14, "stroke-opacity": 0.5, "stroke-width": 0.7 }, svg);
      S("path", { d: `M${X0} ${dynY}H${xn.toFixed(1)}`, class: "staff" }, svg);
      label(svg, 24, compact ? dynY - 24 : dynY + 4, "dynamics", { "font-weight": 700, style: "fill:var(--fg)" });
      if (WX) label(svg, WX, dynY + 4, "roles held at once", { class: "t-muted" });
      const DYN = ["", "p", "mf", "f", "ff", "fff"];
      let segStart = 0, peak = { v: 0 };
      for (let i = 1; i <= counts.length; i++) {
        if (i === counts.length || counts[i][1] !== counts[segStart][1]) {
          const v = counts[segStart][1], xa = X(counts[segStart][0]), xb = X(counts[i - 1][0]);
          if (v && xb - xa > 30) label(svg, (xa + xb) / 2, dynY - v * k - 6, DYN[v], { "text-anchor": "middle", "font-style": "italic", "font-weight": 700, style: "fill:var(--muted)", "font-size": 11.5 });
          if (v > peak.v) peak = { v, xa, xb };
          segStart = i;
        }
      }
      const WORD = ["no", "one", "two", "three", "four", "five"];
      if (peak.v >= 2) {
        const px = (peak.xa + peak.xb) / 2, py = dynY + peak.v * k + 2;
        S("path", { d: `M${px.toFixed(1)} ${py}C${px - 4} ${py + 12}, ${px - 40} ${py + 10}, ${px - 60} ${py + 12}`, class: "lead" }, svg);
        label(svg, px - 64, py + 15, `${WORD[peak.v]} parts at once`, { class: "annot", "text-anchor": "end" });
      }

      // axis
      S("path", { d: `M${X0} ${axisY}H${X1}`, style: "stroke:var(--muted)" }, svg);
      for (let yr = 2010; yr <= t1; yr += 2) {
        if (X(yr) < X0) continue;
        S("path", { d: `M${X(yr).toFixed(1)} ${axisY}v4`, style: "stroke:var(--muted)" }, svg);
        label(svg, X(yr), axisY + 16, String(yr), { class: "t-faint", "text-anchor": "middle", "font-size": 9.5 });
      }
      label(svg, xn, axisY + 28, "now", { class: "annot", "text-anchor": "middle" });

      // annotations, hand-lettered
      function annot(id, when, text, at) {
        const yy = rowY[id], xNote = X(C.years(when)), xt = X(at);
        S("path", { d: `M${(xt + 5).toFixed(1)} ${yy - 1}C${(xt + 28).toFixed(1)} ${yy - 11}, ${(xNote - 26).toFixed(1)} ${yy - 11}, ${(xNote - 9).toFixed(1)} ${yy - 2}`, class: "lead" }, svg);
        label(svg, xt, yy + 3.5, text, { class: "annot", "text-anchor": "end" });
      }
      if (!compact) {
        annot("clin", "2019-06", "data enters, 2019.06", 2017.7);
        annot("nlw", "2025-01", "llms & voice enter the score", 2023.6);
        annot("a2k", "2025-11", "now playing", 2024.75);
      }
      // a resume reads backwards from now: on phones, open the roll at its latest bars
      if (compact) requestAnimationFrame(() => { box.scrollLeft = box.scrollWidth; });
    }
    const relayout = () => {
      const c = box.clientWidth < 700;
      if (c !== compact) { compact = c; draw(); }
    };
    relayout();
    onResize(box, relayout);

    // interaction
    let cur = null;
    const setHi = (row) => {
      if (cur === row) return;
      cur?.classList.remove("hi");
      cur = row;
      svg.classList.toggle("dim", !!row);
      row?.classList.add("hi");
    };
    svg.addEventListener("pointermove", (e) => {
      const row = e.target.closest(".row");
      setHi(row);
      if (row) tip.show(roleTip(C.CAREER.find((r) => r.id === row.dataset.id)), e.clientX, e.clientY);
      else tip.hide();
    });
    svg.addEventListener("pointerleave", () => { setHi(null); tip.hide(); });
    svg.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "touch") return;
      const row = e.target.closest(".row");
      setHi(row);
      if (row) tip.show(roleTip(C.CAREER.find((r) => r.id === row.dataset.id)), e.clientX, e.clientY); else tip.hide();
    });
    const go = (row) => {
      const el = $(`#job-${row.dataset.id}`) || $(`#oth-${row.dataset.id}`) || $(row.dataset.id === "msc" || row.dataset.id === "bsc" ? "#education" : "#trajectory");
      el.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "center" });
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 1400);
    };
    svg.addEventListener("click", (e) => { const row = e.target.closest(".row"); if (row && e.pointerType !== "touch") go(row); });
    svg.addEventListener("keydown", (e) => { const row = e.target.closest(".row"); if (row && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); go(row); } });

    // how to read
    const key = $("#score-key");
    const note = (c) => `<svg width="34" height="12"><rect x="5" y="3.4" width="26" height="5.2" rx="2.6" style="fill:var(--${c})" opacity=".85"/><ellipse cx="6" cy="6" rx="5.4" ry="3.8" transform="rotate(-24 6 6)" style="fill:var(--${c})"/><path d="M31 2v8" style="stroke:var(--${c})" stroke-width="1.3"/></svg>`;
    key.innerHTML = `<span class="title">how to read</span>` +
      Object.entries(C.GROUPS).map(([g, c]) => `<span class="k">${note(c)}${g}</span>`).join("") +
      `<span class="k"><svg width="24" height="14"><path d="M17 8l-7 -4.2v8.4z" style="fill:var(--orange)"/><path d="M5 5a5 5 0 0 1 10 0" fill="none" style="stroke:var(--orange)" stroke-width="1.2"/><circle cx="10" cy="3.6" r="1" style="fill:var(--orange)"/></svg>still playing</span>` +
      `<span class="k"><svg width="58" height="12">${FAM_KEYS.map((f, i) => `<circle cx="${4 + i * 8.4}" cy="6" r="${[3.6, 2.6, 3.2, 2.2, 2.6, 3, 2][i]}" style="fill:${famVar(f)}"/>`).join("")}</svg>chord: skill families in play, dot size ∼ tools used</span>` +
      `<span class="k"><svg width="30" height="12"><path d="M2 6L15 1L28 6L15 11z" style="fill:var(--fg)"/></svg>pooled estimate</span>` +
      `<span class="k"><b style="font-style:italic;color:var(--muted)">p · mf · f</b>one, two, three roles at once</span>`;
  }

  function initJobs() {
    const main = $("#jobs-main"), other = $("#jobs-other");
    const tags = (ids) => H("ul", { class: "tags" }, ids.slice().sort((p, q) => FAM_KEYS.indexOf(C.skillIndex[p].fam) - FAM_KEYS.indexOf(C.skillIndex[q].fam))
      .map((id) => H("li", { style: `--c:${famVar(C.skillIndex[id].fam)}`, "data-skill": id, text: C.skillIndex[id].abbr })));
    for (const r of C.CAREER.filter((c) => c.main)) {
      const chord = S("svg", { class: "chord", width: 128, height: 20, viewBox: "0 0 128 20", "aria-hidden": "true" });
      S("path", { d: "M2 10H126", class: "staff", style: "stroke:var(--line2);stroke-width:.6" }, chord);
      chordGlyph(r, { sp: 18.5, y: 10, x0: 8, parent: chord });
      main.append(H("article", { class: "job", id: `job-${r.id}`, "data-role": r.id },
        H("div", { class: "when", html: `${ym(r.start)} — ${ym(r.end)}<br><span class="faint">${tenure(C.years(r.start), end(r))}</span>` }),
        H("div", {},
          H("h4", { text: r.role }),
          H("p", { class: "org", html: `${esc(r.where)} <span>· ${esc(r.org.toLowerCase())}</span>` }),
          H("p", { class: "txt", text: r.text }),
          tags(r.skills)),
        chord));
    }
    for (const r of C.CAREER.filter((c) => !c.main && c.group !== "education")) {
      other.append(H("li", { id: `oth-${r.id}`, "data-role": r.id },
        H("span", { class: "r", text: r.role }),
        r.where ? H("span", { class: "w", text: r.where }) : null,
        H("span", { class: "d", text: `${ym(r.start)} — ${ym(r.end)} · ${tenure(C.years(r.start), end(r))}` }),
        r.text ? H("span", { class: "x", text: r.text }) : null));
    }
    // hovering an entry lights its row in fig. 2
    const score = $("#score");
    for (const el of $$("[data-role]", $("#trajectory"))) {
      el.addEventListener("mouseenter", () => { const row = scoreRows.get(el.dataset.role); if (row) { score.classList.add("dim"); row.classList.add("hi"); } });
      el.addEventListener("mouseleave", () => { const row = scoreRows.get(el.dataset.role); score.classList.remove("dim"); row?.classList.remove("hi"); });
    }
  }

  // ═════════════════════════════════════════════════════════════════════
  // fig. 3 — atlas coelestis of the stack
  // ═════════════════════════════════════════════════════════════════════
  function initAtlas() {
    const svg = $("#atlas"), cv = $("#atlas-sky"), stage = $("#atlas-stage");
    const yearIn = $("#atlas-year"), yearOut = $("#atlas-year-out"), playBtn = $("#atlas-play");
    const R0 = 84, R1 = 312, Y0 = 2017, Y1 = 2027;
    const MAXY = Math.max(2026.9, NOW);
    yearIn.max = MAXY.toFixed(2); yearIn.value = MAXY.toFixed(2);
    // early years get more room: the radius grows like t^0.75, so the crowded centre opens up
    const rad = (t) => R0 + Math.pow((clamp(t, Y0, Y1) - Y0) / (Y1 - Y0), 0.75) * (R1 - R0);
    svg.setAttribute("viewBox", "-400 -400 800 800");

    const by = Object.fromEntries(FAM_KEYS.map((f) => [f, C.SKILLS.filter((s) => s.fam === f)
      .sort((p, q) => p.firstLight - q.firstLight || p.name.localeCompare(q.name))]));
    const weights = FAM_KEYS.map((f) => by[f].length + 1.4), total = weights.reduce((a, b) => a + b, 0);
    let acc = -Math.PI / 2 - (weights[0] / total) * Math.PI;
    const sec = {};
    FAM_KEYS.forEach((f, i) => { const span = (weights[i] / total) * 2 * Math.PI; sec[f] = { a0: acc, a1: acc + span, mid: acc + span / 2 }; acc += span; });

    const r = rng(23), stars = [];
    for (const f of FAM_KEYS) {
      const list = by[f], { a0, a1 } = sec[f], u = (a1 - a0) / (list.length + 1.4);
      list.forEach((s, i) => {
        const ang = a0 + u * (1.2 + i) + (r() - 0.5) * u * 0.28;
        // stars that rose in the same season are staggered in and out so they don't sit on each other
        const twin = i > 0 && Math.abs(s.firstLight - list[i - 1].firstLight) < 0.3;
        const rr = rad(s.firstLight) + (twin ? (i % 2 ? 11 : -9) : 0) + (r() - 0.5) * 8;
        stars.push({ s, f, ang, rr, x: Math.cos(ang) * rr, y: Math.sin(ang) * rr, size: 2.1 + 1.65 * Math.sqrt(s.magnitude) });
      });
    }

    const disc = S("g", {}, svg);
    const fixed = S("g", {}, svg);
    // year rings
    for (let yr = Y0; yr <= 2026; yr++) S("circle", { r: rad(yr).toFixed(1), class: "ring" }, disc);
    const nowRing = S("circle", { r: rad(MAXY), class: "ring now" }, disc);
    // sector spokes
    for (const f of FAM_KEYS) {
      const a = sec[f].a0;
      S("path", { d: `M${(Math.cos(a) * 30).toFixed(1)} ${(Math.sin(a) * 30).toFixed(1)}L${(Math.cos(a) * (R1 + 12)).toFixed(1)} ${(Math.sin(a) * (R1 + 12)).toFixed(1)}`, class: "spoke", "stroke-dasharray": "1 4" }, disc);
    }
    // constellation lines, in order of discovery
    const segs = [];
    const conG = S("g", {}, disc);
    for (const f of FAM_KEYS) {
      const list = stars.filter((st) => st.f === f);
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i];
        segs.push({ t: Math.max(a.s.firstLight, b.s.firstLight), el: S("path", { d: `M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`, class: "con", style: `stroke:${famVar(f)}` }, conG) });
      }
    }
    // stars
    const starG = S("g", {}, disc);
    for (const st of stars) {
      const col = famVar(st.f);
      const g = S("g", { class: "star", transform: `translate(${st.x.toFixed(1)} ${st.y.toFixed(1)})`, "data-id": st.s.id }, starG);
      const halo = S("circle", { r: (st.size * 2.7).toFixed(1), class: "halo" + (still ? "" : " twinkle"), style: `fill:${col};--tw:${(2.6 + r() * 2.6).toFixed(2)}s;--td:${(-r() * 5).toFixed(2)}s` }, g);
      if (st.s.magnitude >= 4) {
        const Lg = st.size * 3.4;
        S("path", { d: `M${-Lg} 0H${Lg}M0 ${-Lg}V${Lg}`, style: `stroke:${col}`, "stroke-width": 0.8, opacity: 0.75 }, g);
      }
      if (st.s.magnitude >= 7) {
        const Ld = st.size * 1.9;
        S("path", { d: `M${-Ld} ${-Ld}L${Ld} ${Ld}M${-Ld} ${Ld}L${Ld} ${-Ld}`, style: `stroke:${col}`, "stroke-width": 0.6, opacity: 0.55 }, g);
      }
      S("circle", { r: st.size.toFixed(2), style: `fill:${col}` }, g);
      S("circle", { r: Math.max(0.7, st.size * 0.32).toFixed(2), style: "fill:var(--bg)", opacity: 0.75 }, g);
      S("circle", { r: (st.size * 2.6 + 5).toFixed(1), fill: "transparent" }, g);
      st.g = g;
    }
    // year labels along the spoke between the first and last constellation
    const yrG = S("g", {}, disc), yrLabels = [];
    const ya = sec[FAM_KEYS[0]].a0;
    for (const yr of [2018, 2020, 2022, 2024, 2026]) {
      const x = Math.cos(ya) * rad(yr), y = Math.sin(ya) * rad(yr);
      yrLabels.push({ x, y, el: label(yrG, x, y, String(yr), { class: "yr", "text-anchor": "middle", dy: ".35em", style: "paint-order:stroke;stroke:var(--bg);stroke-width:3px" }) });
    }
    S("path", { d: "M-5 0H5M0 -5V5", style: "stroke:var(--faint)" }, disc);
    S("circle", { r: R0 - 6, fill: "url(#hatch)", opacity: 0.35 }, disc);
    const centre = S("g", {}, svg);
    label(centre, 0, -10, "before data", { "text-anchor": "middle", class: "lat", "font-size": 11 });
    label(centre, 0, 7, "2010 — 2017", { "text-anchor": "middle", class: "yr" });
    label(centre, 0, 21, "no stars yet", { "text-anchor": "middle", class: "yr" });
    // constellation names on the rim
    const defsA = S("defs", {}, svg), famLabels = [];
    for (const f of FAM_KEYS) {
      const p = S("path", { id: `arc-${f}` }, defsA);
      const t = S("text", { class: "lat" }, disc);
      const tp = S("textPath", { href: `#arc-${f}`, startOffset: "50%", "text-anchor": "middle" }, t);
      tp.innerHTML = `${esc(FAM[f].latin)}<tspan style="fill:var(--faint);font-style:normal;font-size:10px"> · ${esc(FAM[f].label)}</tspan>`;
      famLabels.push({ f, p, flip: null });
    }
    // fixed rim: graduated like a planisphere
    const RIM = R1 + 40;
    S("circle", { r: RIM, class: "rim" }, fixed);
    S("circle", { r: RIM + 12, class: "rim" }, fixed);
    let ticks = "";
    for (let dgr = 0; dgr < 360; dgr += 2.5) {
      const a = (dgr * Math.PI) / 180, l = dgr % 30 === 0 ? 12 : dgr % 10 === 0 ? 7 : 4;
      ticks += `M${(Math.cos(a) * RIM).toFixed(1)} ${(Math.sin(a) * RIM).toFixed(1)}L${(Math.cos(a) * (RIM + l)).toFixed(1)} ${(Math.sin(a) * (RIM + l)).toFixed(1)}`;
    }
    S("path", { d: ticks, class: "tick" }, fixed);
    for (let dgr = 0; dgr < 360; dgr += 30) {
      const a = ((dgr - 90) * Math.PI) / 180;
      label(fixed, Math.cos(a) * (RIM + 24), Math.sin(a) * (RIM + 24), `${dgr}°`, { class: "yr", "text-anchor": "middle", dy: ".35em" });
    }

    // star names live in screen space, so they never turn with the sky, and are placed greedily:
    // brightest first, each in the first of eight spots around its star that collides with nothing
    const lblG = S("g", {}, svg);
    for (const st of stars) st.lbl = label(lblG, 0, 0, st.s.abbr, { class: "slbl" });
    let CW = 6.3, LH = 11, VB = 800;
    const order = stars.slice().sort((a, b) => b.s.magnitude - a.s.magnitude || a.rr - b.rr);
    function placeLabels() {
      const c = Math.cos(theta), s = Math.sin(theta);
      const scr = new Map(stars.map((st) => [st, [st.x * c - st.y * s, st.x * s + st.y * c]]));
      const placed = [];
      const overlaps = (b) => placed.some((p) => !(b[2] < p[0] || b[0] > p[2] || b[3] < p[1] || b[1] > p[3]));
      const onStar = (b, self) => stars.some((o) => {
        if (o === self) return false;
        const [ox, oy] = scr.get(o), rr = o.size + 1.5;
        const nx = clamp(ox, b[0], b[2]), ny = clamp(oy, b[1], b[3]);
        return (nx - ox) ** 2 + (ny - oy) ** 2 < rr * rr;
      });
      const inside = (b) => [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].every(([x, y]) => x * x + y * y < (R1 + 8) ** 2);
      for (const st of order) {
        const [sx, sy] = scr.get(st), A = Math.atan2(sy, sx);
        const w = st.s.abbr.length * CW + 2, d = st.size + 4;
        let best = null;
        for (const da of [0, 0.55, -0.55, 1.15, -1.15, 1.75, -1.75, Math.PI]) {
          const a = A + da, cx = Math.cos(a), cy = Math.sin(a), ax = sx + cx * d, ay = sy + cy * d;
          const x0 = cx > 0.35 ? ax : cx < -0.35 ? ax - w : ax - w / 2;
          const y0 = cy > 0.35 ? ay : cy < -0.35 ? ay - LH : ay - LH / 2;
          const b = [x0, y0, x0 + w, y0 + LH];
          if (!overlaps(b) && !onStar(b, st) && inside(b)) { best = b; break; }
        }
        st.lblHidden = !best;
        if (best) {
          placed.push(best);
          st.lbl.setAttribute("x", (best[0] + 1).toFixed(1));
          st.lbl.setAttribute("y", (best[1] + LH * 0.8).toFixed(1));
        }
        st.lbl.style.opacity = st.lblHidden || st.g.classList.contains("off") ? 0 : 1;
      }
    }

    // rotation
    let theta = 0;
    function arcD(f, flip, th) {
      const pad = 0.04, { a0, a1 } = sec[f];
      const rr = flip ? R1 + 27 : R1 + 18;
      const p0 = [Math.cos(a0 + pad) * rr, Math.sin(a0 + pad) * rr], p1 = [Math.cos(a1 - pad) * rr, Math.sin(a1 - pad) * rr];
      return flip ? `M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}A${rr} ${rr} 0 0 0 ${p0[0].toFixed(1)} ${p0[1].toFixed(1)}`
        : `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}A${rr} ${rr} 0 0 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
    }
    function applyRotation() {
      const deg = (theta * 180) / Math.PI;
      disc.setAttribute("transform", `rotate(${deg.toFixed(2)})`);
      cv.style.transform = `rotate(${deg.toFixed(2)}deg)`;
      placeLabels();
      for (const yl of yrLabels) yl.el.setAttribute("transform", `rotate(${(-deg).toFixed(2)} ${yl.x.toFixed(1)} ${yl.y.toFixed(1)})`);
      for (const fl of famLabels) {
        const flip = Math.sin(sec[fl.f].mid + theta) > 0.15;
        if (flip !== fl.flip) { fl.flip = flip; fl.p.setAttribute("d", arcD(fl.f, flip)); }
      }
    }

    // time
    let year = MAXY;
    function setYear(t) {
      year = t;
      for (const st of stars) {
        const off = st.s.firstLight > t + 1e-6;
        st.g.classList.toggle("off", off);
        st.lbl.style.opacity = off || st.lblHidden ? 0 : 1;
      }
      for (const sg of segs) sg.el.style.opacity = sg.t > t + 1e-6 ? 0 : "";
      nowRing.setAttribute("r", rad(t).toFixed(1));
      const y = Math.floor(t), m = Math.min(12, Math.floor((t - y) * 12) + 1);
      yearOut.textContent = t >= MAXY - 0.02 ? "now" : `${y}.${String(m).padStart(2, "0")}`;
      if (+yearIn.value !== t) yearIn.value = t;
    }
    yearIn.addEventListener("input", () => { stopPlay(); setYear(+yearIn.value); });
    let playing = false;
    function stopPlay() { playing = false; playBtn.textContent = "▶"; playBtn.setAttribute("aria-label", "play the sky from 2017 to now"); }
    function play() {
      if (playing) return stopPlay();
      playing = true; playBtn.textContent = "■"; playBtn.setAttribute("aria-label", "stop");
      const from = year >= MAXY - 0.02 ? Y0 : year, dur = 7500 * ((MAXY - from) / (MAXY - Y0)), t0 = performance.now();
      const stepF = (now) => {
        if (!playing) return;
        const k = clamp((now - t0) / dur, 0, 1);
        setYear(lerp(from, MAXY, k));
        if (k < 1) requestAnimationFrame(stepF); else stopPlay();
      };
      requestAnimationFrame(stepF);
    }
    playBtn.addEventListener("click", play);
    if (!still) onceVisible(stage, () => { setYear(Y0); setTimeout(play, 350); }, 0.35);

    // pointer: drag to turn, hover/tap for the star's card
    const local = (e) => {
      const rc = svg.getBoundingClientRect();
      return { x: ((e.clientX - rc.left) / rc.width) * VB - VB / 2, y: ((e.clientY - rc.top) / rc.height) * VB - VB / 2 };
    };
    let drag = null, omega = 0, spinning = false, hiStar = null;
    function starTip(st) {
      const s = st.s, first = s.roles.slice().sort((p, q) => C.years(p.start) - C.years(q.start))[0];
      const fl = s.since && s.since >= C.years(first.start) ? `${Math.floor(s.since)} <span class="faint">(the tool's own debut)</span>` : `${ym(first.start)} · ${esc(first.short || first.where)}`;
      return `<b style="color:${famVar(st.f)}">${esc(s.name)}</b><span class="t-sub">${esc(FAM[st.f].latin)} · ${esc(FAM[st.f].label)}</span>` +
        `<span class="t-row">first light <em>${fl}</em></span>` +
        `<span class="t-row">magnitude <em>${s.magnitude}</em> · used in ${s.magnitude} role${s.magnitude > 1 ? "s" : ""}</span>` +
        `<span class="t-row"><em>${s.roles.map((ro) => esc(ro.short || ro.where)).join(", ")}</em></span>` +
        (s.level ? `<span class="t-row">self-assessed: <em>${s.level}</em></span>` : "");
    }
    function setStar(st, e) {
      if (st !== hiStar) {
        hiStar?.g.classList.remove("hi");
        hiStar = st;
        svg.classList.toggle("dim", !!st);
        st?.g.classList.add("hi");
      }
      if (st) tip.show(starTip(st), e.clientX, e.clientY); else tip.hide();
    }
    const starAt = (e) => { const g = e.target.closest?.(".star"); return g && !g.classList.contains("off") ? stars.find((s) => s.g === g) : null; };
    stage.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      const p = local(e);
      drag = { a: Math.atan2(p.y, p.x), th: theta, moved: 0, star: starAt(e), last: performance.now(), lastTh: theta };
      omega = 0;
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener("pointermove", (e) => {
      if (!drag) { setStar(starAt(e), e); return; }
      const p = local(e), a = Math.atan2(p.y, p.x);
      let da = a - drag.a;
      if (da > Math.PI) da -= 2 * Math.PI; else if (da < -Math.PI) da += 2 * Math.PI;
      drag.moved += Math.abs(da);
      const now = performance.now();
      theta = drag.th + da;
      omega = (theta - drag.lastTh) / Math.max(1, now - drag.last) * 16;
      drag.last = now; drag.lastTh = theta;
      if (drag.moved > 0.02) { setStar(null, e); applyRotation(); }
    });
    const up = (e) => {
      if (!drag) return;
      const d = drag; drag = null;
      if (d.moved <= 0.02) { setStar(d.star, e); return; }
      if (!still && Math.abs(omega) > 0.002 && !spinning) {
        spinning = true;
        let last = 0;
        const spin = (t) => {
          const k = last ? Math.min(3, (t - last) / (1000 / 60)) : 1;
          last = t;
          theta += omega * k; omega *= Math.pow(0.94, k); applyRotation();
          if (Math.abs(omega) > 0.0004 && !drag) requestAnimationFrame(spin); else spinning = false;
        };
        requestAnimationFrame(spin);
      }
    };
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", () => { drag = null; });
    stage.addEventListener("pointerleave", (e) => { if (!drag) setStar(null, e); });

    // the sky behind: field stars and a milky way, on canvas
    function drawSky() {
      const { ctx, w } = fit(cv);
      const k = w / VB;
      ctx.clearRect(0, 0, w, w);
      ctx.save(); ctx.translate(w / 2, w / 2); ctx.scale(k, k);
      const disk = ctx.createRadialGradient(0, 0, 0, 0, 0, R1 + 26);
      if (P.dark) { disk.addColorStop(0, "rgba(20,22,23,.55)"); disk.addColorStop(1, "rgba(20,22,23,.18)"); }
      else { disk.addColorStop(0, rgba(P.bgSoft, 0.7)); disk.addColorStop(1, rgba(P.bgSoft, 0.15)); }
      ctx.fillStyle = disk;
      ctx.beginPath(); ctx.arc(0, 0, R1 + 26, 0, 7); ctx.fill();
      const rr = rng(5), nz = noise1(9);
      const gauss = () => Math.sqrt(-2 * Math.log(rr() + 1e-9)) * Math.cos(2 * Math.PI * rr());
      const band = 0.62, cb = Math.cos(band), sb = Math.sin(band);
      ctx.fillStyle = P.fg;
      for (let i = 0; i < 6500; i++) {
        const t = (rr() * 2 - 1) * (R1 + 20);
        const off = gauss() * 34 * (1 + 0.6 * nz(t * 0.02 + 3)) + nz(t * 0.01) * 26;
        const x = t * cb - off * sb, y = t * sb + off * cb;
        if (x * x + y * y > (R1 + 22) ** 2) continue;
        ctx.globalAlpha = 0.035 + rr() * 0.05;
        ctx.fillRect(x, y, 1.1, 1.1);
      }
      for (let i = 0; i < 820; i++) {
        const a = rr() * Math.PI * 2, d = Math.sqrt(rr()) * (R1 + 22);
        ctx.globalAlpha = 0.12 + rr() * rr() * 0.55;
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 0.3 + rr() * rr() * 1.1, 0, 7); ctx.fill();
      }
      ctx.restore();
    }

    // legend
    const mini = (sz, col = "var(--fg2)") => `<svg width="${Math.ceil(sz * 6)}" height="${Math.ceil(sz * 6)}" viewBox="${-sz * 3} ${-sz * 3} ${sz * 6} ${sz * 6}"><circle r="${sz * 2.6}" style="fill:${col}" opacity=".16"/><circle r="${sz}" style="fill:${col}"/></svg>`;
    $("#atlas-key").innerHTML = `<span class="title">how to read</span>` +
      `<span class="k">${[1, 3, 6, 9].map((m) => mini((2.1 + 1.65 * Math.sqrt(m)) * 0.62)).join("")}used in 1 · 3 · 6 · 9 roles</span>` +
      `<span class="k"><svg width="30" height="30" viewBox="-15 -15 30 30"><circle r="5" class="r1" fill="none" stroke="var(--line2)" stroke-dasharray="1 2"/><circle r="9.5" fill="none" stroke="var(--line2)" stroke-dasharray="1 2"/><circle r="14" fill="none" stroke="var(--accent)" opacity=".7"/></svg>rings are years: 2017 at the centre, now at the rim</span>` +
      `<span class="k"><svg width="30" height="12"><path d="M2 9L14 4L28 7" fill="none" stroke="var(--fg2)" stroke-dasharray="3 3"/></svg>each constellation joined in order of discovery</span>` +
      FAM_KEYS.map((f) => `<span class="k"><svg width="12" height="12"><circle cx="6" cy="6" r="4.2" style="fill:${famVar(f)}"/></svg><i>${esc(FAM[f].latin)}</i>&nbsp;<span class="faint">· ${esc(FAM[f].label)} · ${by[f].length}</span></span>`).join("");

    applyRotation();
    setYear(MAXY);
    // phones: crop to the disc and letter it larger, so names stay legible
    onResize(stage, () => {
      const small = stage.clientWidth < 520;
      VB = small ? 744 : 800; CW = small ? 10.2 : 6.3; LH = small ? 17 : 11;
      svg.classList.toggle("small", small);
      svg.setAttribute("viewBox", `${-VB / 2} ${-VB / 2} ${VB} ${VB}`);
      placeLabels(); drawSky();
    });
    onTheme(drawSky);
  }

  function initSkillLists() {
    const LV = { basic: 1, intermediate: 2, good: 3, excellent: 4 };
    const ul = $("#prof");
    for (const s of C.SKILLS.filter((x) => x.level)) {
      ul.append(H("li", {}, H("span", { text: s.name }), H("span", { class: "lv", text: s.level }),
        H("span", { class: "bar-l", html: [1, 2, 3, 4].map((i) => `<i class="${i <= LV[s.level] ? "f" : ""}"></i>`).join("") })));
    }
    ul.after(H("p", { class: "note", style: { marginTop: "12px" }, text: "self-assessed. the full stack is charted in fig. 3." }));
    $("#skills-plain").append(...FAM_KEYS.map((f) => H("p", {}, H("b", { text: `${FAM[f].latin} · ${FAM[f].label}` }),
      C.SKILLS.filter((s) => s.fam === f).map((s) => s.name).join(", "))));
  }

  // ═════════════════════════════════════════════════════════════════════
  // §3 projects
  // ═════════════════════════════════════════════════════════════════════
  function initNewsLogo() {
    $("#np-logo").innerHTML = `<defs>
      <linearGradient id="np-b" gradientUnits="userSpaceOnUse" gradientTransform="matrix(.562541 0 0 .567972 -14.99112 -11.702371)" x1="26.648937" y1="20.603781" x2="135.66525" y2="114.39767"><stop offset="0" stop-color="#5a9fd4"/><stop offset="1" stop-color="#306998"/></linearGradient>
      <linearGradient id="np-y" gradientUnits="userSpaceOnUse" gradientTransform="matrix(.562541 0 0 .567972 -14.99112 -11.702371)" x1="150.96111" y1="192.35176" x2="112.03144" y2="137.27299"><stop offset="0" stop-color="#ffd43b"/><stop offset="1" stop-color="#ffe873"/></linearGradient></defs>
      <rect width="127" height="127" x=".5" y=".5" rx="28" style="fill:var(--bg-soft);stroke:var(--line2)"/>
      <g transform="translate(58.5 55.9) scale(.98) rotate(-22) translate(0 -50)">
        <path style="fill:var(--fg)" d="M0 0C3.6 0 6.4 2.4 6.4 5.4C6.4 8 4.6 9 4.4 11.5C4.2 14.5 10.5 14 15.5 19.5C20.5 25 23 31 23 38C23 48 14.5 50 13.5 58C13 64 20 65 20 74C20 75.5 17.8 75.5 17.8 77C21.5 77 21.5 82 17.8 82C21.5 82 21.5 87 17.8 87C17.8 89 21 88.5 21 91C21 94 22 95 22 97.5C22 99.2 21 100 19.5 100H-19.5C-21 100 -22 99.2 -22 97.5C-22 95 -21 94 -21 91C-21 88.5 -17.8 89 -17.8 87C-21.5 87 -21.5 82 -17.8 82C-21.5 82 -21.5 77 -17.8 77C-17.8 75.5 -20 75.5 -20 74C-20 65 -13 64 -13.5 58C-14.5 50 -23 48 -23 38C-23 31 -20.5 25 -15.5 19.5C-10.5 14 -4.2 14.5 -4.4 11.5C-4.6 9 -6.4 8 -6.4 5.4C-6.4 2.4 -3.6 0 0 0Z"/>
        <g transform="translate(0 31) scale(.245) translate(-55 -55)">
          <circle cx="40.42" cy="13.33" r="5.3" fill="#fff"/><circle cx="70.58" cy="98.42" r="5.3" fill="#fff"/>
          <path fill="url(#np-b)" d="M54.918785,9.1927421e-4C50.335132,0.02221727 45.957846,0.41313697 42.106285,1.0946693 30.760069,3.0991731 28.700036,7.2947714 28.700035,15.032169v10.21875h26.8125v3.40625h-26.8125-10.0625c-7.792459,0-14.6157588,4.683717-16.7499998,13.59375-2.46181998,10.212966-2.57101508,16.586023 0,27.25 1.9059283,7.937852 6.4575432,13.593748 14.2499998,13.59375h9.21875v-12.25c0-8.849902 7.657144-16.656248 16.75-16.65625h26.78125c7.454951 0 13.406253-6.138164 13.40625-13.625v-25.53125c0-7.2663386-6.12998-12.7247771-13.40625-13.9374997C64.281548,0.32794397 59.502438-0.02037903 54.918785,9.1927421e-4ZM40.418785,8.2196694c2.769547 0 5.03125,2.2986456 5.03125,5.1249996-0.000002,2.816336-2.261703,5.09375-5.03125,5.09375-2.779476-0.000001-5.03125-2.277415-5.03125-5.09375-0.000001-2.826353 2.251774-5.1249996 5.03125-5.1249996Z"/>
          <path fill="url(#np-y)" d="M85.637535,28.657169v11.90625c0,9.230755-7.825895,16.999999-16.75,17h-26.78125c-7.335833,0-13.406249,6.278483-13.40625,13.625v25.531247c0,7.266344 6.318588,11.540324 13.40625,13.625004 8.487331,2.49561 16.626237,2.94663 26.78125,0 6.750155-1.95439 13.406253-5.88761 13.40625-13.625004V86.500919h-26.78125v-3.40625h26.78125 13.406254c7.792461,0 10.696251-5.435408 13.406241-13.59375 2.79933-8.398886 2.68022-16.475776 0-27.25-1.92578-7.757441-5.60387-13.59375-13.406241-13.59375ZM70.575035,93.313419c2.779478 0.000003 5.03125,2.277417 5.03125,5.093747-0.000002,2.826354-2.251775,5.125004-5.03125,5.125004-2.76955 0-5.03125-2.29865-5.03125-5.125004 0.000002-2.81633 2.261697-5.093747 5.03125-5.093747Z"/>
        </g>
        <g fill="none" stroke-width="2.4" transform="translate(-13.4 62.6)">
          <path stroke="#4b8bbe" d="M1.2 11V1.2h2.4a2.9 2.9 0 0 1 0 5.8H1.2"/><path stroke="#ffd43b" transform="translate(9.6 0)" d="M7 1.2H1.2V11H7M1.2 6.1H6"/><path stroke="#4b8bbe" transform="translate(19.2 0)" d="M1.2 11V1.2h2.4a2.9 2.9 0 0 1 0 5.8H1.2"/>
        </g>
      </g>
      <g style="fill:var(--fg)"><circle cx="70" cy="116" r="2.5"/><circle cx="82" cy="111" r="2.2"/><circle cx="92" cy="104" r="2"/></g>`;
  }

  /** six weeks of the newsletter's calendar, monday first: every saturday is an issue */
  function initNewsCal() {
    const host = $("#np-cal");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monday = new Date(today); monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - 7);
    const cells = [..."mtwtfss"].map((d) => `<b>${d}</b>`);
    let next = null;
    for (let k = 0; k < 42; k++) {
      const d = new Date(monday); d.setDate(monday.getDate() + k);
      const sat = d.getDay() === 6, past = d < today, isToday = +d === +today;
      if (sat && !past && !next) next = d;
      cells.push(`<i class="${[sat && "sat", past && "past", isToday && "today"].filter(Boolean).join(" ")}"></i>`);
    }
    const fmt = next.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" }).toLowerCase();
    host.innerHTML = `<div class="grid">${cells.join("")}</div><span class="nxt">next issue · <b>${fmt}</b>, then every saturday</span>`;
  }

  function initPhilosophy() {
    const svg = $("#philosophy"), read = $("#ph-read");
    const nodes = C.THINKERS.map((t, i) => ({ ...t, en: t.id, i, ups: [], downs: [], mode: "en", anim: null }));
    const by = Object.fromEntries(nodes.map((n) => [n.id, n]));
    for (const [a, b] of C.INFLUENCES) if (by[a] && by[b]) { by[b].ups.push(a); by[a].downs.push(b); }
    const edgeG = S("g", {}, svg), nodeG = S("g", {}, svg);
    const edges = C.INFLUENCES.filter(([a, b]) => by[a] && by[b]).map(([a, b]) => ({ a, b, el: S("path", { class: "edge" }, edgeG) }));
    for (const n of nodes) {
      const hub = n.ups.length + n.downs.length >= 3;
      n.g = S("g", { class: "node", "data-n": n.id, tabindex: 0, "aria-label": `${n.en}, in the original: ${n.native}` }, nodeG);
      n.dot = S("circle", { r: hub ? 3.4 : 2.4 }, n.g);
      n.hit = S("circle", { r: 15, class: "hit" }, n.g);
      n.txt = label(n.g, 0, 0, n.en, { "text-anchor": "middle" });
    }
    function layout() {
      const W = Math.max(260, svg.clientWidth), Hh = Math.max(200, svg.clientHeight);
      svg.setAttribute("viewBox", `0 0 ${W} ${Hh}`);
      const padX = 30, rows = [0.13, 0.86, 0.5];
      for (const n of nodes) {
        n.x = padX + (n.i * (W - 2 * padX)) / (nodes.length - 1);
        n.y = Hh * (rows[n.i % 3] + (n.i % 3 === 2 ? (n.i % 2 ? 0.05 : -0.05) : 0));
        for (const c of [n.dot, n.hit]) { c.setAttribute("cx", n.x.toFixed(1)); c.setAttribute("cy", n.y.toFixed(1)); }
        // on a narrow card, every other name in the outer rows steps out a line so neighbours don't touch
        const crowded = (3 * (W - 2 * padX)) / (nodes.length - 1) < 80, step = crowded && n.i % 3 !== 2 && Math.floor(n.i / 3) % 2 ? 13 : 0;
        n.txt.setAttribute("x", n.x.toFixed(1));
        n.txt.setAttribute("y", (n.i % 3 === 1 ? n.y + 18 + step : n.y - 10 - step).toFixed(1));
      }
      for (const e of edges) {
        const A = by[e.a], B = by[e.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y;
        e.el.setAttribute("d", `M${A.x.toFixed(1)} ${A.y.toFixed(1)}Q${(mx - dy * 0.12).toFixed(1)} ${(my + dx * 0.12).toFixed(1)} ${B.x.toFixed(1)} ${B.y.toFixed(1)}`);
      }
    }
    new ResizeObserver(layout).observe(svg);

    // a name changes tongue by decoding, letter by letter, through a blur of greek and latin capitals
    const POOL = "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩABCDEFGHIKLMNOPQRSTVXYZ";
    function settle(n) { n.txt.textContent = n.mode === "en" ? n.en : n.native; n.txt.setAttribute("class", n.mode === "en" ? "" : n.lang); }
    function want(n, mode, now = performance.now()) {
      if (n.mode === mode) return;
      n.mode = mode;
      if (still) { settle(n); return; }
      n.anim = { from: n.txt.textContent, to: mode === "en" ? n.en : n.native, t0: now, dur: 520 + n.native.length * 22, last: 0 };
      n.txt.setAttribute("class", "");
    }
    function animate(now) {
      for (const n of nodes) {
        const a = n.anim;
        if (!a) continue;
        const p = clamp((now - a.t0) / a.dur, 0, 1);
        if (p >= 1) { n.anim = null; settle(n); continue; }
        if (now - a.last < 45) continue;
        a.last = now;
        const len = Math.round(lerp(a.from.length, a.to.length, ease(p))), done = Math.floor(ease(p) * len);
        let out = "";
        for (let j = 0; j < len; j++) out += j < done ? (a.to[j] ?? "") : POOL[Math.floor(Math.random() * POOL.length)];
        n.txt.textContent = out;
      }
    }

    // a ripple of translation runs down a lineage now and then: each reader turns english, then back
    const queue = [];
    let hovering = false, introDone = false, nextRipple = 0;
    const at = (t, fn) => { queue.push({ t, fn }); queue.sort((x, y) => x.t - y.t); };
    function ripple(now) {
      const roots = nodes.filter((n) => !n.ups.length);
      const root = roots[Math.floor(Math.random() * roots.length)];
      const seen = new Set([root.id]), level = [[root, null]];
      for (let d = 0; level.length; d++) {
        const next = [];
        for (const [n, parent] of level) {
          const t = now + d * 620;
          if (parent) {
            const e = edges.find((x) => x.a === parent.id && x.b === n.id);
            at(t - 380, () => e.el.classList.add("lit"));
            at(t + 700, () => e.el.classList.remove("lit"));
          }
          at(t, () => !hovering && want(n, "en"));
          at(t + 1150, () => !hovering && want(n, "native"));
          for (const c of n.downs) if (!seen.has(c)) { seen.add(c); next.push([by[c], n]); }
        }
        level.splice(0, level.length, ...next);
      }
      nextRipple = now + 7000 + seen.size * 620;
    }

    // hover: the thinker and their lineage read in english, everyone else stays in the original
    const closure = (id, key) => {
      const seen = new Set(), st = [...by[id][key]];
      while (st.length) { const x = st.pop(); if (!seen.has(x)) { seen.add(x); st.push(...by[x][key]); } }
      return seen;
    };
    const idle = read.innerHTML;
    function focus(id) {
      hovering = !!id;
      queue.length = 0;
      for (const e of edges) e.el.classList.remove("lit");
      if (!id) {
        svg.classList.remove("dim");
        for (const n of nodes) { n.g.classList.remove("on", "self"); if (introDone || still) want(n, "native"); }
        for (const e of edges) e.el.classList.remove("up", "down");
        read.innerHTML = idle;
        nextRipple = performance.now() + 2500;
        return;
      }
      const ups = closure(id, "ups"), downs = closure(id, "downs");
      svg.classList.add("dim");
      for (const n of nodes) {
        const on = n.id === id || ups.has(n.id) || downs.has(n.id);
        n.g.classList.toggle("on", on);
        n.g.classList.toggle("self", n.id === id);
        want(n, on ? "en" : "native");
      }
      for (const e of edges) {
        e.el.classList.toggle("up", ups.has(e.a) && (ups.has(e.b) || e.b === id));
        e.el.classList.toggle("down", (e.a === id || downs.has(e.a)) && downs.has(e.b));
      }
      const n = by[id];
      read.innerHTML = `<b>${n.en}</b> <span class="faint">(${esc(n.native)})</span>` +
        (n.ups.length ? ` read <span class="u">${n.ups.join(", ")}</span>` : " read no one on this map") +
        (n.downs.length ? ` · read by <span class="d">${n.downs.join(", ")}</span>` : "") +
        ` · lineage of ${ups.size + downs.size} thinkers`;
    }
    svg.addEventListener("pointerover", (e) => { const g = e.target.closest(".node"); if (g) focus(g.dataset.n); });
    svg.addEventListener("pointerleave", () => focus(null));
    svg.addEventListener("focusin", (e) => { const g = e.target.closest(".node"); if (g) focus(g.dataset.n); });
    svg.addEventListener("focusout", () => focus(null));

    if (still) { for (const n of nodes) { n.mode = "native"; settle(n); } return; }
    // when the card first shows, every name drifts from english into its own tongue, oldest first
    onceVisible(svg, () => {
      const now = performance.now();
      nodes.forEach((n) => at(now + 300 + n.i * 140, () => !hovering && want(n, "native")));
      at(now + 300 + nodes.length * 140 + 900, () => { introDone = true; });
      nextRipple = now + 300 + nodes.length * 140 + 4000;
    }, 0.4);
    loop(svg, (now) => {
      while (queue.length && queue[0].t <= now) queue.shift().fn();
      if (introDone && !hovering && !queue.length && now > nextRipple) ripple(now);
      animate(now);
    });
  }

  function initJumpwise() {
    const pre = $("#jw-demo");
    const K = (s) => `<span class="k">${s}</span>`, F = (s) => `<span class="f">${s}</span>`, Cm = '<span class="c"># …</span>';
    const lines = [
      `${K("class")} ${F("Model")}:`,
      `    ${K("def")} ${F("fit")}(self, X, y):`,
      `        ${Cm}`,
      `    ${K("def")} ${F("predict")}(self, X):`,
      `        ${Cm}`,
      ``,
      `${K("def")} ${F("evaluate")}(model, data):`,
      `    ${Cm}`,
    ];
    const steps = [
      [0, "⌘⌥↓", "next symbol", "class Model"],
      [1, "⌘⌥→", "enter level", "method fit"],
      [3, "⌘⌥↓", "next symbol", "method predict"],
      [0, "⌘⌥←", "exit level", "class Model"],
      [6, "⌘⌥↓", "next symbol", "function evaluate"],
      [0, "⌘⌥↑", "previous symbol", "class Model"],
    ];
    let i = 0, last = 0;
    const render = () => {
      const [ln, key, what, sym] = steps[i];
      pre.innerHTML = lines.map((l, j) => (j === ln ? `<span class="cur">${l}</span>` : l)).join("\n") +
        `<span class="sb">${key}  ${what} · ${sym}</span>`;
    };
    render();
    loop(pre, (t) => { if (t - last > 1500) { last = t; i = (i + 1) % steps.length; render(); } });
  }

  // ═════════════════════════════════════════════════════════════════════
  // §4 education sketches
  // ═════════════════════════════════════════════════════════════════════
  function initAnomaly() {
    const svg = $("#anomaly");
    svg.classList.add("sketch", "draw");
    const N = [[34, 42], [90, 22], [146, 50], [204, 26], [262, 46], [298, 94], [56, 98], [114, 90], [178, 104], [238, 92], [92, 132], [214, 134]];
    const E = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [0, 6], [6, 7], [7, 2], [7, 8], [8, 9], [9, 4], [9, 5], [6, 10], [10, 7], [8, 11], [11, 9], [2, 8], [1, 7]];
    const BAD = 8;
    const r = rng(8);
    const g = S("g", { filter: "url(#rough)" }, svg);
    const ed = E.map(([a, b]) => `M${N[a][0]} ${N[a][1]}L${N[b][0]} ${N[b][1]}`);
    ed.forEach((d) => ink(g, d, "pencil"));
    N.forEach(([x, y], i) => ink(g, `M${x + 4.5} ${y}A4.5 4.5 0 1 1 ${x + 4.5} ${y - 0.01}`, i === BAD ? "ink accent" : "ink"));
    ink(g, `M${N[BAD][0] + 15} ${N[BAD][1]}A15 15 0 1 1 ${N[BAD][0] + 15} ${N[BAD][1] - 0.01}`, "pencil dash accent");
    const fx = S("g", { class: "fade" }, svg);
    if (!still) {
      [0, 3, 6, 9, 12, 15, 16].forEach((j, k) => {
        const c = S("circle", { r: 1.8, style: `fill:var(--${E[j].includes(BAD) ? "accent" : "fg2"})` }, fx);
        S("animateMotion", { path: ed[j], dur: `${(1.8 + r() * 1.4).toFixed(2)}s`, begin: `${(-r() * 2).toFixed(2)}s`, repeatCount: "indefinite" }, c);
      });
      const ring = S("circle", { cx: N[BAD][0], cy: N[BAD][1], r: 6, fill: "none", style: "stroke:var(--accent)", "stroke-width": 1 }, fx);
      S("animate", { attributeName: "r", values: "5;19", dur: "2.4s", repeatCount: "indefinite" }, ring);
      S("animate", { attributeName: "opacity", values: ".9;0", dur: "2.4s", repeatCount: "indefinite" }, ring);
    }
    ink(S("g", { class: "fade" }, svg), `M${N[BAD][0] + 16} ${N[BAD][1] + 8}C ${N[BAD][0] + 30} ${N[BAD][1] + 22}, 250 ${N[BAD][1] + 30}, 262 ${N[BAD][1] + 30}`, "pencil");
    label(fx, 266, N[BAD][1] + 33, "localized", { style: "fill:var(--accent)" });
    // the signal at the flagged node
    const pts = [];
    for (let x = 22; x <= 298; x += 2) {
      const spike = Math.exp(-(((x - 214) / 6) ** 2)) * 17;
      pts.push([x, 178 - Math.sin(x / 7) * 5 - Math.sin(x / 2.3) * 1.2 - spike]);
    }
    ink(g, `M22 186H298`, "pencil dash");
    ink(g, hand(pts.filter(([x]) => x <= 198), r, 0.4), "ink");
    ink(g, hand(pts.filter(([x]) => x >= 198 && x <= 230), r, 0.3), "ink accent");
    ink(g, hand(pts.filter(([x]) => x >= 230), r, 0.4), "ink");
    label(fx, 22, 160, "the flagged node's signal", {});
    label(fx, 214, 152, "t*", { "text-anchor": "middle", style: "fill:var(--accent)" });
    reveal(svg);
  }

  function initTopo() {
    const svg = $("#topo");
    svg.classList.add("sketch", "draw");
    const cell = 4, cols = 81, rows = 51;
    const n1 = noise1(4), n2 = noise1(12);
    const field = [];
    for (let j = 0; j < rows; j++) {
      const row = [];
      for (let i = 0; i < cols; i++) {
        const x = i * cell, y = j * cell;
        const v = 1.0 * Math.exp(-(((x - 104) ** 2) / (2 * 52 ** 2) + ((y - 78) ** 2) / (2 * 40 ** 2)))
          + 0.72 * Math.exp(-(((x - 238) ** 2) / (2 * 38 ** 2) + ((y - 122) ** 2) / (2 * 30 ** 2)))
          + 0.07 * (n1(x * 0.035 + y * 0.011) + n2(y * 0.04 - x * 0.013));
        row.push(v);
      }
      field.push(row);
    }
    const g = S("g", { filter: "url(#rough)" }, svg);
    [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.92].forEach((lv, k) => {
      const segs = contours(field, lv, cell);
      const d = segs.map(([a, b]) => `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`).join("");
      if (d) S("path", { d, class: k % 4 === 0 ? "ink" : "pencil", style: "stroke-dasharray:none", opacity: k % 4 === 0 ? 0.9 : 0.85 }, g).classList.add("fade");
    });
    const river = spline([[-4, 186], [52, 168], [118, 152], [168, 158], [206, 176], [246, 194], [272, 206]], 10);
    S("path", { d: "M" + river.map((p) => p.map((v) => v.toFixed(1)).join(" ")).join("L"), fill: "none", style: "stroke:var(--blue)", "stroke-width": 1.2, "stroke-dasharray": "4 2.5", class: "fade" }, g);
    const fx = S("g", { class: "fade" }, svg);
    for (const [x, y] of [[50, 162], [58, 158], [64, 164], [120, 146], [128, 150], [134, 144], [170, 152], [176, 160]]) S("circle", { cx: x, cy: y, r: 1.9, style: "fill:var(--accent)" }, fx);
    label(fx, 22, 140, "growth follows", {});
    label(fx, 22, 151, "the valley", {});
    label(fx, 104, 82, "▲", { "text-anchor": "middle", style: "font-style:normal;fill:var(--fg2)", "font-size": 8 });
    label(fx, 238, 126, "▲", { "text-anchor": "middle", style: "font-style:normal;fill:var(--fg2)", "font-size": 8 });
    ink(S("g", { class: "fade" }, svg), "M296 30V12M292 18L296 11L300 18", "pencil");
    label(fx, 296, 42, "N", { "text-anchor": "middle", style: "font-style:normal" });
    let t = "";
    for (let x = 0; x <= 320; x += 40) t += `M${x} 0v4M${x} 200v-4`;
    for (let y = 0; y <= 200; y += 40) t += `M0 ${y}h4M320 ${y}h-4`;
    S("path", { d: t + "M.5 .5H319.5V199.5H.5Z", class: "pencil", fill: "none" }, svg);
    reveal(svg);
  }

  // ═════════════════════════════════════════════════════════════════════
  // fig. 5 — languages as signals
  // ═════════════════════════════════════════════════════════════════════
  function initWaves() {
    const host = $("#waves");
    const rows = C.LANGUAGES.map((lang, i) => {
      const cv = H("canvas", { "aria-hidden": "true" });
      const row = H("div", { class: "wave", tabindex: 0, "aria-label": `${lang.name}: ${lang.note}, level ${lang.level} of 5` },
        H("div", { class: "nm", html: `${esc(lang.script)}<small>${esc(lang.name.toLowerCase())}</small>` }),
        cv,
        H("div", { class: "lv", html: `<b>${esc(lang.note)}</b><span>level ${lang.level}/5</span><span class="hello">“${esc(lang.hello)}”</span>` }));
      host.append(row);
      const rr = rng(31 + i);
      const harm = [1, 0.25 + rr() * 0.4, rr() * 0.3, rr() * 0.2].map((a, k) => ({ a, f: k + 1, ph: rr() * 6.28 }));
      const st = { lang, row, cv, harm, f0: 2.2 + i * 0.55 + rr() * 0.4, nz: noise1(50 + i), hot: 0, want: 0 };
      row.addEventListener("pointerenter", () => { st.want = 1; });
      row.addEventListener("pointerleave", () => { st.want = 0; });
      row.addEventListener("focus", () => { st.want = 1; });
      row.addEventListener("blur", () => { st.want = 0; });
      row.addEventListener("click", () => { st.want = st.want ? 0 : 1; row.classList.toggle("on", !!st.want); });
      return st;
    });
    const sizes = new Map();
    const draw = (t) => {
      for (const st of rows) {
        st.hot = lerp(st.hot, st.want, 0.08);
        let s = sizes.get(st.cv);
        if (!s) { s = fit(st.cv); sizes.set(st.cv, s); }
        const { ctx, w, h } = s;
        ctx.clearRect(0, 0, w, h);
        const mid = h / 2;
        ctx.strokeStyle = P.line2; ctx.lineWidth = 0.6; ctx.setLineDash([1, 3]);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 40) { ctx.moveTo(x + 0.5, 4); ctx.lineTo(x + 0.5, h - 4); }
        ctx.moveTo(0, mid + 0.5); ctx.lineTo(w, mid + 0.5);
        ctx.stroke(); ctx.setLineDash([]);
        const lvl = st.lang.level / 5, A = lvl * (mid - 5), noiseA = (1 - lvl) * mid * 0.5 + 0.6;
        const speed = 0.0009 + st.hot * 0.003, ts = t * speed;
        const draws = [[P.dark ? 4 : 3, P.dark ? 0.16 : 0.1], [1.25, 1]];
        const col = st.hot > 0.02 ? mix(P.fg2, P.accent, st.hot) : P.fg2;
        for (const [lw, al] of draws) {
          ctx.lineWidth = lw; ctx.globalAlpha = al; ctx.strokeStyle = col;
          ctx.beginPath();
          for (let x = 0; x <= w; x += 2) {
            const u = x / w;
            let v = 0;
            for (const hm of st.harm) v += hm.a * Math.sin(2 * Math.PI * st.f0 * hm.f * u + hm.ph - ts * hm.f * 2);
            v /= 1.5;
            const syll = 0.55 + 0.45 * Math.sin(u * 18 - ts * 6) * Math.sin(u * 5.3 + ts * 1.7);
            const env = lerp(1, Math.max(0.08, syll), st.hot) * (0.85 + 0.15 * Math.sin(u * Math.PI));
            const y = mid - v * A * env + st.nz(x * 0.21 + t * 0.006) * noiseA + st.nz(x * 0.9 - t * 0.02) * noiseA * 0.35;
            x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    };
    onResize(host, () => { sizes.clear(); if (still) draw(0); });
    onTheme(() => { if (still) draw(0); });
    loop(host, draw);
    if (still) requestAnimationFrame(() => draw(0));
  }

  // ═════════════════════════════════════════════════════════════════════
  // §6 — neofetch, and the accent swatches that re-ink the page
  // ═════════════════════════════════════════════════════════════════════
  function initFetch() {
    const pre = $("#fetch");
    const traj = lorenz({ n: 9000, dt: 0.006, skip: 500 });
    const pts = [];
    let xmin = Infinity, xmax = -Infinity, zmin = Infinity, zmax = -Infinity;
    for (let i = 0; i < traj.length; i += 3) { xmin = Math.min(xmin, traj[i]); xmax = Math.max(xmax, traj[i]); zmin = Math.min(zmin, traj[i + 2]); zmax = Math.max(zmax, traj[i + 2]); }
    for (let i = 0; i < traj.length; i += 3) pts.push([(traj[i] - xmin) / (xmax - xmin), 1 - (traj[i + 2] - zmin) / (zmax - zmin)]);
    const COLS = 22, ROWS = 11;
    const art = braille(pts, COLS, ROWS);
    const TERM = { blue: "#83a598", aqua: "#8ec07c", yellow: "#fabd2f" };
    const paint = (line) => [...line].map((ch, c) => {
      const t = c / (COLS - 1);
      const col = t < 0.5 ? mix(TERM.blue, TERM.aqua, t * 2) : mix(TERM.aqua, TERM.yellow, (t - 0.5) * 2);
      return `<span style="color:${col}">${ch}</span>`;
    }).join("");
    const SW = [["orange", "#fe8019"], ["red", "#fb4934"], ["yellow", "#fabd2f"], ["green", "#b8bb26"], ["aqua", "#8ec07c"], ["blue", "#83a598"], ["purple", "#d3869b"]];
    function render() {
      const theme = root.dataset.theme === "dark" ? "gruvbox-dark" : "gruvbox-light";
      const accent = root.dataset.accent || "orange";
      const since = C.years(C.POOLED.start);
      const info = [
        `<span class="u">mark</span>@<span class="u">yerevan</span>`,
        `<span class="d">────────────────</span>`,
        `<span class="k">role</span>       data scientist · ml &amp; ai engineer`,
        `<span class="k">now</span>        ai/ml engineer @ advance2000`,
        `<span class="k">interests</span>  history · music · philosophy · science`,
        `<span class="k">hobby</span>      linux ricing`,
        `<span class="k">theme</span>      ${theme} <span class="d">(this page)</span>`,
        `<span class="k">accent</span>     ${accent}`,
        `<span class="k">font</span>       maple mono`,
        `<span class="k">editor</span>     vs code + jumpwise`,
        `<span class="k">uptime</span>     data since ${ym(C.POOLED.start)} · ${(NOW - since).toFixed(1)} yrs`,
        ``,
        SW.map(([nm, hex]) => `<span class="sw${nm === accent ? " on" : ""}" data-accent="${nm}" role="button" tabindex="0" aria-label="accent ${nm}" style="color:${hex}">██</span>`).join(" "),
      ];
      const narrow = pre.clientWidth < 560;
      let out = [];
      if (narrow) out = [...art.map(paint), "", ...info];
      else {
        const pad = Math.max(0, Math.floor((info.length - ROWS) / 2));
        for (let i = 0; i < Math.max(info.length, ROWS + pad); i++) {
          const a = i - pad >= 0 && i - pad < ROWS ? paint(art[i - pad]) : " ".repeat(COLS);
          out.push(`${a}   ${info[i] ?? ""}`);
        }
      }
      out.push("", `<span class="prompt">mark@yerevan</span> <span class="d">~</span> $ <span class="caret"></span>`);
      pre.innerHTML = `<span>${out.join("\n")}</span>`;
    }
    pre.addEventListener("click", (e) => { const sw = e.target.closest(".sw"); if (sw) setAccent(sw.dataset.accent); });
    pre.addEventListener("keydown", (e) => { const sw = e.target.closest(".sw"); if (sw && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setAccent(sw.dataset.accent); pre.querySelector(`[data-accent="${sw.dataset.accent}"]`)?.focus(); } });
    onTheme(render);
    onResize(pre, render);
    render();
  }

  // fig. e — a double pendulum
  function initPendulum() {
    const cv = $("#pendulum");
    const g = 9.81, L1 = 1, L2 = 1, M1 = 1, M2 = 1;
    let s = [2.05, 2.75, 0, 0], simT = 0;
    const trail = [];
    let ctx, W, Hh, drag = null;
    function deriv([t1, t2, w1, w2]) {
      const d = t1 - t2, den = 2 * M1 + M2 - M2 * Math.cos(2 * d);
      const a1 = (-g * (2 * M1 + M2) * Math.sin(t1) - M2 * g * Math.sin(t1 - 2 * t2) - 2 * Math.sin(d) * M2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d))) / (L1 * den);
      const a2 = (2 * Math.sin(d) * (w1 * w1 * L1 * (M1 + M2) + g * (M1 + M2) * Math.cos(t1) + w2 * w2 * L2 * M2 * Math.cos(d))) / (L2 * den);
      return [w1, w2, a1, a2];
    }
    function rk(dt) {
      const k1 = deriv(s), k2 = deriv(s.map((v, i) => v + (dt / 2) * k1[i]));
      const k3 = deriv(s.map((v, i) => v + (dt / 2) * k2[i])), k4 = deriv(s.map((v, i) => v + dt * k3[i]));
      s = s.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    }
    const geom = () => {
      const len = Math.min(W, Hh) * 0.215, ox = W / 2, oy = Hh * 0.44;
      const x1 = ox + Math.sin(s[0]) * len, y1 = oy + Math.cos(s[0]) * len;
      return { len, ox, oy, x1, y1, x2: x1 + Math.sin(s[1]) * len, y2: y1 + Math.cos(s[1]) * len };
    };
    function draw() {
      ctx.clearRect(0, 0, W, Hh);
      const G = geom(), font = FONT;
      // protractor
      ctx.strokeStyle = P.line2; ctx.lineWidth = 0.7; ctx.setLineDash([1, 4]);
      ctx.beginPath(); ctx.arc(G.ox, G.oy, G.len * 2, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(G.ox, G.oy, G.len, 0, 7); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      for (let a = 0; a < 360; a += 15) {
        const r = (a * Math.PI) / 180, l = a % 90 ? 4 : 8;
        ctx.moveTo(G.ox + Math.sin(r) * G.len * 2, G.oy + Math.cos(r) * G.len * 2);
        ctx.lineTo(G.ox + Math.sin(r) * (G.len * 2 + l), G.oy + Math.cos(r) * (G.len * 2 + l));
      }
      ctx.stroke();
      // trail
      ctx.lineCap = "round"; ctx.lineWidth = 1.3; ctx.strokeStyle = P.accent;
      for (let i = 1; i < trail.length; i++) {
        ctx.globalAlpha = (i / trail.length) ** 1.4 * 0.85;
        ctx.beginPath(); ctx.moveTo(trail[i - 1][0], trail[i - 1][1]); ctx.lineTo(trail[i][0], trail[i][1]); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // the mount, drawn like an engineering sketch
      ctx.strokeStyle = P.fg2; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(G.ox - 16, G.oy - 5); ctx.lineTo(G.ox + 16, G.oy - 5); ctx.stroke();
      ctx.lineWidth = 0.8; ctx.beginPath();
      for (let x = -14; x <= 14; x += 5) { ctx.moveTo(G.ox + x, G.oy - 5); ctx.lineTo(G.ox + x + 5, G.oy - 11); }
      ctx.stroke();
      // θ₁ arc
      ctx.strokeStyle = P.faint; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(G.ox, G.oy); ctx.lineTo(G.ox, G.oy + G.len * 0.55); ctx.stroke();
      const th = Math.atan2(Math.sin(s[0]), Math.cos(s[0]));
      ctx.beginPath(); ctx.arc(G.ox, G.oy, G.len * 0.38, Math.PI / 2, Math.PI / 2 - th, th > 0); ctx.stroke();
      ctx.fillStyle = P.muted; ctx.font = `italic 10px ${font}`;
      ctx.fillText("θ₁", G.ox + Math.sin(th / 2) * G.len * 0.52 - 5, G.oy + Math.cos(th / 2) * G.len * 0.52 + 4);
      // rods and bobs
      ctx.strokeStyle = P.fg2; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(G.ox, G.oy); ctx.lineTo(G.x1, G.y1); ctx.lineTo(G.x2, G.y2); ctx.stroke();
      ctx.fillStyle = P.bg; ctx.beginPath(); ctx.arc(G.ox, G.oy, 3, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(G.x1, G.y1, 7, 0, 7); ctx.fillStyle = P.bg; ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.arc(G.x2, G.y2, 8, 0, 7); ctx.fillStyle = P.accent; ctx.fill();
      ctx.fillStyle = P.faint; ctx.font = `10px ${font}`;
      ctx.fillText(drag ? "let go…" : `t = ${simT.toFixed(1)} s`, 12, Hh - 12);
    }
    let simAcc = 0;
    function frame(t, dt) {
      if (!drag) {
        simAcc += dt * 1.05; // about real time
        for (let k = 0; k < 24 && simAcc >= 0.0035; k++) { rk(0.0035); simAcc -= 0.0035; simT += 0.0035; }
        const G = geom();
        trail.push([G.x2, G.y2]);
        if (trail.length > 520) trail.shift();
      }
      draw();
    }
    cv.addEventListener("pointerdown", (e) => {
      const rc = cv.getBoundingClientRect(), mx = e.clientX - rc.left, my = e.clientY - rc.top, G = geom();
      const d1 = Math.hypot(mx - G.x1, my - G.y1), d2 = Math.hypot(mx - G.x2, my - G.y2);
      if (Math.min(d1, d2) > 30) return;
      drag = d2 < d1 ? 2 : 1;
      cv.setPointerCapture(e.pointerId);
      trail.length = 0;
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const rc = cv.getBoundingClientRect(), mx = e.clientX - rc.left, my = e.clientY - rc.top, G = geom();
      if (drag === 1) s[0] = Math.atan2(mx - G.ox, my - G.oy);
      else s[1] = Math.atan2(mx - G.x1, my - G.y1);
      s[2] = s[3] = 0;
      if (still) draw();
    });
    const up = () => { if (drag) { drag = null; simT = 0; } };
    cv.addEventListener("pointerup", up);
    cv.addEventListener("pointercancel", up);
    onResize(cv, () => { ({ ctx, w: W, h: Hh } = fit(cv)); trail.length = 0; draw(); });
    onTheme(() => ctx && draw());
    loop(cv, frame);
  }

  // ═════════════════════════════════════════════════════════════════════
  // end matter
  // ═════════════════════════════════════════════════════════════════════
  function initQuote() {
    const [q, a] = C.ofTheDay(C.QUOTES), [eq, name] = C.ofTheDay(C.EQUATIONS, 3);
    $("#quote p").textContent = `“${q}”`;
    $("#quote footer").textContent = `— ${a}`;
    $("#eq").textContent = eq;
    $("#eq-name").textContent = name;
  }

  // fig. 6 — ararat from yerevan, by epicycles
  function initArarat() {
    const cv = $("#ararat"), slider = $("#k-circles"), out = slider.nextElementSibling, note = $("#ararat-note");
    // the skyline from yerevan: sis on the left, the saddle, masis on the right (x ∈ 0..100, height up)
    // both are volcanoes, so the flanks are concave: steep under the summit, flattening into the plain
    const SKY = [[0, 1.2], [5, 2.6], [9, 4.6], [12.5, 7.4], [15.5, 11], [18, 15.4], [20, 20], [21.3, 23.4], [22.2, 25],
      [23.2, 24.2], [24.6, 21.4], [26.6, 18.6], [29.5, 16.6], [33, 15.4], [37, 14.9], [40.5, 15.5], [44, 17.2],
      [48, 20.2], [52, 24.2], [55.5, 28.4], [58.5, 32.4], [61, 35.6], [63.2, 37.9], [65.2, 39.2], [67.2, 39.7],
      [69, 39.4], [70.8, 38.4], [73, 36], [75.6, 32.2], [78.5, 28], [81.5, 24], [84.5, 20.4], [87.5, 17.2],
      [90.5, 14.2], [93.5, 11.2], [96.5, 8], [100, 4.6]];
    const ridge = spline(SKY, 6).map(([x, h]) => [x, -h]);
    const ground = [];
    for (let x = 100; x > 0; x -= 2) ground.push([x, 0]);
    const N = 360;
    const pts = resample([...ridge, ...ground], N);
    const cx = pts.reduce((a, p) => a + p[0], 0) / N, cy = pts.reduce((a, p) => a + p[1], 0) / N;
    const centred = pts.map(([x, y]) => [x - cx, y - cy]);
    const terms = dft(centred);
    let K = +slider.value, approx = [], trace = [], phase = 0, ctx, W, Hh, sc = 1, ox = 0, oy = 0, rot = 0;
    const ARM = '"Noto Serif Armenian", Mshtakan, Sylfaen, serif';
    document.fonts?.load(`500 20px "Noto Serif Armenian"`).then(() => ctx && draw(), () => {});
    // a small armenian eternity sign in ink: eight curved blades, each bounded by two half-circles and the rim
    function eternity(x0, y0, R, turn) {
      const n = 8, step = (2 * Math.PI) / n;
      ctx.fillStyle = P.fg; ctx.strokeStyle = P.bg; ctx.lineWidth = Math.max(0.6, R * 0.09); ctx.lineJoin = "round";
      for (let k = 0; k < n; k++) {
        const a = turn + k * step, b = a + step;
        ctx.beginPath();
        ctx.arc(x0 + (Math.cos(a) * R) / 2, y0 + (Math.sin(a) * R) / 2, R / 2, a + Math.PI, a + 2 * Math.PI);
        ctx.arc(x0, y0, R, a, b);
        ctx.arc(x0 + (Math.cos(b) * R) / 2, y0 + (Math.sin(b) * R) / 2, R / 2, b + 2 * Math.PI, b + Math.PI, true);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    function evalAt(t, k) {
      let x = 0, y = 0;
      for (let i = 0; i < k; i++) { const c = terms[i], a = c.freq * t + c.phase; x += c.amp * Math.cos(a); y += c.amp * Math.sin(a); }
      return [x, y];
    }
    function rebuild() {
      approx = [];
      for (let i = 0; i <= N; i++) approx.push(evalAt((2 * Math.PI * i) / N, K));
      trace = []; phase = 0;
      out.textContent = K;
      note.textContent = K < 3 ? "a circle" : K < 8 ? "a pebble" : K < 18 ? "a hill" : K < 34 ? "two hills" : K < 90 ? "masis & sis" : "masis & sis, to the last ridge";
    }
    const toS = ([x, y]) => [ox + x * sc, oy + y * sc];
    function layout() {
      ({ ctx, w: W, h: Hh } = fit(cv));
      sc = Math.min((W * 0.66) / 100, (Hh * 0.7) / 40);
      oy = Hh * 0.86 + cy * sc;
      ox = W * 0.56 - (50 - cx) * sc;
    }
    function draw() {
      ctx.clearRect(0, 0, W, Hh);
      const font = FONT;
      const base = oy + (0 - cy) * sc;
      ctx.strokeStyle = P.line2; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(26, base + 0.5); ctx.lineTo(W - 26, base + 0.5); ctx.stroke();
      const er = W > 560 ? 7 : 5;
      eternity(20, base + 0.5, er, rot); eternity(W - 20, base + 0.5, er, -rot);
      ctx.setLineDash([2, 4]); ctx.strokeStyle = P.faint;
      ctx.beginPath(); centred.forEach((p, i) => { const [x, y] = toS(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = rgba(P.fg2, 0.22); ctx.lineWidth = 1;
      ctx.beginPath(); approx.forEach((p, i) => { const [x, y] = toS(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      // circles
      let x = 0, y = 0;
      for (let i = 0; i < K; i++) {
        const c = terms[i], a = c.freq * phase + c.phase;
        const [sx, sy] = toS([x, y]);
        if (c.amp * sc > 0.6) {
          ctx.strokeStyle = rgba(P.muted, i < 6 ? 0.42 : 0.24); ctx.lineWidth = 0.7;
          ctx.beginPath(); ctx.arc(sx, sy, c.amp * sc, 0, 7); ctx.stroke();
        }
        x += c.amp * Math.cos(a); y += c.amp * Math.sin(a);
        const [ex, ey] = toS([x, y]);
        ctx.strokeStyle = rgba(P.fg2, 0.7);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      }
      // trace
      ctx.strokeStyle = P.fg; ctx.lineWidth = 1.7; ctx.lineJoin = "round";
      ctx.beginPath(); trace.forEach((p, i) => { const [px, py] = toS(p); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke();
      const [tx, ty] = toS([x, y]);
      ctx.fillStyle = P.accent; ctx.beginPath(); ctx.arc(tx, ty, 3.4, 0, 7); ctx.fill();
      // peaks
      if (K >= 24) {
        ctx.globalAlpha = clamp((K - 24) / 12, 0, 1);
        ctx.font = `italic ${W > 560 ? 11 : 9.5}px ${font}`; ctx.fillStyle = P.muted; ctx.strokeStyle = P.faint; ctx.lineWidth = 0.7;
        for (const [px, h, txt, arm, side] of [[67.2, 39.7, "masis · 5137 m", "Մասիս", 1], [22.2, 25, "sis · 3896 m", "Սիս", -1]]) {
          const [sx, sy] = toS([px - cx, -h - cy]);
          ctx.beginPath(); ctx.moveTo(sx, sy - 8); ctx.lineTo(sx + side * 18, sy - 30); ctx.lineTo(sx + side * 26, sy - 30); ctx.stroke();
          ctx.textAlign = side > 0 ? "left" : "right";
          ctx.font = `italic ${W > 560 ? 11 : 9.5}px ${font}`;
          ctx.fillText(txt, sx + side * 30, sy - 26);
          ctx.font = `500 ${W > 560 ? 13 : 11}px ${ARM}`;
          ctx.fillText(arm, sx + side * 30, sy - 11);
        }
        ctx.globalAlpha = 1; ctx.textAlign = "left";
      }
      ctx.fillStyle = P.faint; ctx.font = `10px ${font}`;
      if (W > 560) {
        ctx.fillText(`k = ${K} of ${N} terms`, 30, 34);
        ctx.fillText("x(t) + i·y(t) = Σ cₙ e^(i n t)", 30, 50);
      }
    }
    function frame(t, dt) {
      rot += dt * 0.14; // the signs turn once every 45 seconds
      phase += ((2 * Math.PI) / 9) * dt; // one lap every nine seconds
      trace.push(evalAt(phase, K));
      if (phase >= 2 * Math.PI) { phase -= 2 * Math.PI; trace = [trace[trace.length - 1]]; }
      draw();
    }
    slider.addEventListener("input", () => { K = +slider.value; rebuild(); if (still) { trace = approx.slice(); draw(); } });
    onResize(cv, () => { layout(); if (still) { trace = approx.slice(); } draw(); });
    onTheme(() => ctx && draw());
    rebuild();
    loop(cv, frame);
  }

  // ── go ────────────────────────────────────────────────────────────────
  const run = (inits) => {
    for (const [name, fn] of Object.entries(inits)) {
      try { fn(); } catch (err) { console.error(name, err); }
    }
  };
  run({ initType, initGolden, initLorenz, initGalton, initBifurcation, initNewsLogo, initNewsCal, initJumpwise,
    initAnomaly, initTopo, initPendulum, initArarat });
  CV.ready.then((data) => {
    C = data; FAM = C.FAMILIES; FAM_KEYS = Object.keys(FAM);
    run({ initScore, initJobs, initAtlas, initSkillLists, initPhilosophy, initWaves, initFetch, initQuote });
  });
})();
