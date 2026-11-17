/* =========================================================
   CH2 · Stable Diffusion 原理（真实公式驱动的可视化）
   ========================================================= */
(() => {
  /* ---------- 工具 ---------- */
  const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function gauss(n, seed) {
    const r = rng(seed), out = new Float32Array(n);
    for (let i = 0; i < n; i += 2) {
      const u = Math.max(r(), 1e-7), v = r(), m = Math.sqrt(-2 * Math.log(u));
      out[i] = m * Math.cos(2 * Math.PI * v);
      if (i + 1 < n) out[i + 1] = m * Math.sin(2 * Math.PI * v);
    }
    return out;
  }
  // 余弦噪声调度：t∈[0,1] → ᾱ
  const abar = t => { const s = .008, f = x => Math.cos((x + s) / (1 + s) * Math.PI / 2) ** 2; return clamp(f(t) / f(0), 0, 1); };
  function pixels(img, w, h, filter = 'none', pad = 0) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.filter = filter;
    g.drawImage(img, -pad, -pad, w + pad * 2, h + pad * 2);
    const d = g.getImageData(0, 0, w, h).data, f = new Float32Array(w * h * 3);
    for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { f[j] = d[i] / 127.5 - 1; f[j + 1] = d[i + 1] / 127.5 - 1; f[j + 2] = d[i + 2] / 127.5 - 1; }
    return f;
  }
  function compose(ctx, w, h, x0, eps, a, out) {
    const img = out || ctx.createImageData(w, h), d = img.data, sa = Math.sqrt(a), sn = Math.sqrt(1 - a);
    for (let i = 0, j = 0; j < x0.length; i += 4, j += 3) {
      d[i] = (sa * x0[j] + sn * eps[j] + 1) * 127.5;
      d[i + 1] = (sa * x0[j + 1] + sn * eps[j + 1] + 1) * 127.5;
      d[i + 2] = (sa * x0[j + 2] + sn * eps[j + 2] + 1) * 127.5;
      d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  const setup = (cv, w, h) => { cv.width = w; cv.height = h; return cv.getContext('2d'); };
  const IMGS = {};
  const ready = Promise.all(Object.entries(EMBED).map(([k, v]) => App.loadImg(v).then(i => { IMGS[k] = i; })));

  /* =========================================================
     STEP 01 · 前向加噪
     ========================================================= */
  (() => {
    const W = 256, H = 384, cv = $('#fwdCanvas'), g = setup(cv, W, H);
    const range = $('#fwdT');
    let x0 = null, eps = gauss(W * H * 3, 7), buf = g.createImageData(W, H), playing = 0;
    function render() {
      if (!x0) return;
      const t = range.value / 1000, a = abar(t);
      compose(g, W, H, x0, eps, a, buf);
      $('#fwdTv').textContent = range.value;
      $('#fwdSig').style.width = (Math.sqrt(a) * 100) + '%';
      $('#fwdNoi').style.width = (Math.sqrt(1 - a) * 100) + '%';
      $('#fwdSigV').textContent = Math.sqrt(a).toFixed(2);
      $('#fwdNoiV').textContent = Math.sqrt(1 - a).toFixed(2);
      App.fillRange(range);
    }
    ready.then(() => { x0 = pixels(IMGS.w01_2, W, H); render(); });
    range.addEventListener('input', render);
    $('#fwdPlay').onclick = () => {
      cancelAnimationFrame(playing);
      const from = +range.value >= 990 ? 0 : +range.value, t0 = performance.now(), dur = 3200 * (1 - from / 1000) + 300;
      const step = now => {
        const p = clamp((now - t0) / dur, 0, 1);
        range.value = Math.round(lerp(from, 1000, p));
        render();
        if (Math.round(p * 20) !== Math.round((p - .016) * 20)) App.sfx.tick();
        if (p < 1) playing = requestAnimationFrame(step); else App.pulseNext();
      };
      playing = requestAnimationFrame(step);
    };
    App.register('s-forward', { enter() { range.value = 0; render(); setTimeout(() => $('#fwdPlay').click(), 1400); }, leave() { cancelAnimationFrame(playing); } });
  })();

  /* =========================================================
     STEP 02 · 反向去噪（x_t / ε̂ / x̂0 三联）
     ========================================================= */
  (() => {
    const W = 192, H = 288, N = 20;
    const gX = setup($('#revX'), W, H), gE = setup($('#revE'), W, H), gX0 = setup($('#revX0'), W, H);
    const stepsEl = $('#revSteps');
    for (let i = 0; i < N; i++) stepsEl.appendChild(document.createElement('i'));
    let eps = gauss(W * H * 3, 42), seed = 42, k = 0, anim = 0, auto = false;
    const cache = {};
    const bX = gX.createImageData(W, H), bE = gE.createImageData(W, H), bX0 = gX0.createImageData(W, H);
    function x0hat(t) {
      const r = Math.round(26 * Math.pow(t, 1.25)), s = (1 - .75 * t).toFixed(2), key = r + '|' + s;
      if (!cache[key]) cache[key] = pixels(IMGS.w01_2, W, H, `blur(${r}px) saturate(${s})`, r * 2);
      return cache[key];
    }
    const zero = new Float32Array(W * H * 3);
    function render(kf) {
      const t = 1 - kf / N, a = abar(t), x0 = x0hat(t);
      compose(gX, W, H, x0, eps, a, bX);
      compose(gE, W, H, zero, eps, 1 - (1 - a) * .9, bE);
      const d = bE.data; for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; d[i] = d[i + 1] = d[i + 2] = v; }
      for (let i = 0; i < d.length; i += 4) { d[i] = d[i] * .85 + 30; d[i + 2] = d[i + 2] * .9 + 20; }
      gE.putImageData(bE, 0, 0);
      compose(gX0, W, H, x0, zero, 1, bX0);
      const ki = Math.floor(kf);
      $$('i', stepsEl).forEach((el, i) => el.classList.toggle('on', i < ki));
      $('#revRead').textContent = `STEP ${String(ki).padStart(2, '0')} / ${N}`;
      const ph = ki < 7 ? 0 : ki < 14 ? 1 : 2;
      $$('#revPhase span').forEach(s => s.classList.toggle('on', +s.dataset.p === ph && ki > 0));
    }
    function stepTo(target, dur = 380) {
      return new Promise(res => {
        cancelAnimationFrame(anim);
        const from = k, t0 = performance.now();
        const fr = now => {
          const p = clamp((now - t0) / dur, 0, 1), e = 1 - (1 - p) ** 3;
          render(lerp(from, target, e));
          if (p < 1) anim = requestAnimationFrame(fr); else { k = target; res(); }
        };
        anim = requestAnimationFrame(fr);
      });
    }
    async function stepOnce() {
      if (k >= N) return;
      App.sfx.blip(400 + k * 30);
      await stepTo(k + 1);
      if (k === N) { App.sfx.chime(); App.pulseNext(); }
    }
    $('#revStep').onclick = () => { auto = false; stepOnce(); };
    $('#revAuto').onclick = async () => {
      if (auto) return;
      auto = true;
      if (k >= N) { k = 0; render(0); await sleep(300); }
      while (auto && k < N) { await stepOnce(); await sleep(140); }
      auto = false;
    };
    $('#revReset').onclick = () => { auto = false; seed++; eps = gauss(W * H * 3, seed); k = 0; render(0); App.sfx.whoosh(); };
    App.register('s-reverse', { enter() { ready.then(() => { k = 0; render(0); }); }, leave() { auto = false; cancelAnimationFrame(anim); } });
  })();

  /* =========================================================
     STEP 03 · 潜空间压缩
     ========================================================= */
  (() => {
    const W = 192, H = 288, LW = 64, LH = 96;
    const cv = $('#latPix'), g = setup(cv, W, H);
    const chs = $$('#latCh canvas');
    let state = 'pixel', busy = false;
    function drawPix(w) {
      const h = Math.round(w * 1.5), tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      tmp.getContext('2d').drawImage(IMGS.w01_2, 0, 0, w, h);
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, W, H);
      g.drawImage(tmp, 0, 0, W, H);
    }
    function buildChannels() {
      const c = document.createElement('canvas'); c.width = LW; c.height = LH;
      const cg = c.getContext('2d'); cg.drawImage(IMGS.w01_2, 0, 0, LW, LH);
      const d = cg.getImageData(0, 0, LW, LH).data;
      const L = new Float32Array(LW * LH);
      for (let i = 0; i < LW * LH; i++) L[i] = (d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11) / 255;
      chs.forEach((cvs, ci) => {
        cvs.width = LW; cvs.height = LH;
        const og = cvs.getContext('2d'), o = og.createImageData(LW, LH), od = o.data;
        for (let y = 0; y < LH; y++) for (let x = 0; x < LW; x++) {
          const i = y * LW + x, r = d[i * 4] / 255, gg = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255;
          let v;
          if (ci === 0) v = L[i];
          else if (ci === 1) v = .5 + (r - gg) * .9;
          else if (ci === 2) v = .5 + ((r + gg) / 2 - b) * 1.2;
          else { const xl = L[i - 1] ?? L[i], xr = L[i + 1] ?? L[i], yu = L[i - LW] ?? L[i], yd = L[i + LW] ?? L[i]; v = clamp(Math.hypot(xr - xl, yd - yu) * 3, 0, 1); }
          v = clamp(v, 0, 1);
          const pal = [[v, v, v], [v, .25 + v * .3, 1 - v], [.15 + v * .85, .1 + v * .7, .6 - v * .5], [.4 * v + .1, .05, .5 * v + .2 + v * .3]][ci];
          od[i * 4] = pal[0] * 255; od[i * 4 + 1] = pal[1] * 255; od[i * 4 + 2] = pal[2] * 255; od[i * 4 + 3] = 255;
        }
        og.putImageData(o, 0, 0);
      });
    }
    const countTo = (el, from, to, dur = 900) => {
      const t0 = performance.now();
      const fr = now => { const p = clamp((now - t0) / dur, 0, 1); el.textContent = Math.round(lerp(from, to, 1 - (1 - p) ** 3)).toLocaleString(); if (p < 1) requestAnimationFrame(fr); };
      requestAnimationFrame(fr);
    };
    async function encode() {
      if (busy || state === 'latent') return; busy = true;
      $('#latFunnel').classList.add('run');
      for (const w of [192, 128, 96, 64]) { drawPix(w); App.sfx.blip(300 + w * 2); await sleep(320); }
      $('#latCh').classList.add('on');
      cv.parentElement.style.opacity = .35;
      countTo($('#latB'), 1179648, 24576, 1200);
      $('#latRead').textContent = 'LATENT · 64×96×4';
      App.sfx.chime();
      state = 'latent'; busy = false;
      $('#latFunnel').classList.remove('run');
      App.pulseNext();
    }
    async function decode() {
      if (busy || state === 'pixel') return; busy = true;
      $('#latCh').classList.remove('on');
      cv.parentElement.style.opacity = 1;
      for (const w of [64, 96, 128, 192, 384]) { drawPix(w); App.sfx.blip(300 + w); await sleep(260); }
      g.imageSmoothingEnabled = true; g.drawImage(IMGS.w01_2, 0, 0, W, H);
      $('#latRead').textContent = 'PIXEL SPACE';
      state = 'pixel'; busy = false;
    }
    $('#latEnc').onclick = encode;
    $('#latDec').onclick = decode;
    ready.then(() => { buildChannels(); g.drawImage(IMGS.w01_2, 0, 0, W, H); });
    App.register('s-latent', {
      enter() {
        ready.then(() => {
          state = 'pixel'; busy = false; $('#latCh').classList.remove('on'); cv.parentElement.style.opacity = 1;
          g.imageSmoothingEnabled = true; g.drawImage(IMGS.w01_2, 0, 0, W, H);
          $('#latB').textContent = '24,576'; $('#latRead').textContent = 'PIXEL SPACE';
        });
      }
    });
  })();

  /* =========================================================
     STEP 04 · 文本编码 + 交叉注意力
     ========================================================= */
  (() => {
    const TOK = [
      ['masterpiece', '#ffd400', [[.5, .5, .5, .35]]],
      ['1girl', '#ff9f43', [[.5, .2, .1], [.5, .45, .17], [.45, .75, .15], [.48, .9, .08]]],
      ['pink hair', '#ff7aa8', [[.38, .28, .12], [.68, .3, .13], [.52, .1, .1], [.32, .42, .08], [.78, .42, .09], [.3, .2, .07]]],
      ['red bow', '#ff4747', [[.55, .055, .06]]],
      ['smile', '#ffb86b', [[.49, .175, .04]]],
      ['cherry blossoms', '#f78fb3', [[.12, .12, .18], [.86, .18, .16], [.08, .45, .12], [.92, .52, .12], [.3, .05, .1]]],
      ['red skirt', '#e84393', [[.5, .47, .1], [.3, .62, .1], [.72, .64, .11], [.38, .78, .07], [.7, .8, .07]]],
      ['white boots', '#74b9ff', [[.45, .87, .06], [.5, .93, .05]]]
    ];
    const bar = $('#promptBar'), vecs = $('#vecs'), heat = $('#attHeat');
    $('#attImg').src = 'assets/works/w01_2.jpg';
    const HW = 96, HH = 144, hg = setup(heat, HW, HH);
    const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
    TOK.forEach(([t, c], i) => {
      const b = document.createElement('button');
      b.className = 'tok'; b.textContent = t; b.style.setProperty('--tc', c);
      b.onclick = () => { stopAuto(); pick(i); };
      bar.appendChild(b);
      const v = document.createElement('div');
      v.className = 'vec';
      const r = rng(hash(t));
      v.innerHTML = `<span>${t}</span><div class="bars">${Array.from({ length: 28 }, () => `<i style="background:hsl(${(hash(t) % 360 + r() * 60) | 0},70%,${30 + r() * 45}%)"></i>`).join('')}</div>`;
      vecs.appendChild(v);
    });
    const jet = v => { const r = clamp(1.5 - Math.abs(4 * v - 3), 0, 1), g = clamp(1.5 - Math.abs(4 * v - 2), 0, 1), b = clamp(1.5 - Math.abs(4 * v - 1), 0, 1); return [r * 255, g * 255, b * 255]; };
    let curT = -1, fade = 0;
    function pick(i) {
      curT = i;
      $$('.tok', bar).forEach((b, j) => b.classList.toggle('on', j === i));
      $$('.vec', vecs).forEach((b, j) => b.classList.toggle('on', j === i));
      $('#attLabel').textContent = `attention · “${TOK[i][0]}”`;
      App.sfx.blip(500 + i * 60);
      hg.clearRect(0, 0, HW, HH);
      hg.globalCompositeOperation = 'lighter';
      TOK[i][2].forEach(([x, y, r, a = .9]) => {
        const R = r * HW * 1.6, gr = hg.createRadialGradient(x * HW, y * HH, 0, x * HW, y * HH, R);
        gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        hg.fillStyle = gr; hg.fillRect(0, 0, HW, HH);
      });
      hg.globalCompositeOperation = 'source-over';
      const id = hg.getImageData(0, 0, HW, HH), d = id.data;
      for (let p = 0; p < d.length; p += 4) {
        const v = clamp(d[p] / 255 + (Math.random() - .5) * .06, 0, 1);
        const [r, g, b] = jet(.08 + v * .92);
        const a = v < .05 ? 0 : 50 + v * 175;
        d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = a;
      }
      hg.putImageData(id, 0, 0);
      heat.classList.remove('flash'); void heat.offsetWidth; heat.classList.add('flash');
    }
    let autoT = 0, ai = 0;
    const stopAuto = () => clearInterval(autoT);
    App.register('s-text', {
      enter() { ai = 2; pick(ai); stopAuto(); autoT = setInterval(() => { ai = (ai + 1) % TOK.length; pick(ai); }, 2600); },
      leave() { stopAuto(); }
    });
  })();

  /* =========================================================
     STEP 05 · CFG + 负面提示词
     ========================================================= */
  (() => {
    const svg = $('#cfgPlot'), img = $('#cfgImg'), range = $('#cfgS');
    img.src = 'assets/works/w01_2.jpg';
    const NS = 'http://www.w3.org/2000/svg';
    let grid = '';
    for (let i = 0; i <= 320; i += 32) grid += `<line x1="${i}" y1="0" x2="${i}" y2="320"/><line x1="0" y1="${i}" x2="320" y2="${i}"/>`;
    svg.innerHTML = `<defs>
        <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#ffd400"/></marker>
        <marker id="ag" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#8d9098"/></marker>
        <marker id="ap" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 10 5 0 10Z" fill="#ff7aa8"/></marker>
      </defs>
      <g class="grid">${grid}</g>
      <line id="cvU" stroke="#8d9098" stroke-width="2" marker-end="url(#ag)"/>
      <line id="cvP" stroke="#ff7aa8" stroke-width="2" marker-end="url(#ap)"/>
      <line id="cvExt" stroke="#ffd400" stroke-width="1" stroke-dasharray="4 4" opacity=".5"/>
      <line id="cvG" stroke="#ffd400" stroke-width="3.5" marker-end="url(#ah)"/>
      <circle cx="40" cy="285" r="5" fill="#fff"/>
      <text x="14" y="308">当前 x_t</text>
      <text id="cvUt"></text><text id="cvPt" fill="#ff7aa8"></text><text id="cvGt" fill="#ffd400"></text>
      <text x="12" y="22">噪声预测空间（示意）</text>`;
    const O = [40, 285], U0 = [96, 272], P = [110, 254];
    const set = (id, a) => { const e = svg.querySelector('#' + id); for (const k in a) e.setAttribute(k, a[k]); };
    const neg = () => $$('#negChips .chip.on').length;
    function render() {
      const s = +range.value, n = neg();
      const U = [U0[0] - n * 3, U0[1] + n * 1.5];
      const G = [U[0] + s * (P[0] - U[0]), U[1] + s * (P[1] - U[1])];
      const clip = (a, b) => { const tmax = Math.min(1, ...[0, 1].map(i => { const d = b[i] - a[i]; return d > 0 ? (316 - a[i]) / d : d < 0 ? (4 - a[i]) / d : 1; })); return [a[0] + (b[0] - a[0]) * tmax, a[1] + (b[1] - a[1]) * tmax]; };
      const Gc = clip(O, G);
      set('cvU', { x1: O[0], y1: O[1], x2: U[0], y2: U[1] });
      set('cvP', { x1: O[0], y1: O[1], x2: P[0], y2: P[1] });
      set('cvExt', { x1: U[0], y1: U[1], x2: Gc[0], y2: Gc[1] });
      set('cvG', { x1: O[0], y1: O[1], x2: Gc[0], y2: Gc[1] });
      const ut = svg.querySelector('#cvUt'); ut.setAttribute('x', U[0] + 10); ut.setAttribute('y', U[1] + 16); ut.textContent = n ? 'ε(负面词)' : 'ε(∅) 无条件';
      const pt = svg.querySelector('#cvPt'); pt.setAttribute('x', P[0] + 10); pt.setAttribute('y', P[1] + 2); pt.textContent = 'ε(prompt)';
      const over = G[1] < 4 || G[0] > 316;
      const gt = svg.querySelector('#cvGt'); gt.setAttribute('text-anchor', 'end'); gt.setAttribute('x', Math.min(Gc[0] - 12, 304)); gt.setAttribute('y', Math.max(Gc[1] - 4, 44)); gt.textContent = over ? `×${s} 冲出范围！` : `×${s} 引导结果`;
      $('#cfgSv').textContent = s.toFixed(1); $('#cfgS1').textContent = s;
      let f, label;
      if (s < 3) { const k = (3 - s) / 2; f = `blur(${1 + k * 1.5}px) saturate(${.55 - k * .25}) contrast(${.85 - k * .1}) brightness(1.08)`; label = `CFG ${s} · 太弱：画面平淡、不听话`; }
      else if (s <= 11) { f = 'none'; label = `CFG ${s} · 平衡（常用 5~9）`; }
      else { const k = (s - 11) / 9; f = `saturate(${1 + k * 1.6}) contrast(${1 + k * .7}) brightness(${1 + k * .08}) hue-rotate(${-k * 8}deg)`; label = `CFG ${s} · 太强：过饱和、“烧糊”`; }
      if (!n) f = (f === 'none' ? '' : f + ' ') + 'blur(.6px) contrast(.93)';
      img.style.filter = f || 'none';
      $('#cfgState').textContent = label + (n ? ` · 已排除 ${n} 项` : '');
      App.fillRange(range);
    }
    range.addEventListener('input', render);
    $$('#negChips .chip').forEach(c => c.onclick = () => { c.classList.toggle('on'); App.sfx.blip(c.classList.contains('on') ? 300 : 500); render(); });
    App.register('s-cfg', { enter() { range.value = 7; $$('#negChips .chip').forEach(c => c.classList.add('on')); render(); } });
  })();

  /* =========================================================
     STEP 06 · 全流程
     ========================================================= */
  (() => {
    const LW = 48, LH = 72, OW = 256, OH = 384, N = 20;
    const gl = setup($('#pipeLat'), LW, LH), go = setup($('#pipeOut'), OW, OH);
    const seeds = ['w01_2', 'w06_1', 'w08_1', 'w04_2', 'w09_1', 'w01_1'];
    let si = 0, running = false, seedNum = 20261027;
    const nodes = n => $(`.pn[data-n=${n}]`), line = l => $(`.pl[data-l="${l}"]`);
    function blank() {
      go.fillStyle = '#050506'; go.fillRect(0, 0, OW, OH);
      go.fillStyle = '#ffd400'; go.font = '700 64px Bahnschrift, sans-serif'; go.textAlign = 'center'; go.fillText('?', OW / 2, OH / 2 + 20);
      const eps = gauss(LW * LH * 3, seedNum), z = new Float32Array(LW * LH * 3);
      compose(gl, LW, LH, z, eps, 0);
    }
    function reset() {
      $$('.pn').forEach(n => n.classList.remove('on', 'done'));
      $$('.pl').forEach(l => l.classList.remove('on'));
      $('#pipeStep').textContent = 'sampler · Euler a';
      blank();
    }
    async function run() {
      if (running) return; running = true;
      reset();
      $('#pipeRun').disabled = true;
      const img = IMGS[seeds[si]];
      const flash = async (n, l, ms = 550) => { nodes(n).classList.add('on'); App.sfx.blip(); await sleep(ms); nodes(n).classList.remove('on'); nodes(n).classList.add('done'); if (l) line(l).classList.add('on'); };
      await flash('prompt', 1);
      await flash('clip', 2);
      await flash('seed', 3, 450);
      nodes('unet').classList.add('on');
      const eps = gauss(LW * LH * 3, seedNum), buf = gl.createImageData(LW, LH);
      for (let k = 1; k <= N; k++) {
        const t = 1 - k / N, r = Math.round(10 * Math.pow(t, 1.2));
        const x0 = pixels(img, LW, LH, `blur(${r}px) saturate(${(1 - .7 * t).toFixed(2)})`, r * 2);
        compose(gl, LW, LH, x0, eps, abar(t), buf);
        $('#pipeStep').textContent = `step ${String(k).padStart(2, '0')} / ${N}`;
        App.sfx.tick();
        await sleep(110);
      }
      nodes('unet').classList.remove('on'); nodes('unet').classList.add('done'); line(4).classList.add('on');
      await flash('vae', 5, 500);
      nodes('out').classList.add('on');
      go.imageSmoothingEnabled = false;
      go.drawImage($('#pipeLat'), 0, 0, OW, OH);
      go.imageSmoothingEnabled = true;
      for (let y = 0; y <= OH; y += 12) {
        go.drawImage(img, 0, 0, img.width, img.height * y / OH, 0, 0, OW, y);
        go.fillStyle = '#ffd400'; go.fillRect(0, y, OW, 2);
        await sleep(16);
      }
      go.drawImage(img, 0, 0, OW, OH);
      App.sfx.chime();
      nodes('out').classList.remove('on'); nodes('out').classList.add('done');
      $$('.pl').forEach(l => l.classList.remove('on'));
      $('#pipeRun').disabled = false; running = false;
      App.pulseNext();
    }
    $('#pipeRun').onclick = run;
    $('#seedRoll').onclick = () => {
      if (running) return;
      seedNum = Math.floor(Math.random() * 4294967295);
      si = (si + 1) % seeds.length;
      $('#seedV').textContent = seedNum;
      App.sfx.blip(880);
      reset();
    };
    App.register('s-pipe', { enter() { ready.then(() => { if (!running) reset(); }); } });
  })();
})();
