/* =========================================================
   CH4 · 遥的角色档案
   ========================================================= */
(() => {
  const T = DATA.themes;
  const src = n => `assets/works/${n}.jpg`;

  /* ---------- 档案页雷达图 ---------- */
  (() => {
    const svg = $('#radar'), C = 110, R = 80;
    const AX = [['元气', 88], ['优雅', 72], ['神秘', 64], ['可爱', 92], ['帅气', 68]];
    const pt = (i, r) => { const a = -Math.PI / 2 + i / AX.length * Math.PI * 2; return [C + Math.cos(a) * r, C + Math.sin(a) * r]; };
    let h = '';
    [1, .66, .33].forEach(s => h += `<polygon class="bg" points="${AX.map((_, i) => pt(i, R * s).join(',')).join(' ')}"/>`);
    AX.forEach((_, i) => { const [x, y] = pt(i, R); h += `<line x1="${C}" y1="${C}" x2="${x}" y2="${y}"/>`; });
    h += `<polygon class="val" points="${AX.map(([, v], i) => pt(i, R * v / 100).join(',')).join(' ')}"/>`;
    AX.forEach(([n, v], i) => { const [x, y] = pt(i, R + 20); h += `<text x="${x}" y="${y + 4}">${n}</text><text class="v" x="${x}" y="${y + 17}">${v}</text>`; });
    svg.innerHTML = h;
  })();

  /* ---------- 粒子特效 ---------- */
  const FX = (() => {
    const cv = $('#arcFx'), g = cv.getContext('2d');
    let W = 0, H = 0, ps = [], kind = '', raf = 0, running = false, t = 0;
    const R = (a, b) => a + Math.random() * (b - a);
    function resize() { const d = Math.min(devicePixelRatio || 1, 1.5); W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; }
    resize(); addEventListener('resize', resize);
    const COUNT = { petal: 46, bubble: 34, leaf: 32, snow: 120, lantern: 22, rose: 30, sparkle: 60, rain: 90, star: 160, steam: 18 };
    function spawn(k, init) {
      const p = { x: R(0, W), y: init ? R(0, H) : -40, s: R(.6, 1.4), r: R(0, 6.28), vr: R(-.03, .03), ph: R(0, 6.28) };
      if (k === 'bubble' || k === 'lantern' || k === 'steam') p.y = init ? R(0, H) : H + 40;
      if (k === 'rain') { p.y = init ? R(0, H) : -100; p.v = R(14, 22); p.c = Math.random() < .5 ? '#ff2bd6' : '#22f0ff'; }
      if (k === 'sparkle' || k === 'star') { p.y = R(0, H); p.life = R(0, 1); }
      return p;
    }
    function set(k) { kind = k; ps = Array.from({ length: COUNT[k] || 0 }, () => spawn(k, true)); }
    function drawP(p) {
      const s = p.s * Math.min(W, H) / 900;
      switch (kind) {
        case 'petal': case 'rose': {
          p.x += Math.sin(t * .02 + p.ph) * 1.2 + 1; p.y += 1.3 * p.s; p.r += p.vr;
          g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.scale(1, Math.abs(Math.sin(t * .03 + p.ph)) * .6 + .4);
          g.fillStyle = kind === 'petal' ? 'rgba(255,170,200,.85)' : 'rgba(170,10,40,.85)';
          g.beginPath(); g.ellipse(0, 0, 9 * s, 6 * s, 0, 0, 7); g.fill(); g.restore(); break;
        }
        case 'leaf': {
          p.x += Math.sin(t * .015 + p.ph) * 1.6; p.y += 1.1 * p.s + .4; p.r += p.vr * 1.5;
          g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = `hsla(${18 + p.ph * 4},90%,${45 + p.s * 10}%,.9)`;
          g.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283, rr = (i % 2 ? 5 : 13) * s; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.fill(); g.restore(); break;
        }
        case 'snow': {
          p.x += Math.sin(t * .01 + p.ph) * .6; p.y += .7 * p.s + .3;
          g.fillStyle = `rgba(255,255,255,${.5 + p.s * .3})`; g.beginPath(); g.arc(p.x, p.y, 2.6 * s * p.s, 0, 7); g.fill(); break;
        }
        case 'bubble': {
          p.y -= .9 * p.s; p.x += Math.sin(t * .02 + p.ph) * .5;
          g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.5; g.beginPath(); g.arc(p.x, p.y, 10 * s * p.s, 0, 7); g.stroke();
          g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(p.x - 3 * s, p.y - 3 * s, 2.5 * s, 0, 7); g.fill(); break;
        }
        case 'lantern': {
          p.y -= .45 * p.s; p.x += Math.sin(t * .008 + p.ph) * .4;
          const rr = 26 * s * p.s, gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
          gr.addColorStop(0, 'rgba(255,220,150,.95)'); gr.addColorStop(.25, 'rgba(255,120,60,.6)'); gr.addColorStop(1, 'rgba(255,60,40,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, rr, 0, 7); g.fill(); break;
        }
        case 'sparkle': case 'star': {
          p.life += kind === 'star' ? .006 : .012; if (p.life > 1) { Object.assign(p, spawn(kind, true)); p.life = 0; }
          const a = Math.sin(p.life * Math.PI), rr = (kind === 'star' ? 3 : 9) * s * p.s * a;
          g.fillStyle = kind === 'star' ? `rgba(255,240,200,${a})` : `rgba(255,255,255,${a})`;
          g.beginPath(); g.moveTo(p.x, p.y - rr * 2); g.quadraticCurveTo(p.x, p.y, p.x + rr * 2, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y + rr * 2); g.quadraticCurveTo(p.x, p.y, p.x - rr * 2, p.y); g.quadraticCurveTo(p.x, p.y, p.x, p.y - rr * 2); g.fill(); break;
        }
        case 'rain': {
          p.y += p.v; p.x -= p.v * .25;
          g.strokeStyle = p.c; g.globalAlpha = .55; g.lineWidth = 1.6; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + p.v * .5, p.y - p.v * 2.2); g.stroke(); g.globalAlpha = 1; break;
        }
        case 'steam': {
          p.y -= .5; p.x += Math.sin(t * .01 + p.ph) * .6;
          const rr = 60 * s * p.s, gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
          gr.addColorStop(0, 'rgba(255,255,255,.28)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, rr, 0, 7); g.fill(); break;
        }
      }
      const out = p.y > H + 60 || p.y < -80 || p.x > W + 60 || p.x < -60;
      if (out && kind !== 'sparkle' && kind !== 'star') Object.assign(p, spawn(kind, false));
    }
    let shoot = null;
    function loop() {
      if (!running) return;
      t++;
      g.clearRect(0, 0, W, H);
      ps.forEach(drawP);
      if (kind === 'star') {
        if (!shoot && Math.random() < .006) shoot = { x: R(W * .3, W), y: R(0, H * .4), l: 0 };
        if (shoot) {
          shoot.l += .03; const x = shoot.x - shoot.l * 500, y = shoot.y + shoot.l * 250;
          const gr = g.createLinearGradient(x, y, x + 140, y - 70); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.strokeStyle = gr; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 140, y - 70); g.stroke();
          if (shoot.l > 1) shoot = null;
        }
      }
      raf = requestAnimationFrame(loop);
    }
    return { set, start() { if (!running) { running = true; loop(); } }, stop() { running = false; cancelAnimationFrame(raf); } };
  })();

  /* ---------- 主题展厅 ---------- */
  const arc = $('#arc'), list = $('#arcList');
  const unlocked = new Set();
  let idx = -1, vi = 0, front = $('#arcImgA'), back = $('#arcImgB');
  T.forEach((t, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<span>${t.cn}</span><i>${t.no}</i>`;
    b.onclick = () => show(i);
    list.appendChild(b);
  });
  function swapArt(name) {
    back.src = src(name);
    back.classList.remove('out'); front.classList.add('out');
    [front, back] = [back, front];
  }
  function show(i, force) {
    if (i === idx && !force) return;
    i = (i + T.length) % T.length;
    const t = T[i];
    idx = i; vi = 0;
    arc.classList.add('arc-change');
    arc.classList.remove('glitch');
    const st = arc.style;
    st.setProperty('--c1', t.c1); st.setProperty('--c2', t.c2); st.setProperty('--ink', t.ink);
    t.c3 ? st.setProperty('--c3', t.c3) : st.removeProperty('--c3');
    arc.dataset.layout = t.layout; arc.dataset.mode = t.mode;
    document.body.classList.toggle('arc-light', t.mode === 'light');
    document.body.style.setProperty('--arc-ink', t.ink);
    $('#arcBgImg').src = src(t.imgs[0]);
    $('#arcNum').textContent = t.no;
    $('#arcSeason').textContent = t.season;
    $('#arcCn').textContent = t.cn;
    $('#arcEn').textContent = t.en;
    $('#arcTags').innerHTML = t.tags.map(x => `<span>${x}</span>`).join('');
    $('#arcNote').textContent = t.note;
    $('#arcDialog').dataset.note = t.layout === 'poster' ? t.note : '';
    $('#arcThumbs').innerHTML = t.imgs.map((n, j) => `<button class="${j ? '' : 'on'}" data-j="${j}"><img src="${src(n)}" alt=""></button>`).join('');
    $$('#arcThumbs button').forEach(b => b.onclick = e => { e.stopPropagation(); variant(+b.dataset.j); });
    swapArt(t.imgs[0]);
    $$('button', list).forEach((b, j) => b.classList.toggle('on', j === i));
    FX.set(t.fx);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      arc.classList.remove('arc-change');
      if (t.layout === 'hud') arc.classList.add('glitch');
    }));
    App.type($('#arcLine'), t.line, 38);
    App.sfx.whoosh();
    if (!unlocked.has(i)) {
      unlocked.add(i);
      $$('button', list)[i].classList.add('unl');
      const n = unlocked.size;
      $('#arcUnl').textContent = n;
      $('#arcBar').style.width = n * 10 + '%';
      if (n > 1) App.toast('◆', `ARCHIVE UNLOCKED · ${n}/10`, `${t.cn} · ${t.en}`);
      if (n === T.length) setTimeout(() => { App.sfx.chime(); App.toast('★', 'ACHIEVEMENT', '全档案解锁！遥的十套时装已集齐'); App.pulseNext(); }, 900);
    }
  }
  function variant(j) {
    const t = T[idx];
    vi = (j + t.imgs.length) % t.imgs.length;
    swapArt(t.imgs[vi]);
    $$('#arcThumbs button').forEach((b, k) => b.classList.toggle('on', k === vi));
    App.sfx.blip(720);
  }
  $('#arcArt').addEventListener('click', () => {
    const t = T[idx];
    App.view(src(t.imgs[vi]), `
      <div class="vm-code">YAO · ARCHIVE ${t.no} · ${vi + 1}/${t.imgs.length}</div>
      <h3>${t.cn}</h3>
      <dl><dt>THEME</dt><dd>${t.en}</dd><dt>SEASON</dt><dd>${t.season}</dd><dt>KEYWORDS</dt><dd>${t.tags.join(', ')}</dd></dl>
      <div class="vm-note">${t.note}</div>`);
  });
  $('#arcArt').dataset.cursor = 'ZOOM';
  arc.addEventListener('pointermove', e => {
    const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    $('.arc-art-in').style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
    $('#arcNum').style.translate = `${-x * 30}px ${-y * 20}px`;
  });
  let wheelLock = 0;
  arc.addEventListener('wheel', e => {
    const now = Date.now(); if (now - wheelLock < 650) return; wheelLock = now;
    show(idx + (e.deltaY > 0 ? 1 : -1));
  }, { passive: true });
  App.register('s-arc', {
    enter() {
      FX.start();
      show(idx < 0 ? 0 : idx, true);
      App.keyHook = e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); show(idx + 1); return true; }
        if (e.key === 'ArrowUp') { e.preventDefault(); show(idx - 1); return true; }
        return false;
      };
    },
    leave() { FX.stop(); App.keyHook = null; document.body.classList.remove('arc-light'); }
  });

  /* ---------- 3D 环形画廊 ---------- */
  (() => {
    const ring = $('#ring'), stage = $('#ringStage');
    const all = T.flatMap(t => t.imgs.map(n => ({ n, t })));
    const N = all.length;
    all.forEach(({ n, t }, i) => {
      const c = document.createElement('div');
      c.className = 'rc'; c.dataset.cursor = t.cn;
      c.innerHTML = `<img src="${src(n)}" alt="" loading="lazy">`;
      c.dataset.i = i;
      ring.appendChild(c);
    });
    const cards = $$('.rc', ring);
    let a = 0, v = .12, dragging = false, lx = 0, moved = 0, raf = 0;
    function layout() {
      const u = rem(), Rr = (11 * u + 1.4 * u) * N / (2 * Math.PI);
      cards.forEach((c, i) => c.style.transform = `rotateY(${i / N * 360}deg) translateZ(${Rr}px)`);
    }
    layout(); addEventListener('resize', layout);
    function loop() {
      if (!dragging) { a += v; v = lerp(v, .12, .02); }
      ring.style.transform = `rotateX(-6deg) rotateY(${a}deg)`;
      raf = requestAnimationFrame(loop);
    }
    stage.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; moved = 0; });
    addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lx; lx = e.clientX; a += dx * .18; v = dx * .18; moved += Math.abs(dx); });
    addEventListener('pointerup', e => {
      if (!dragging) return; dragging = false;
      if (moved < 5) {
        const c = e.target.closest && e.target.closest('.rc');
        if (c) { const { n, t } = all[+c.dataset.i]; App.view(src(n), `<div class="vm-code">YAO · ${t.no}</div><h3>${t.cn}</h3><dl><dt>THEME</dt><dd>${t.en}</dd></dl><div class="vm-note">${t.line}</div>`); }
      }
    });
    App.register('s-ring', { enter() { cancelAnimationFrame(raf); v = 3; loop(); }, leave() { cancelAnimationFrame(raf); } });
  })();
})();
