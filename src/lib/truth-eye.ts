/**
 * mountTruthEye — the animated "عين الحقيقة" emblem.
 *
 * A self-contained canvas + SVG emblem: an eye that wakes up, blinks on random
 * intervals, follows the pointer (and does quick saccades on its own when the
 * pointer is idle), with a detailed iris, glowing rays, orbiting rings and gold
 * motes that spiral into the eye on every pulse.
 *
 * It has no dependencies and reads its colours from the site's own theme
 * variables (--gold, --gold-soft, --purple, --card, --background), so it
 * re-themes itself with every one of the seven themes.
 *
 * Returns a cleanup function — call it on unmount.
 */
export function mountTruthEye(el: HTMLElement): () => void {
  const id = "te" + Math.random().toString(36).slice(2, 8);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const R = Math.random;
  const P = Math.PI;
  const f = (n: number) => n.toFixed(2);
  const pt = (r: number, a: number): [number, number] => [100 + r * Math.cos(a), 100 + r * Math.sin(a)];
  const ease = (t: number) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  const DR = reduce ? "" : "dr";
  const FI = reduce ? "" : "fi";

  // ── iris: fibres + crypts + wavy collarette ───────────────────────────────
  let fib = "";
  let crypts = "";
  let col = "";
  for (let i = 0; i < 150; i++) {
    const a = (i / 150) * 2 * P + (R() - 0.5) * 0.05;
    const [x1, y1] = pt(9.5 + R() * 3, a);
    const [x2, y2] = pt(18 + R() * 5.5, a + (R() - 0.5) * 0.08);
    const c = ["--gold-soft", "--gold", "--purple"][i % 3];
    fib += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" style="stroke:var(${c})" stroke-width="${f(
      0.25 + R() * 0.5,
    )}" opacity="${f(0.35 + R() * 0.5)}"/>`;
  }
  for (let i = 0; i < 14; i++) {
    const a = R() * 2 * P;
    const [x, y] = pt(14 + R() * 7, a);
    crypts += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(0.6 + R())}" ry="${f(
      1.2 + R() * 1.4,
    )}" transform="rotate(${f((a * 180) / P - 90)} ${f(x)} ${f(y)})" fill="#000" opacity="${f(0.18 + R() * 0.2)}"/>`;
  }
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * P;
    const [x, y] = pt(12.5 + Math.sin(a * 7) * 1.1 + (R() - 0.5) * 0.8, a);
    col += (i ? "L" : "M") + f(x) + " " + f(y);
  }

  // ── frame: tick marks, gems, stars, rays ──────────────────────────────────
  let ticks = "";
  let gems = "";
  let star = "";
  let glyph = "";
  let rays = "";
  for (let i = 0; i < 72; i++) {
    const big = i % 6 === 0;
    const a = (i / 72) * 2 * P;
    const [x1, y1] = pt(big ? 83 : 85.5, a);
    const [x2, y2] = pt(88, a);
    ticks += `<line class="l" x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke-width="${big ? 1.2 : 0.5}"/>`;
  }
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * 2 * P;
    const [x, y] = pt(79, a);
    gems +=
      i % 2 === 0
        ? `<path class="l s" stroke-width=".7" d="M${f(x)} ${f(y - 2.6)}L${f(x + 1.6)} ${f(y)}L${f(
            x,
          )} ${f(y + 2.6)}L${f(x - 1.6)} ${f(y)}Z" transform="rotate(${f((a * 180) / P + 90)} ${f(x)} ${f(
            y,
          )})"/>`
        : `<circle cx="${f(x)}" cy="${f(y)}" r=".8" style="fill:var(--gold)"/>`;
  }
  for (let i = 0; i <= 16; i++) {
    const [x, y] = pt(66, (((i * 5) % 16) / 16) * 2 * P - P / 2);
    star += (i ? "L" : "M") + f(x) + " " + f(y);
  }
  for (let i = 0; i < 16; i++) {
    const [x, y] = pt(i % 2 ? 1.6 : 3.8, (i / 16) * 2 * P - P / 2);
    glyph += (i ? "L" : "M") + f(x) + " " + f(y);
  }
  for (let i = 0; i < 24; i++) {
    const w = i % 2 ? 2.2 : 4.5;
    const len = i % 2 ? 72 : 96;
    rays += `<polygon points="100,100 ${100 - w},${100 - len} ${100 + w},${100 - len}" transform="rotate(${i * 15} 100 100)"/>`;
  }
  const sq = (o: number) =>
    [0, 1, 2, 3]
      .map((k) => pt(74, o + (k * P) / 2))
      .map(([x, y], k) => (k ? "L" : "M") + f(x) + " " + f(y))
      .join("") + "Z";

  el.classList.add(id);
  el.innerHTML = `<style>
.${id}{position:relative;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none}
.${id}>canvas,.${id}>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.${id} .l{fill:none;stroke:var(--gold,#d4b05e);stroke-linecap:round;stroke-linejoin:round}
.${id} .s{stroke:var(--gold-soft,#f0d98a)}
.${id} .dr{stroke-dasharray:100;stroke-dashoffset:100;animation:${id}d 1.8s cubic-bezier(.65,0,.35,1) forwards}
@keyframes ${id}d{to{stroke-dashoffset:0}}
.${id} .fi{opacity:0;animation:${id}f 1.2s ease forwards}
@keyframes ${id}f{to{opacity:1}}
</style>
<canvas></canvas>
<svg viewBox="0 0 200 200">
<defs>
 <radialGradient id="${id}h"><stop offset="0" style="stop-color:var(--gold);stop-opacity:.35"/><stop offset=".6" style="stop-color:var(--purple);stop-opacity:.12"/><stop offset="1" style="stop-color:var(--gold);stop-opacity:0"/></radialGradient>
 <radialGradient id="${id}r" gradientUnits="userSpaceOnUse" cx="100" cy="100" r="96"><stop offset=".2" style="stop-color:var(--gold-soft);stop-opacity:.7"/><stop offset="1" style="stop-color:var(--gold);stop-opacity:0"/></radialGradient>
 <radialGradient id="${id}i"><stop offset=".3" style="stop-color:var(--gold-soft)"/><stop offset=".62" style="stop-color:var(--gold)"/><stop offset=".88" style="stop-color:var(--purple)"/><stop offset="1" stop-color="#050408"/></radialGradient>
 <radialGradient id="${id}s" cx="50%" cy="45%" r="60%"><stop offset="0" style="stop-color:var(--card)"/><stop offset="1" style="stop-color:var(--background)"/></radialGradient>
 <linearGradient id="${id}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset=".45" stop-color="#000" stop-opacity="0"/></linearGradient>
 <filter id="${id}g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
 <clipPath id="${id}c"><path class="eyeP"/></clipPath>
</defs>
<circle class="halo" cx="100" cy="100" r="99" fill="url(#${id}h)"/>
<g class="rays" fill="url(#${id}r)" opacity="0">${rays}</g>
<g filter="url(#${id}g)">
 <circle class="l ${DR}" cx="100" cy="100" r="91" pathLength="100" stroke-width="1.3"/>
 <circle class="l ${FI}" cx="100" cy="100" r="88.5" stroke-width=".4" opacity=".6"/>
 <g class="rA ${FI}" style="animation-delay:.8s"><circle class="l s" cx="100" cy="100" r="95" stroke-width=".6" stroke-dasharray=".5 3.2"/></g>
 <g class="rB ${FI}" style="animation-delay:1s">${ticks}</g>
 <g class="rC ${FI}" style="animation-delay:1.2s">${gems}</g>
 <g class="rD"><path class="l ${DR}" style="animation-delay:.3s" pathLength="100" stroke-width=".9" opacity=".6" d="${sq(
   0,
 )}"/><path class="l ${DR}" style="animation-delay:.5s" pathLength="100" stroke-width=".9" opacity=".6" d="${sq(P / 4)}"/></g>
 <g class="rE ${FI}" style="animation-delay:1.4s"><path class="l s" stroke-width=".5" opacity=".4" d="${star}"/><circle class="l" cx="100" cy="100" r="58" stroke-width=".6" stroke-dasharray="1 2.5" opacity=".7"/></g>
 <g class="motes"><circle r="1.6" style="fill:var(--gold-soft)"/><circle r="1.2" style="fill:var(--gold-soft)"/><circle r="1.9" style="fill:var(--gold-soft)"/></g>
 <path class="l ${DR}" style="animation-delay:2s" pathLength="100" stroke-width="1.1" d="M162 100Q175 99 186 88"/>
 <path class="l ${DR}" style="animation-delay:2s" pathLength="100" stroke-width="1.1" d="M38 100Q25 99 14 88"/>
</g>
<path class="eyeP" fill="url(#${id}s)"/>
<g clip-path="url(#${id}c)">
 <g class="iris">
  <circle cx="100" cy="100" r="24.5" fill="url(#${id}i)"/>
  <g class="fib">${fib}${crypts}</g>
  <path d="${col}Z" style="fill:none;stroke:var(--gold-soft)" stroke-width=".7" opacity=".8"/>
  <circle cx="100" cy="100" r="24.5" fill="none" stroke="#050408" stroke-width="1.8" opacity=".75"/>
  <circle class="pupil" cx="100" cy="100" r="8" fill="#050408"/>
  <circle class="pring" cx="100" cy="100" r="8.8" style="fill:none;stroke:var(--gold-soft)" stroke-width=".5" opacity=".6"/>
  <path class="glyph" d="${glyph}Z" style="fill:none;stroke:var(--gold-soft)" stroke-width=".45"/>
 </g>
 <g class="shine"><ellipse cx="91" cy="90" rx="4.2" ry="3.2" fill="#fff" opacity=".85"/><circle cx="109" cy="107" r="1.4" fill="#fff" opacity=".5"/></g>
 <path class="eyeP" fill="url(#${id}sh)"/>
</g>
<g filter="url(#${id}g)">
 <path class="crease l" stroke-width=".8"/>
 <path class="up l" stroke-width="2"/>
 <path class="lo l" stroke-width="1.1"/>
 <g>${'<line class="lash l"/>'.repeat(20)}</g>
</g>
</svg>`;

  const q = (s: string) => el.querySelector(s) as SVGElement & { style: CSSStyleDeclaration };
  const qa = (s: string) => Array.from(el.querySelectorAll(s)) as SVGElement[];
  const cv = el.querySelector("canvas") as HTMLCanvasElement;
  const ctx = cv.getContext("2d") as CanvasRenderingContext2D;
  const eyePs = qa(".eyeP");
  const up = q(".up");
  const lo = q(".lo");
  const crease = q(".crease");
  const iris = q(".iris");
  const fibG = q(".fib");
  const pupil = q(".pupil");
  const pring = q(".pring");
  const glyphEl = q(".glyph");
  const shine = q(".shine");
  const raysEl = q(".rays");
  const halo = q(".halo");
  const motes = qa(".motes circle");
  const lashes = qa(".lash");
  lashes.forEach((l, i) => l.setAttribute("stroke-width", i < 13 ? ".9" : ".6"));
  const spin: Array<[SVGElement, number]> = [
    [q(".rA"), -2],
    [q(".rB"), 4],
    [q(".rC"), -3],
    [q(".rD"), 1.2],
    [q(".rE"), -1.8],
  ];

  // ── theme colours ─────────────────────────────────────────────────────────
  // The site defines --gold & co. as hex; guard against a bare HSL triplet
  // ("212 40% 8%") so a canvas fill is never silently dropped.
  let gold = "#d4b05e";
  let soft = "#f0d98a";
  const asColor = (v: string, fallback: string) => {
    const s = (v || "").trim();
    if (!s) return fallback;
    return /^\d/.test(s) ? `hsl(${s})` : s;
  };
  const readColors = () => {
    const cs = getComputedStyle(el);
    gold = asColor(cs.getPropertyValue("--gold"), gold);
    soft = asColor(cs.getPropertyValue("--gold-soft"), soft);
  };
  readColors();
  const mo = new MutationObserver(readColors);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });

  // ── canvas sizing ─────────────────────────────────────────────────────────
  let W = 0;
  let H = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const resize = () => {
    const b = el.getBoundingClientRect();
    W = b.width;
    H = b.height;
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  type Mote = { a: number; r: number; v: number; w: number; sz: number; ph: number };
  const spawn = (p: Mote, init: boolean) =>
    Object.assign(p, {
      a: R() * 2 * P,
      r: init ? 0.3 + R() * 0.72 : 0.92 + R() * 0.1,
      v: 0.04 + R() * 0.08,
      w: (0.25 + R() * 0.5) * (R() < 0.5 ? -1 : 1),
      sz: 0.5 + R() * 1.4,
      ph: R() * 6.3,
    });
  const ps: Mote[] = Array.from({ length: 90 }, () => spawn({ a: 0, r: 0, v: 0, w: 0, sz: 0, ph: 0 }, true));
  const waves: Array<{ t: number }> = [];

  // ── state ─────────────────────────────────────────────────────────────────
  let gx = 0;
  let gy = 0;
  let tx = 0;
  let ty = 0;
  let lastMove = -1e9;
  let nextSacc = 0;
  let hover = false;
  let pr = 8;
  let flare = 0;
  let nextBlink = 5;
  let blinkT = -1;
  let dbl = false;
  let nextPulse = 3.3;
  const pulse = () => {
    if (reduce) return;
    flare = 1;
    waves.push({ t: 0 });
  };

  const onMove = (e: PointerEvent) => {
    const b = el.getBoundingClientRect();
    const dx = e.clientX - (b.left + b.width / 2);
    const dy = e.clientY - (b.top + b.height / 2);
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / (b.width * 0.6));
    tx = (dx / d) * k * 13;
    ty = (dy / d) * k * 5.5;
    lastMove = performance.now();
    hover = d < b.width * 0.35;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("click", pulse);

  const lidOpen = (s: number) => {
    if (reduce) return 1;
    if (s < 1.4) return 0;
    if (s < 2.1) return 0.4 * ease((s - 1.4) / 0.7);
    if (s < 2.45) return 0.4 - 0.28 * Math.sin((P * (s - 2.1)) / 0.35);
    if (s < 3.3) return 0.4 + 0.6 * ease((s - 2.45) / 0.85);
    if (blinkT >= 0) {
      const p = (s - blinkT) / 0.26;
      if (p < 0) return 1;
      if (p >= 1) {
        blinkT = -1;
        if (dbl) {
          dbl = false;
          blinkT = s + 0.08;
        }
        return 1;
      }
      return p < 0.4 ? 1 - p / 0.4 : ease((p - 0.4) / 0.6);
    }
    return 1;
  };

  const start = performance.now();
  let last = start;
  let raf = 0;

  const frame = (now: number) => {
    const s = reduce ? 10 : (now - start) / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const wake = reduce ? 1 : Math.min(1, s / 1.6);

    // gaze — follow the pointer, otherwise saccade on your own
    if (now - lastMove > 2500) {
      hover = false;
      if (s > nextSacc) {
        const c = R() < 0.3;
        tx = c ? 0 : (R() * 2 - 1) * 11;
        ty = c ? 0 : (R() * 2 - 1) * 4;
        nextSacc = s + 0.9 + R() * 2.2;
      }
    }
    const kk = Math.min(1, dt * 12);
    gx += (tx - gx) * kk;
    gy += (ty - gy) * kk;
    if (!reduce && s > nextBlink && blinkT < 0) {
      blinkT = s;
      dbl = R() < 0.25;
      nextBlink = s + 2.5 + R() * 4;
    }
    if (!reduce && s > nextPulse) {
      pulse();
      nextPulse = s + 7 + R() * 5;
    }
    flare *= Math.exp(-dt * 1.5);

    // eyelids
    const o = lidOpen(s);
    const U = 118 - 74 * o;
    const L = 118 + 36 * o;
    const eye = `M38 100Q100 ${f(U)} 162 100Q100 ${f(L)} 38 100Z`;
    for (const p of eyePs) p.setAttribute("d", eye);
    up.setAttribute("d", `M38 100Q100 ${f(U)} 162 100`);
    lo.setAttribute("d", `M38 100Q100 ${f(L)} 162 100`);
    crease.setAttribute("d", `M42 96Q100 ${f(92 - 64 * o)} 158 96`);
    crease.style.opacity = f(0.25 + 0.4 * o);
    lashes.forEach((ln, i) => {
      const upper = i < 13;
      const t = upper ? 0.12 + (i / 12) * 0.76 : 0.25 + ((i - 13) / 6) * 0.5;
      const Cv = upper ? U : L;
      const bx = (1 - t) ** 2 * 38 + 2 * (1 - t) * t * 100 + t * t * 162;
      const by = (1 - t) ** 2 * 100 + 2 * (1 - t) * t * Cv + t * t * 100;
      let dx = 124;
      let dy = 2 * (1 - t) * (Cv - 100) + 2 * t * (100 - Cv);
      const m = Math.hypot(dx, dy) || 1;
      dx /= m;
      dy /= m;
      const nx = upper ? dy : -dy;
      const ny = upper ? -dx : dx;
      const len = (upper ? 3 + 5.5 * Math.sin(P * t) : 1.5 + 1.5 * Math.sin(P * t)) * (0.55 + 0.45 * o);
      const sw = (t - 0.5) * 1.1;
      ln.setAttribute("x1", f(bx));
      ln.setAttribute("y1", f(by));
      ln.setAttribute("x2", f(bx + (nx + dx * sw) * len));
      ln.setAttribute("y2", f(by + (ny + dy * sw) * len));
    });

    // iris + pupil
    const jx = gx + Math.sin(s * 11) * 0.12;
    const jy = gy + Math.cos(s * 9) * 0.1;
    const sx = 1 - (Math.abs(jx) / 13) * 0.12;
    iris.setAttribute(
      "transform",
      `translate(${f(100 + jx)} ${f(100 + jy)}) scale(${f(sx)} 1) translate(-100 -100)`,
    );
    fibG.setAttribute("transform", `rotate(${f(s * 1.5)} 100 100)`);
    const pT = (hover ? 9.8 : 8) + Math.sin(s * 0.7) * 0.35 - 3.6 * flare;
    pr += (pT - pr) * Math.min(1, dt * 5);
    pupil.setAttribute("r", f(pr));
    pring.setAttribute("r", f(pr + 0.8));
    glyphEl.setAttribute(
      "transform",
      `translate(100 100) rotate(${f(-s * 20)}) scale(${f(pr / 8)}) translate(-100 -100)`,
    );
    glyphEl.style.opacity = f(0.3 + 0.15 * Math.sin(s * 2) + 0.6 * flare);
    shine.setAttribute("transform", `translate(${f(gx * 0.3)} ${f(gy * 0.3)})`);

    // frame
    raysEl.setAttribute("transform", `rotate(${f(s * 3)} 100 100)`);
    raysEl.style.opacity = f((0.3 + 0.15 * Math.sin(s * 1.3) + 0.6 * flare) * Math.min(1, s / 3));
    halo.style.opacity = f(Math.min(1, 0.7 + 0.2 * Math.sin(s * 0.9) + 0.3 * flare));
    for (const [n, v] of spin) n.setAttribute("transform", `rotate(${f(s * v)} 100 100)`);
    motes.forEach((m, i) => {
      const a = s * (0.35 + i * 0.17) * (i % 2 ? -1 : 1) + i * 2.1;
      const r = 70 + 4 * Math.sin(s + i);
      m.setAttribute("cx", f(100 + Math.cos(a) * r));
      m.setAttribute("cy", f(100 + Math.sin(a) * r));
      m.style.opacity = f(wake * (0.5 + 0.5 * Math.sin(s * 2 + i)));
    });

    // motes + light waves
    ctx.clearRect(0, 0, W, H);
    const ccx = W / 2;
    const ccy = H / 2;
    const RR = Math.min(W, H) / 2;
    for (const p of ps) {
      if (!reduce) {
        p.r -= p.v * dt * (1 + flare * 4);
        p.a += p.w * dt * (1.3 - p.r);
        if (p.r < 0.28) spawn(p, false);
      }
      const a =
        Math.max(0, Math.min(1, (1.05 - p.r) * 5)) *
        Math.max(0, Math.min(1, (p.r - 0.28) * 6)) *
        (0.45 + 0.55 * Math.sin(s * 2.2 + p.ph) ** 2) *
        wake;
      const x = ccx + Math.cos(p.a) * p.r * RR;
      const y = ccy + Math.sin(p.a) * p.r * RR;
      ctx.globalAlpha = a * 0.22;
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.arc(x, y, p.sz * 3, 0, 2 * P);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.fillStyle = soft;
      ctx.beginPath();
      ctx.arc(x, y, p.sz, 0, 2 * P);
      ctx.fill();
    }
    ctx.strokeStyle = soft;
    for (let i = waves.length - 1; i >= 0; i--) {
      const w = waves[i];
      w.t += dt;
      const k = w.t / 1.6;
      if (k >= 1) {
        waves.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = (1 - k) * 0.7;
      ctx.lineWidth = 2 * (1 - k) + 0.3;
      ctx.beginPath();
      ctx.arc(ccx, ccy, RR * (0.3 + k * 0.7), 0, 2 * P);
      ctx.stroke();
      ctx.globalAlpha = (1 - k) * 0.35;
      ctx.beginPath();
      ctx.arc(ccx, ccy, RR * (0.3 + k * 0.55), 0, 2 * P);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!reduce) raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    mo.disconnect();
    window.removeEventListener("pointermove", onMove);
    el.removeEventListener("click", pulse);
    el.innerHTML = "";
    el.classList.remove(id);
  };
}
