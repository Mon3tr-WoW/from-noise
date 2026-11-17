/* =========================================================
   CH1 · 开机 + 标题 + 无限画廊
   ========================================================= */
(() => {
  const body = document.body;

  /* ---------- 无限画廊（world 层） ---------- */
  const World = (() => {
    const inner = $('#worldInner');
    const G = DATA.gallery;
    const C = 9, R = 6;
    let tiles = [], W = 0, H = 0, tw = 0, th = 0, gap = 0;
    let ox = 0, oy = 0, vx = 0, vy = 0, drift = true, running = false, live = false, zoom = 1;
    const order = G.map((_, i) => i).sort(() => Math.random() - .5);
    for (let c = 0; c < C; c++) for (let r = 0; r < R; r++) {
      const k = order[(c * R + r) % G.length], g = G[k];
      const el = document.createElement('div');
      el.className = 'tile';
      el.dataset.no = `#${String(k + 1).padStart(2, '0')}`;
      el.innerHTML = `<img src="${g.src}" alt="" loading="lazy" decoding="async"><div class="t-bar"><b>@${g.user}</b><br>♥ ${g.hearts.toLocaleString()}</div>`;
      el.dataset.cursor = 'VIEW';
      inner.appendChild(el);
      tiles.push({ el, c, r, k, seen: false });
    }
    function measure() {
      const u = rem();
      tw = 15 * u; th = 22.5 * u; gap = 1.4 * u;
      W = C * (tw + gap); H = R * (th + gap);
    }
    measure(); addEventListener('resize', measure);

    function frame() {
      if (!running) return;
      if (drift && !drag.on) { vx = lerp(vx, -0.35, .02); vy = lerp(vy, -0.2, .02); }
      if (!drag.on) { ox += vx; oy += vy; vx *= drift ? 1 : .94; vy *= drift ? 1 : .94; }
      const speed = Math.hypot(vx, vy);
      zoom = lerp(zoom, 1 - Math.min(speed * .006, .14), .08);
      inner.style.transform = `translate(${innerWidth / 2}px,${innerHeight / 2}px) scale(${zoom}) translate(${-innerWidth / 2}px,${-innerHeight / 2}px)`;
      const cx = innerWidth / 2, cy = innerHeight / 2;
      for (const t of tiles) {
        let x = ((t.c * (tw + gap) + ox) % W + W) % W - (tw + gap);
        let y = ((t.r * (th + gap) + oy + (t.c % 2 ? th * .5 : 0)) % H + H) % H - (th + gap);
        const dx = (x + tw / 2 - cx) / innerWidth, dy = (y + th / 2 - cy) / innerHeight;
        const s = 1 - Math.min(Math.hypot(dx, dy), .9) * .12;
        t.el.style.transform = `translate3d(${x}px,${y}px,0) scale(${s})`;
        if (!t.seen && x > -tw && x < innerWidth && y > -th && y < innerHeight) {
          t.seen = true;
          setTimeout(() => t.el.classList.add('seen'), 150 + Math.random() * 900);
        }
      }
      requestAnimationFrame(frame);
    }

    /* 拖拽 */
    const drag = { on: false, x: 0, y: 0, moved: 0, lx: 0, ly: 0 };
    addEventListener('pointerdown', e => {
      if (!live || e.button !== 0) return;
      if (e.target.closest('.hud, #viewer, #menu, .gal-counter, .gal-hint')) return;
      drag.on = true; drag.moved = 0; drag.x = drag.lx = e.clientX; drag.y = drag.ly = e.clientY;
      drift = false; vx = vy = 0;
      $('#cursor').classList.add('drag');
    });
    addEventListener('pointermove', e => {
      if (!drag.on) return;
      const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
      ox += dx; oy += dy; vx = dx; vy = dy;
      drag.lx = e.clientX; drag.ly = e.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
    });
    addEventListener('pointerup', e => {
      if (!drag.on) return;
      drag.on = false;
      $('#cursor').classList.remove('drag');
      if (drag.moved < 6) {
        const tileEl = document.elementsFromPoint(e.clientX, e.clientY).find(n => n.classList && n.classList.contains('tile'));
        if (tileEl) open(tiles.find(t => t.el === tileEl));
      }
      setTimeout(() => { if (!drag.on) drift = true; }, 2500);
    });
    addEventListener('wheel', e => {
      if (!live) return;
      drift = false;
      vx -= (e.deltaX || 0) * .08; vy -= e.deltaY * .08;
      clearTimeout(World._wt); World._wt = setTimeout(() => { drift = true; }, 2500);
    }, { passive: true });

    /* 调阅档案 */
    const viewed = new Set();
    let onView = () => {};
    function open(t) {
      const g = G[t.k];
      App.view(g.src, `
        <div class="vm-code">CIVITAI · IMAGE #${g.id}</div>
        <h3>@${g.user}</h3>
        <dl>
          <dt>SOURCE</dt><dd>civitai.com</dd>
          <dt>LIKES</dt><dd>♥ ${g.hearts.toLocaleString()}</dd>
          <dt>MODEL</dt><dd>Illustrious / NoobAI（SDXL 系）</dd>
          <dt>ARCHIVE</dt><dd>${String(t.k + 1).padStart(2, '0')} / ${G.length}</dd>
        </dl>
        <div class="vm-note">这张图是 AI 从一片<b style="color:var(--y)">随机噪声</b>中一步步“去噪”得到的。<br>作者做的事：写提示词、选模型、调参数、挑图。</div>`);
      tiles.filter(x => x.k === t.k).forEach(x => x.el.classList.add('viewed'));
      if (!viewed.has(t.k)) { viewed.add(t.k); onView(viewed.size); }
    }

    return {
      start() { if (!running) { running = true; requestAnimationFrame(frame); } },
      stop() { running = false; },
      set live(v) { live = v; },
      set onView(f) { onView = f; },
      get count() { return viewed.size; },
      boost(v) { vx = v; vy = v * .5; }
    };
  })();

  /* ---------- BOOT ---------- */
  const LOG = [
    ['> python launch.py --xformers', ''],
    ['> torch 2.x · CUDA:0 · VRAM 8 GB', 'ok'],
    ['> load checkpoint  anime_illustrious.safetensors', 'ok'],
    ['> load VAE ·························', 'ok'],
    ['> load CLIP text encoder ·············', 'ok'],
    ['> sampler Euler a · steps 20 · CFG 7.0', ''],
    ['> seed 20261027', ''],
    ['> latent 4×64×96 ← pure gaussian noise', ''],
    ['> awaiting operator input _', 'blink']
  ];
  let bootDone = false;
  App.register('s-boot', {
    enter() {
      App.noise.start(1);
      const log = $('#bootLog');
      log.innerHTML = '';
      LOG.forEach(([t, c], i) => setTimeout(() => {
        const line = document.createElement('div');
        line.innerHTML = t + (c === 'ok' ? ' <span class="ok">[ OK ]</span>' : '');
        log.appendChild(line);
      }, 250 + i * 260));
      const ticks = $('#holdTicks');
      if (!ticks.childElementCount) for (let i = 0; i < 20; i++) {
        const a = i / 20 * Math.PI * 2, l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', 100 + Math.cos(a) * 78); l.setAttribute('y1', 100 + Math.sin(a) * 78);
        l.setAttribute('x2', 100 + Math.cos(a) * 70); l.setAttribute('y2', 100 + Math.sin(a) * 70);
        ticks.appendChild(l);
      }
    },
    leave() { bootDone = true; App.noise.stop(); $('#world').style.filter = ''; }
  });

  (() => {
    const hold = $('#hold'), progEl = $('#holdProg'), stepEl = $('#bootStep');
    let p = 0, holding = false, raf = 0;
    const lines = () => $$('#holdTicks line');
    const start = () => {
      if (bootDone || App.cur !== 0) return;
      App.sfx.ensure();
      holding = true; hold.classList.add('holding');
      body.classList.add('world-on'); World.start();
      if (!raf) loop();
    };
    const end = () => { holding = false; hold.classList.remove('holding'); };
    let lastStep = -1;
    function loop() {
      p = clamp(p + (holding ? .011 : -.02), 0, 1);
      progEl.style.strokeDashoffset = 578 * (1 - p);
      const k = Math.floor(p * 20);
      lines().forEach((l, i) => l.classList.toggle('on', i < k));
      if (k !== lastStep && holding) { App.sfx.blip(300 + k * 40); lastStep = k; }
      const sigma = (14.61 * Math.pow(1 - p, 2.2)).toFixed(2);
      stepEl.textContent = `STEP ${String(k).padStart(2, '0')} / 20 · σ = ${sigma}`;
      App.noise.alpha = 1 - p * .85;
      $('#world').style.filter = `blur(${(1 - p) * 30}px) saturate(${p})`;
      if (p >= 1) { finish(); return; }
      if (p <= 0 && !holding) { raf = 0; body.classList.remove('world-on'); return; }
      raf = requestAnimationFrame(loop);
    }
    function finish() {
      bootDone = true; raf = 0;
      App.sfx.boom();
      App.noise.stop();
      $('#world').style.filter = '';
      World.boost(-40);
      App.go(1);
    }
    hold.addEventListener('pointerdown', start);
    addEventListener('pointerup', end);
    addEventListener('keydown', e => { if (e.key === ' ' && App.cur === 0) { e.preventDefault(); start(); } });
    addEventListener('keyup', e => { if (e.key === ' ') end(); });
  })();

  /* ---------- TITLE ---------- */
  App.register('s-title', {
    enter() { body.classList.add('world-on', 'world-dim'); body.classList.remove('world-gone'); World.start(); World.live = false; },
    leave() { body.classList.remove('world-dim'); }
  });

  /* ---------- GALLERY ---------- */
  let revealT = 0, revealed = false;
  const counter = $('#galCount'), reveal = $('#galReveal');
  function showReveal() {
    if (revealed) return;
    revealed = true;
    reveal.classList.add('on');
    App.sfx.chime();
    setTimeout(() => reveal.classList.remove('on'), 4200);
    App.pulseNext();
  }
  World.onView = n => {
    counter.textContent = String(n).padStart(2, '0');
    App.sfx.blip(700 + n * 20);
    if (n === 3) setTimeout(showReveal, 1800);
    if (n === 10) App.toast('★', 'ACHIEVEMENT', '资深鉴赏家 · 已调阅 10 份档案');
    if (n === 44) App.toast('★', 'ACHIEVEMENT', '全图鉴达成！');
  };
  App.register('s-gallery', {
    enter() {
      body.classList.add('world-on', 'gal-live'); body.classList.remove('world-dim', 'world-gone');
      World.start(); World.live = true;
      clearTimeout(revealT); revealT = setTimeout(showReveal, 16000);
    },
    leave() { body.classList.remove('gal-live'); World.live = false; clearTimeout(revealT); }
  });

  /* 离开第一章时关闭 world */
  document.addEventListener('scene', e => {
    const s = e.detail;
    if (s.dataset.ch === '1' || s.id === 's-boot') return;
    body.classList.remove('world-on', 'world-dim', 'gal-live');
    setTimeout(() => { if (!body.classList.contains('world-on')) World.stop(); }, 1500);
  });
  window.World = World;
})();
