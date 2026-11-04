/* Small shared toolkit for index.html and print.html: dom helpers, palette, maths, a render loop. */

window.L = (() => {
  const root = document.documentElement;
  const NS = "http://www.w3.org/2000/svg";
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── dom ───────────────────────────────────────────────────────────────
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];

  function S(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null && attrs[k] !== false) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function H(tag, attrs = {}, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "html") e.innerHTML = v;
      else if (k === "text") e.textContent = v;
      else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else e.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) e.append(kid);
    return e;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ── palette ───────────────────────────────────────────────────────────
  const TOKENS = ["bg", "bg-soft", "line", "line2", "fg", "fg2", "muted", "faint", "red", "green", "yellow",
    "blue", "purple", "aqua", "orange", "accent", "ink-a", "ink-b"];
  function palette() {
    const cs = getComputedStyle(root);
    const p = { dark: root.dataset.theme === "dark" };
    for (const t of TOKENS) p[t.replace(/-(\w)/g, (_, c) => c.toUpperCase())] = cs.getPropertyValue("--" + t).trim();
    return p;
  }
  function rgb(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => `rgba(${rgb(hex).join(",")},${a})`;
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
  }
  /** colour along blue → aqua → yellow, the profile's "flow" gradient */
  function flow(P, t) {
    return t < 0.5 ? mix(P.blue, P.aqua, t * 2) : mix(P.aqua, P.yellow, (t - 0.5) * 2);
  }
  const onTheme = (cb) => document.addEventListener("themechange", cb);

  // ── canvas ────────────────────────────────────────────────────────────
  function fit(canvas, maxDpr = 2) {
    const r = canvas.getBoundingClientRect();
    const d = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return { ctx, w: r.width, h: r.height, dpr: d };
  }

  // ── render loop: one rAF for every figure, each paused while offscreen ─
  // Figures get the real time since their last frame (dt, in seconds) and advance by it, so they
  // keep their speed when the browser lowers the frame rate (idle, battery saver, a busy page).
  const items = new Set();
  let raf = 0;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) for (const it of items) if (it.el === e.target) {
      if (e.isIntersecting && !it.visible) it.last = 0;
      it.visible = e.isIntersecting;
    }
    kick();
  }, { rootMargin: "120px" });
  function tick(t) {
    raf = 0;
    let any = false;
    for (const it of items) if (it.visible && it.running) {
      const dt = it.last ? Math.min(0.05, Math.max(0, (t - it.last) / 1000)) : 1 / 60;
      it.last = t;
      it.fn(t, dt);
      any = true;
    }
    if (any) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  /** run fn(t, dt) every frame while el is near the viewport. returns {start, stop, once} */
  function loop(el, fn, { autostart = !still } = {}) {
    const it = { el, fn, visible: false, running: autostart, last: 0 };
    items.add(it);
    io.observe(el);
    return {
      start() { it.running = true; it.last = 0; kick(); },
      stop() { it.running = false; },
      get running() { return it.running; },
      once() { requestAnimationFrame(fn); },
    };
  }
  /** call cb the first time el scrolls into view */
  function onceVisible(el, cb, threshold = 0.25) {
    const o = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) { o.disconnect(); cb(); }
    }, { threshold });
    o.observe(el);
  }
  function onResize(el, cb) {
    let w = 0;
    new ResizeObserver(([e]) => {
      const nw = Math.round(e.contentRect.width);
      if (nw !== w) { w = nw; cb(); }
    }).observe(el);
  }

  // ── maths ─────────────────────────────────────────────────────────────
  function rng(seed = 1) { // mulberry32
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /** smooth 1-d value noise in [-1, 1] */
  function noise1(seed = 1) {
    const r = rng(seed), g = Array.from({ length: 256 }, () => r() * 2 - 1);
    return (x) => {
      const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
      return lerp(g[i & 255], g[(i + 1) & 255], u);
    };
  }

  /** one RK4 step of the lorenz system on s = [x, y, z], in place */
  function lorenzStep(s, dt, sg, rh, bt) {
    const f = (x, y, z) => [sg * (y - x), x * (rh - z) - y, x * y - bt * z];
    const [x, y, z] = s;
    const k1 = f(x, y, z);
    const k2 = f(x + dt / 2 * k1[0], y + dt / 2 * k1[1], z + dt / 2 * k1[2]);
    const k3 = f(x + dt / 2 * k2[0], y + dt / 2 * k2[1], z + dt / 2 * k2[2]);
    const k4 = f(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2]);
    s[0] += dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    s[1] += dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    s[2] += dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
  }
  /** a trajectory as a flat Float32Array [x0, y0, z0, x1, ...] with the transient dropped */
  function lorenz({ sigma = 10, rho = 28, beta = 8 / 3, n = 14000, dt = 0.005, skip = 800, start = [0.1, 0, 0] } = {}) {
    const s = Float64Array.from(start), out = new Float32Array(n * 3);
    for (let i = 0; i < n + skip; i++) {
      lorenzStep(s, dt, sigma, rho, beta);
      if (i >= skip) out.set(s, (i - skip) * 3);
    }
    return out;
  }

  /** Ramer–Douglas–Peucker on [[x, y], ...] */
  function simplify(pts, tol) {
    const keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [a, b] = stack.pop();
      const [ax, ay] = pts[a], [bx, by] = pts[b];
      const dx = bx - ax, dy = by - ay, nrm = Math.hypot(dx, dy) || 1e-9;
      let idx = a, dmax = 0;
      for (let i = a + 1; i < b; i++) {
        const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / nrm;
        if (d > dmax) { idx = i; dmax = d; }
      }
      if (dmax > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    return pts.filter((_, i) => keep[i]);
  }

  /** centripetal-ish catmull-rom through pts (open), `per` samples per segment */
  function spline(pts, per = 8) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((k) => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  /** resample a closed polyline to n points evenly spaced by arc length */
  function resample(pts, n) {
    const closed = [...pts, pts[0]];
    const seg = [];
    let total = 0;
    for (let i = 0; i < closed.length - 1; i++) {
      const d = Math.hypot(closed[i + 1][0] - closed[i][0], closed[i + 1][1] - closed[i][1]);
      seg.push(d); total += d;
    }
    const out = [];
    let i = 0, acc = 0;
    for (let k = 0; k < n; k++) {
      const target = (k / n) * total;
      while (acc + seg[i] < target && i < seg.length - 1) { acc += seg[i]; i++; }
      const t = seg[i] ? (target - acc) / seg[i] : 0;
      out.push([lerp(closed[i][0], closed[i + 1][0], t), lerp(closed[i][1], closed[i + 1][1], t)]);
    }
    return out;
  }
  /** discrete fourier transform of complex points [re, im]; terms sorted by amplitude */
  function dft(pts) {
    const N = pts.length, out = [];
    for (let k = 0; k < N; k++) {
      let re = 0, im = 0;
      for (let n = 0; n < N; n++) {
        const phi = (2 * Math.PI * k * n) / N, c = Math.cos(phi), s = Math.sin(phi);
        re += pts[n][0] * c + pts[n][1] * s;
        im += pts[n][1] * c - pts[n][0] * s;
      }
      re /= N; im /= N;
      out.push({ freq: k > N / 2 ? k - N : k, amp: Math.hypot(re, im), phase: Math.atan2(im, re) });
    }
    return out.sort((a, b) => b.amp - a.amp);
  }

  /** marching squares: segments of the iso-line `level` over grid g[j][i] */
  function contours(g, level, cell = 1) {
    const segs = [];
    const rows = g.length - 1, cols = g[0].length - 1;
    const interp = (a, b, va, vb) => a + ((level - va) / (vb - va || 1e-9)) * (b - a);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const a = g[j][i], b = g[j][i + 1], c = g[j + 1][i + 1], d = g[j + 1][i];
      const idx = (a > level) | ((b > level) << 1) | ((c > level) << 2) | ((d > level) << 3);
      if (idx === 0 || idx === 15) continue;
      const x = i * cell, y = j * cell;
      const T = [interp(x, x + cell, a, b), y], R = [x + cell, interp(y, y + cell, b, c)];
      const B = [interp(x, x + cell, d, c), y + cell], Lf = [x, interp(y, y + cell, a, d)];
      const lut = { 1: [[Lf, T]], 2: [[T, R]], 3: [[Lf, R]], 4: [[R, B]], 5: [[Lf, T], [R, B]], 6: [[T, B]], 7: [[Lf, B]],
        8: [[B, Lf]], 9: [[B, T]], 10: [[T, R], [B, Lf]], 11: [[B, R]], 12: [[R, Lf]], 13: [[R, T]], 14: [[T, Lf]] };
      for (const s of lut[idx]) segs.push(s);
    }
    return segs;
  }

  /** points in [0,1]² → braille text, cols × rows characters */
  function braille(points, cols, rows) {
    const W = cols * 2, Hh = rows * 4;
    const grid = new Uint8Array(W * Hh);
    for (const [x, y] of points) {
      const i = Math.floor(x * (W - 1e-6)), j = Math.floor(y * (Hh - 1e-6));
      if (i >= 0 && i < W && j >= 0 && j < Hh) grid[j * W + i] = 1;
    }
    const bit = [[0x1, 0x8], [0x2, 0x10], [0x4, 0x20], [0x40, 0x80]];
    const lines = [];
    for (let r = 0; r < rows; r++) {
      let s = "";
      for (let c = 0; c < cols; c++) {
        let code = 0;
        for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 2; dx++) if (grid[(r * 4 + dy) * W + c * 2 + dx]) code |= bit[dy][dx];
        s += String.fromCharCode(0x2800 + code);
      }
      lines.push(s);
    }
    return lines;
  }

  // ── formatting ────────────────────────────────────────────────────────
  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const sup = (n) => String(n).replace(/[-0-9]/g, (c) => SUP[c]);
  /** 3.2e-6 → "3.2·10⁻⁶" */
  function sci(v, digits = 1) {
    if (!isFinite(v) || v === 0) return "0";
    const e = Math.floor(Math.log10(Math.abs(v)));
    if (e >= -1 && e <= 2) return v.toFixed(digits + 1);
    return `${(v / 10 ** e).toFixed(digits)}·10${sup(e)}`;
  }
  const ym = (s) => (s ? s.replace("-", ".") : "now");
  function tenure(a, b) {
    const months = Math.max(1, Math.round((b - a) * 12));
    const y = Math.floor(months / 12), m = months % 12;
    return [y && `${y} yr${y > 1 ? "s" : ""}`, m && `${m} mo${m > 1 ? "s" : ""}`].filter(Boolean).join(" ");
  }
  function nowYears(d = new Date()) {
    return d.getFullYear() + d.getMonth() / 12 + (d.getDate() - 1) / 365;
  }

  return {
    root, still, $, $$, S, H, esc, palette, rgb, rgba, mix, flow, onTheme, fit, loop, onceVisible, onResize,
    rng, clamp, lerp, ease, noise1, lorenz, lorenzStep, simplify, spline, resample, dft, contours, braille,
    sup, sci, ym, tenure, nowYears,
  };
})();
