/* =========================================================
   CH3 · LoRA
   ========================================================= */
(() => {
  /* ---------- 全量微调 vs LoRA ---------- */
  (() => {
    const grid = $('#wgrid'), lora = $('#wlora'), cap = $('#whyCap');
    const COLS = 24, ROWS = 14;
    for (let i = 0; i < COLS * ROWS; i++) grid.appendChild(document.createElement('i'));
    for (let i = 0; i < ROWS * 2; i++) { const e = document.createElement('i'); e.style.setProperty('--k', i); lora.appendChild(e); }
    const cells = $$('i', grid);
    let timers = [];
    const clear = () => { timers.forEach(clearTimeout); timers = []; };
    function mode(m) {
      clear();
      $$('#whyTabs button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
      cells.forEach(c => c.classList.remove('hot'));
      if (m === 'full') {
        grid.classList.remove('frozen'); lora.classList.remove('on');
        cap.innerHTML = '每个方块 = 一组参数。全量微调：<b>全部</b>都要重新训练、重新保存。';
        cells.forEach((c, i) => { const x = i % COLS, y = (i / COLS) | 0; timers.push(setTimeout(() => c.classList.add('hot'), (x + y) * 35 + Math.random() * 120)); });
        App.sfx.whoosh();
      } else {
        grid.classList.add('frozen');
        timers.push(setTimeout(() => lora.classList.add('on'), 300));
        cap.innerHTML = 'LoRA：原模型<b>整体冻结</b>，只在旁边训练一条细细的“补丁”。';
        App.sfx.chime();
      }
    }
    $$('#whyTabs button').forEach(b => b.onclick = () => mode(b.dataset.m));
    App.register('s-why', {
      enter() { mode('full'); timers.push(setTimeout(() => { mode('lora'); App.pulseNext(); }, 3800)); },
      leave: clear
    });
  })();

  /* ---------- 低秩分解 ---------- */
  (() => {
    const D = 40, cW = $('#mW'), cB = $('#mB'), cA = $('#mA'), cD = $('#mD');
    const range = $('#rk');
    let r = 8, Bfull = [], A = [], scale = 1, anim = 0;
    const rnd = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    const size = (cv, w, h) => { cv.width = w; cv.height = h; cv.style.width = (w / D * 12) + 'rem'; cv.style.height = (h / D * 12) + 'rem'; return cv.getContext('2d'); };
    const div = v => { v = clamp(v, -1, 1); return v >= 0 ? [255 * (.15 + .85 * v), 122 * v + 30 * (1 - v), 168 * v + 34 * (1 - v)] : [30 * (1 + v), 211 * -v + 30, 230 * -v + 34]; };
    function paint(g, w, h, f) {
      const im = g.createImageData(w, h), d = im.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [R, G, B] = f(x, y), i = (y * w + x) * 4; d[i] = R; d[i + 1] = G; d[i + 2] = B; d[i + 3] = 255; }
      g.putImageData(im, 0, 0);
    }
    (() => {
      const g = size(cW, D, D);
      const ph = Array.from({ length: 6 }, () => [Math.random() * 6, Math.random() * 6, Math.random() * 6]);
      paint(g, D, D, (x, y) => { let v = 0; ph.forEach(([a, b, c]) => v += Math.sin(x * a * .2 + c) * Math.cos(y * b * .2 + c)); v = v / 6 + rnd() * .35; const l = 60 + v * 70; return [l, l, l + 6]; });
    })();
    function gen() {
      Bfull = Array.from({ length: D }, () => Array.from({ length: 64 }, rnd));
      A = Array.from({ length: 64 }, () => Array.from({ length: D }, rnd));
    }
    function render() {
      const rv = Math.min(r, 24);
      const gB = size(cB, rv, D), gA = size(cA, D, rv), gD = size(cD, D, D);
      paint(gB, rv, D, (x, y) => div(Bfull[y][x] * scale));
      paint(gA, D, rv, (x, y) => div(A[y][x]));
      const norm = 1 / Math.sqrt(r) * 1.1;
      paint(gD, D, D, (x, y) => { let s = 0; for (let k = 0; k < r; k++) s += Bfull[y][k] * A[k][x]; return div(s * scale * norm); });
      const p = 2 * 768 * r;
      $('#rkV').textContent = r; $('#rkB').textContent = r;
      $('#rkP').textContent = p.toLocaleString();
      $('#rkR').textContent = (p / 589824 * 100).toFixed(2) + '%';
      App.fillRange(range);
    }
    range.addEventListener('input', () => { r = +range.value; render(); });
    $('#mTrain').onclick = () => {
      cancelAnimationFrame(anim);
      gen(); const t0 = performance.now();
      App.sfx.whoosh();
      const fr = now => { const p = clamp((now - t0) / 1800, 0, 1); scale = 1 - (1 - p) ** 2; render(); if (p < 1) anim = requestAnimationFrame(fr); else App.sfx.chime(); };
      anim = requestAnimationFrame(fr);
    };
    gen(); render();
    App.register('s-math', { enter() { r = 8; range.value = 8; scale = 0; render(); setTimeout(() => $('#mTrain').click(), 900); }, leave() { cancelAnimationFrame(anim); } });
  })();

  /* ---------- 注入位置：逐级放大 ---------- */
  (() => {
    const TXT = [
      ['它插在哪里？', 'LoRA 不是一个独立的模型，它要“寄生”在 SD 里面。点击 <b>ZOOM IN</b>，一层层放大看。'],
      ['U-Net：去噪的主力', 'U 形结构：左边一路压缩、右边一路还原。每一层里都穿插着<b>注意力模块</b>——第二章说的“文字进入画面”就发生在这里。'],
      ['注意力层：LoRA 的落脚点', '交叉注意力里有 4 个线性层：<b>W<sub>Q</sub> / W<sub>K</sub> / W<sub>V</sub> / W<sub>out</sub></b>。它们决定了“画面如何理解文字”，正是 LoRA 最常挂载的位置。'],
      ['旁路：主路不动，另开小路', '输入 x 同时走两条路：主路经过<b>冻结的 W₀</b>；旁路先被 A 压到 r 维、再被 B 还原。两路相加。<br>关掉 LoRA = 拆掉旁路，模型瞬间变回原样。']
    ];
    let lv = 0;
    const levels = $$('#zoom .zl'), crumbs = $$('#zCrumb span');
    function set(l) {
      lv = clamp(l, 0, 3);
      levels.forEach((z, i) => { z.classList.toggle('on', i === lv); z.classList.toggle('past', i < lv); });
      crumbs.forEach((c, i) => { c.classList.toggle('on', i === lv); c.classList.toggle('past', i < lv); });
      $('#zTitle').textContent = TXT[lv][0];
      $('#zText').innerHTML = TXT[lv][1];
      $('#zIn').disabled = lv === 3; $('#zOut').disabled = lv === 0;
      if (lv === 3) App.pulseNext();
    }
    $('#zIn').onclick = () => { App.sfx.whoosh(); set(lv + 1); };
    $('#zOut').onclick = () => { App.sfx.click(); set(lv - 1); };
    crumbs.forEach((c, i) => c.onclick = () => set(i));

    /* 旁路粒子 */
    const svgG = $('#bpDots'), bp = $('#bypass');
    const MAIN = [[45, 120], [540, 120]], SIDE = [[90, 120], [90, 230], [460, 230], [460, 140]];
    const plen = pts => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
    const at = (pts, d) => { for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (d <= L) { const t = d / L; return [lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]; } d -= L; } return pts[pts.length - 1]; };
    let dots = [], raf = 0, last = 0, on = true;
    function loop(now) {
      if (now - last > 380) {
        last = now;
        dots.push({ path: MAIN, d: 0, L: plen(MAIN), el: mk('') });
        if (on) dots.push({ path: SIDE, d: 0, L: plen(SIDE), el: mk('p') });
      }
      dots = dots.filter(o => { o.d += 2.4; if (o.d >= o.L) { o.el.remove(); return false; } const [x, y] = at(o.path, o.d); o.el.setAttribute('cx', x); o.el.setAttribute('cy', y); return true; });
      raf = requestAnimationFrame(loop);
    }
    function mk(c) { const e = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); e.setAttribute('r', 5); e.setAttribute('class', 'bp-dot ' + c); svgG.appendChild(e); return e; }
    $('#bpOn').onchange = e => { on = e.target.checked; bp.classList.toggle('off', !on); $('#bpState').textContent = on ? 'ON' : 'OFF'; App.sfx.blip(on ? 880 : 330); };
    App.register('s-where', { enter() { set(0); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }, leave() { cancelAnimationFrame(raf); dots.forEach(o => o.el.remove()); dots = []; } });
  })();

  /* ---------- 权重 ---------- */
  (() => {
    const range = $('#lw'), yao = $('#lwYao'), nz = $('#lwNoise');
    const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
    function render() {
      const w = +range.value;
      yao.style.opacity = ss(.1, .75, w);
      const over = Math.max(0, w - 1.1);
      yao.style.filter = over ? `saturate(${1 + over * 3}) contrast(${1 + over * 1.4}) hue-rotate(${over * 30}deg)` : 'none';
      nz.style.opacity = clamp((w - 1.2) * 2.2, 0, .9);
      $('#lwV').textContent = w.toFixed(2); $('#lwP').textContent = w.toFixed(1); $('#lwF').textContent = w.toFixed(1);
      $('#lwM1').style.width = (Math.min(w / .85, 1) * 100 - Math.max(0, w - 1.2) * 60) + '%';
      $('#lwM2').style.width = clamp(100 - w / 1.6 * 100, 0, 100) + '%';
      $('#lwM3').style.width = clamp((w - .95) / .65 * 100, 0, 100) + '%';
      $('#lwState').textContent = w < .05 ? '权重 0 · LoRA 关闭：模型不认识“遥”'
        : w < .5 ? `权重 ${w.toFixed(2)} · 偏弱：只有一点像`
        : w <= 1 ? `权重 ${w.toFixed(2)} · 推荐区间`
        : w <= 1.2 ? `权重 ${w.toFixed(2)} · 偏强：开始僵硬`
        : `权重 ${w.toFixed(2)} · 过拟合：画面崩坏！`;
      App.fillRange(range);
    }
    range.addEventListener('input', render);
    let anim = 0;
    App.register('s-weight', {
      enter() {
        const seq = [[0, 0], [.8, 1400], [1.55, 1300], [.8, 1100]];
        let i = 0, from = 0;
        range.value = 0; render();
        const runSeg = () => {
          if (++i >= seq.length) return;
          const [to, dur] = seq[i], t0 = performance.now(); from = +range.value;
          const fr = now => { const p = clamp((now - t0) / dur, 0, 1); range.value = lerp(from, to, 1 - (1 - p) ** 3); render(); if (p < 1) anim = requestAnimationFrame(fr); else anim = setTimeout(runSeg, 600); };
          anim = requestAnimationFrame(fr);
        };
        anim = setTimeout(runSeg, 900);
      },
      leave() { cancelAnimationFrame(anim); clearTimeout(anim); }
    });
    range.addEventListener('pointerdown', () => { cancelAnimationFrame(anim); clearTimeout(anim); });
  })();

  /* ---------- 训练 · loss 曲线 ---------- */
  (() => {
    const cv = $('#lossCv');
    let raf = 0;
    function draw() {
      const w = cv.width = cv.clientWidth * 2, h = cv.height = cv.clientHeight * 2, g = cv.getContext('2d');
      const pts = []; let v = .9;
      for (let i = 0; i < 160; i++) { v = .12 + .78 * Math.exp(-i / 28) + (Math.random() - .5) * .08 * Math.exp(-i / 90); pts.push(v); }
      const t0 = performance.now();
      const fr = now => {
        const p = clamp((now - t0) / 2400, 0, 1), n = Math.floor(p * pts.length);
        g.clearRect(0, 0, w, h);
        g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
        for (let y = 0; y < 4; y++) { g.beginPath(); g.moveTo(0, h * y / 4); g.lineTo(w, h * y / 4); g.stroke(); }
        g.strokeStyle = '#ff7aa8'; g.lineWidth = 3; g.beginPath();
        for (let i = 0; i < n; i++) { const x = i / (pts.length - 1) * w, y = h - pts[i] * h * .9; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
        g.fillStyle = '#8d9098'; g.font = `${h * .12}px Consolas`; g.fillText(`loss  epoch ${Math.ceil(p * 10)}/10`, 10, h * .16);
        if (p < 1) raf = requestAnimationFrame(fr);
      };
      raf = requestAnimationFrame(fr);
    }
    App.register('s-train', { enter() { cancelAnimationFrame(raf); setTimeout(draw, 700); }, leave() { cancelAnimationFrame(raf); } });
  })();
})();
