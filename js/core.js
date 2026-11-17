/* =========================================================
   FROM NOISE — 核心：场景导航 / HUD / 转场 / 光标 / 音效
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);

const App = (() => {
  const scenes = $$('.scene');
  const hooks = {};
  const CH_NAMES = { 1: '开场', 2: '原理', 3: 'LoRA', 4: '作品', 5: '思考' };
  const CH_EN = { 2: ['PRINCIPLE', '从噪声到画面'], 3: ['LoRA', '给模型打个补丁'], 4: ['ARCHIVE', '遥的角色档案'], 5: ['AFTERMATH', '门槛消失之后'] };
  let cur = -1, busy = false, keyHook = null;

  /* ---------- 音效（WebAudio 合成，无外部文件） ---------- */
  const sfx = (() => {
    let ctx = null, muted = false;
    const ensure = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
    const tone = (f, d = .06, type = 'square', vol = .04, slide = 0) => {
      if (muted || !ensure()) return;
      const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + d + .02);
    };
    const noise = (d = .5, vol = .08, f0 = 400, f1 = 4000) => {
      if (muted || !ensure()) return;
      const t = ctx.currentTime, n = ctx.sampleRate * d, buf = ctx.createBuffer(1, n, ctx.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + d * .6);
      g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + d * .3); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      s.connect(bp).connect(g).connect(ctx.destination); s.start(t);
    };
    return {
      ensure,
      tick: () => tone(1800, .03, 'square', .02),
      click: () => tone(900, .05, 'triangle', .05, -300),
      blip: (f = 660) => tone(f, .08, 'sine', .06),
      whoosh: () => noise(.9, .12, 300, 5000),
      chime: () => { tone(880, .25, 'sine', .06); setTimeout(() => tone(1320, .35, 'sine', .05), 90); setTimeout(() => tone(1760, .5, 'sine', .04), 180); },
      boom: () => { tone(110, .9, 'sine', .18, -70); noise(1.2, .1, 2000, 200); },
      get muted() { return muted; },
      toggle() { muted = !muted; document.body.classList.toggle('muted', muted); }
    };
  })();

  /* ---------- 光标 ---------- */
  const cursor = $('#cursor'), cDot = $('.c-dot', cursor), cRing = $('.c-ring', cursor), cLabel = $('.c-label', cursor);
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
  const HOVER = 'button, a, input, label, .tile, .tok, .chip, .vc, .tn, .rc, .hold, .arc-art, .sd-handle, [data-hover]';
  addEventListener('pointermove', e => {
    mouse.x = e.clientX; mouse.y = e.clientY;
    const el = e.target.closest ? e.target.closest(HOVER) : null;
    cursor.classList.toggle('hover', !!el && !cursor.classList.contains('drag'));
    cLabel.textContent = (el && el.dataset.cursor) || cursor.dataset.label || '';
  });
  addEventListener('pointerdown', () => cursor.classList.add('down'));
  addEventListener('pointerup', () => cursor.classList.remove('down'));
  (function loop() {
    mouse.rx = lerp(mouse.rx, mouse.x, .2); mouse.ry = lerp(mouse.ry, mouse.y, .2);
    cDot.style.transform = `translate(${mouse.x}px,${mouse.y}px)`;
    cRing.style.transform = `translate(${mouse.rx}px,${mouse.ry}px)`;
    cLabel.style.transform = `translate(${mouse.rx}px,${mouse.ry}px)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener('pointerover', e => { if (e.target.closest && e.target.closest('button, .tok, .chip, .tile')) sfx.tick(); });

  /* ---------- 全屏噪声层 ---------- */
  const noise = (() => {
    const cv = $('#noiseLayer'), g = cv.getContext('2d');
    let on = false, alpha = 1, raf = 0, img = null;
    const W = 192, H = 108;
    cv.width = W; cv.height = H; img = g.createImageData(W, H);
    const draw = () => {
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = 20 + Math.random() * 120;
        d[i] = v * (.9 + Math.random() * .2); d[i + 1] = v; d[i + 2] = v * (.95 + Math.random() * .15); d[i + 3] = 255 * alpha;
      }
      g.putImageData(img, 0, 0);
      if (on) raf = requestAnimationFrame(draw);
    };
    return {
      start(a = 1) { alpha = a; if (!on) { on = true; draw(); } cv.classList.add('on'); },
      set alpha(a) { alpha = a; },
      stop() { cv.classList.remove('on'); setTimeout(() => { if (!cv.classList.contains('on')) { on = false; cancelAnimationFrame(raf); } }, 1300); }
    };
  })();

  /* ---------- 打字机 ---------- */
  const typers = new WeakMap();
  function type(el, text, speed = 32) {
    if (!el) return;
    const prev = typers.get(el); if (prev) prev.stop = true;
    const job = { stop: false };
    typers.set(el, job);
    const full = text ?? el.dataset.full ?? el.textContent;
    el.dataset.full = full;
    el.innerHTML = '<span class="cur"></span>';
    let i = 0;
    const step = () => {
      if (job.stop) return;
      i++;
      el.innerHTML = full.slice(0, i) + '<span class="cur"></span>';
      if (i % 3 === 0) sfx.tick();
      if (i < full.length) setTimeout(step, /[，。！？…—]/.test(full[i - 1]) ? speed * 5 : speed);
      else setTimeout(() => { if (!job.stop) el.innerHTML = full; }, 1200);
    };
    setTimeout(step, 500);
    const finish = () => { job.stop = true; el.innerHTML = full; };
    const box = el.closest('.vn, .arc-dialog');
    if (box) box.onclick = finish;
  }

  /* ---------- HUD ---------- */
  const hudCh = $('#hudChapters'), prog = $('#footProg');
  for (let c = 1; c <= 5; c++) {
    const b = document.createElement('button');
    b.innerHTML = `<b>0${c}</b>${CH_NAMES[c]}`;
    b.onclick = () => go(scenes.findIndex(s => +s.dataset.ch === c));
    b.dataset.ch = c;
    hudCh.appendChild(b);
  }
  scenes.forEach((s, i) => {
    if (i === 0) return;
    const t = document.createElement('i');
    if (i > 1 && scenes[i - 1].dataset.ch !== s.dataset.ch) t.classList.add('ch');
    t.onclick = () => go(i);
    prog.appendChild(t);
  });
  const menuGrid = $('#menuGrid');
  for (let c = 1; c <= 5; c++) {
    const col = document.createElement('div');
    col.className = 'mcol';
    col.innerHTML = `<h4><b>0${c}</b>${CH_NAMES[c]}</h4>`;
    scenes.forEach((s, i) => {
      if (+s.dataset.ch !== c) return;
      const b = document.createElement('button');
      b.innerHTML = `<i>${String(i).padStart(2, '0')}</i>${s.dataset.title}`;
      b.onclick = () => { toggleMenu(false); go(i); };
      b.dataset.i = i;
      col.appendChild(b);
    });
    menuGrid.appendChild(col);
  }
  function updateHUD() {
    const s = scenes[cur], ch = +s.dataset.ch;
    let sub = 0; for (let i = cur; i >= 0 && scenes[i].dataset.ch === s.dataset.ch; i--) sub++;
    $('#footCode').textContent = `${String(ch).padStart(2, '0')}-${sub}`;
    $('#footTitle').textContent = s.dataset.title;
    $('#nextLabel').textContent = s.dataset.next || '继续';
    $$('#hudChapters button').forEach(b => { b.classList.toggle('on', +b.dataset.ch === ch); b.classList.toggle('done', +b.dataset.ch < ch); });
    $$('#footProg i').forEach((t, i) => { t.classList.toggle('on', i + 1 === cur); t.classList.toggle('done', i + 1 < cur); });
    $$('#menuGrid button').forEach(b => b.classList.toggle('on', +b.dataset.i === cur));
    $('#btnPrev').style.visibility = cur <= 1 ? 'hidden' : 'visible';
    document.body.classList.toggle('at-boot', cur === 0);
  }

  /* ---------- 计时器 ---------- */
  let t0 = 0;
  const timerEl = $('#timer');
  setInterval(() => {
    if (!t0) return;
    const s = Math.floor((Date.now() - t0) / 1000);
    timerEl.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    timerEl.classList.toggle('warn', s >= 240 && s < 300);
    timerEl.classList.toggle('over', s >= 300);
  }, 500);
  $('#btnTimer').onclick = () => { t0 = Date.now(); timerEl.textContent = '00:00'; };

  /* ---------- 转场 ---------- */
  const wipe = $('#wipe');
  function runWipe(ch) {
    const [en, cn] = CH_EN[ch] || ['', ''];
    $('#wipeNo').textContent = String(ch).padStart(2, '0');
    $('#wipeTitle').textContent = en;
    $('#wipeSub').textContent = cn;
    wipe.classList.remove('run'); void wipe.offsetWidth; wipe.classList.add('run');
    sfx.whoosh();
  }

  /* ---------- 导航 ---------- */
  function swap(i) {
    const from = scenes[cur], to = scenes[i];
    if (from) { from.classList.remove('on'); hooks[from.id]?.leave?.(from); }
    cur = i;
    to.classList.add('on');
    updateHUD();
    $$('[data-type]', to).forEach(p => type(p));
    hooks[to.id]?.enter?.(to);
    document.dispatchEvent(new CustomEvent('scene', { detail: to }));
    $('#btnNext').classList.remove('pulse');
  }
  function go(i) {
    if (busy || i < 0 || i >= scenes.length || i === cur) return;
    if (i === 0 && cur > 0) return;
    sfx.ensure();
    const from = scenes[cur], to = scenes[i];
    const ch = +to.dataset.ch;
    if (from && from.dataset.ch !== to.dataset.ch && ch >= 2) {
      busy = true;
      runWipe(ch);
      setTimeout(() => swap(i), 720);
      setTimeout(() => { busy = false; }, 1300);
    } else {
      sfx.click();
      swap(i);
    }
    if (!t0 && i > 0) t0 = Date.now();
  }
  const next = () => go(cur === scenes.length - 1 ? 1 : cur + 1);
  const prev = () => go(cur - 1);
  $('#btnNext').onclick = next;
  $('#btnPrev').onclick = prev;

  /* ---------- 菜单 / 全屏 / 音效 ---------- */
  function toggleMenu(v) { $('#menu').classList.toggle('on', v); }
  $('#btnMenu').onclick = () => toggleMenu(!$('#menu').classList.contains('on'));
  const fullscreen = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); };
  $('#btnFull').onclick = fullscreen;
  $('#btnSound').onclick = () => sfx.toggle();

  /* ---------- 查看器 ---------- */
  const viewer = $('#viewer');
  function view(src, metaHTML) {
    const img = $('#viewerImg');
    img.src = src;
    $('#viewerMeta').innerHTML = metaHTML || '';
    viewer.classList.remove('on'); void viewer.offsetWidth; viewer.classList.add('on');
    sfx.blip(520);
  }
  const closeViewer = () => viewer.classList.remove('on');
  $('#viewerClose').onclick = closeViewer;
  viewer.addEventListener('click', e => { if (e.target === viewer || e.target.classList.contains('v-img')) closeViewer(); });

  /* ---------- Toast ---------- */
  function toast(icon, small, text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<i>${icon}</i><div><small>${small}</small><b>${text}</b></div>`;
    $('#toasts').appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  /* ---------- 键盘 ---------- */
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    if (keyHook && keyHook(e)) return;
    const k = e.key;
    if (k === ' ' && e.repeat) { e.preventDefault(); return; }
    if (k === 'Escape') { closeViewer(); toggleMenu(false); return; }
    if (viewer.classList.contains('on')) return;
    if (k === 'ArrowRight' || k === 'PageDown' || (k === ' ' && cur > 0) || k === 'Enter') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp') { e.preventDefault(); prev(); }
    else if (k === 'm' || k === 'M') toggleMenu(!$('#menu').classList.contains('on'));
    else if (k === 'f' || k === 'F') fullscreen();
    else if (k === 's' || k === 'S') sfx.toggle();
    else if (k === 't' || k === 'T') $('#btnTimer').click();
    else if (/^[1-5]$/.test(k) && cur > 0) go(scenes.findIndex(s => s.dataset.ch === k));
  });

  /* ---------- range 填充色 ---------- */
  const fillRange = r => r.style.setProperty('--v', ((r.value - r.min) / (r.max - r.min) * 100) + '%');
  document.addEventListener('input', e => { if (e.target.type === 'range') fillRange(e.target); });
  $$('input[type=range]').forEach(fillRange);

  /* ---------- 图片加载工具 ---------- */
  const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  return {
    scenes, register: (id, h) => { hooks[id] = h; }, go, next, prev, sfx, noise, type, view, toast, loadImg, fillRange,
    get cur() { return cur; }, set keyHook(f) { keyHook = f; }, get keyHook() { return keyHook; },
    pulseNext() { $('#btnNext').classList.add('pulse'); },
    start() { swap(0); }
  };
})();

window.addEventListener('load', () => App.start());
