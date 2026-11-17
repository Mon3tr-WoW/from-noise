/* =========================================================
   CH5 · 思考与展望
   ========================================================= */
(() => {
  /* ---------- 硬币两面：拖拽分割线 ---------- */
  (() => {
    const box = $('#sides'), handle = $('#sdHandle');
    let drag = false, anim = 0;
    const setX = p => box.style.setProperty('--x', clamp(p, 4, 96) + '%');
    handle.dataset.cursor = 'DRAG';
    handle.addEventListener('pointerdown', e => { drag = true; cancelAnimationFrame(anim); e.preventDefault(); });
    addEventListener('pointermove', e => { if (drag) setX(e.clientX / innerWidth * 100); });
    addEventListener('pointerup', () => { drag = false; });
    box.addEventListener('click', e => { if (e.target.closest('#sdHandle')) return; tween(e.clientX / innerWidth * 100); });
    function tween(to, dur = 900) {
      cancelAnimationFrame(anim);
      const from = parseFloat(box.style.getPropertyValue('--x')) || 50, t0 = performance.now();
      const fr = now => { const p = clamp((now - t0) / dur, 0, 1); setX(lerp(from, to, 1 - (1 - p) ** 3)); if (p < 1) anim = requestAnimationFrame(fr); };
      anim = requestAnimationFrame(fr);
      App.sfx.whoosh();
    }
    App.register('s-sides', {
      enter() { document.body.classList.add('sides-on'); setX(96); setTimeout(() => tween(50, 1600), 900); },
      leave() { document.body.classList.remove('sides-on'); cancelAnimationFrame(anim); }
    });
  })();

  /* ---------- 观点卡片翻面 ---------- */
  $$('#voices .vc').forEach(c => c.addEventListener('click', () => {
    c.classList.toggle('flip');
    App.sfx.blip(c.classList.contains('flip') ? 620 : 420);
    if ($$('#voices .vc.flip').length === 4) App.pulseNext();
  }));
  App.register('s-voices', { enter() { $$('#voices .vc').forEach(c => c.classList.remove('flip')); } });

  /* ---------- 判例时间线 ---------- */
  $$('#tl .tn').forEach(n => n.addEventListener('click', () => {
    n.classList.toggle('open');
    App.sfx.blip(n.classList.contains('open') ? 700 : 400);
  }));
  App.register('s-law', {
    enter() {
      const ns = $$('#tl .tn');
      ns.forEach(n => n.classList.remove('open'));
      ns.forEach((n, i) => setTimeout(() => { if (App.scenes[App.cur].id === 's-law') { n.classList.add('open'); App.sfx.tick(); } }, 1400 + i * 700));
    }
  });

  /* ---------- 情景选择 ---------- */
  $$('#choices .cq').forEach(q => $$('button', q).forEach(b => b.addEventListener('click', () => {
    $$('button', q).forEach(x => x.classList.remove('pick'));
    b.classList.add('pick');
    App.sfx.blip(b.dataset.r === 'g' ? 880 : b.dataset.r === 'y' ? 600 : 260);
    if ($$('#choices .pick').length === 2) App.pulseNext();
  })));
  App.register('s-choice', { enter() { $$('#choices .pick').forEach(b => b.classList.remove('pick')); } });

  /* ---------- 尾声：回到噪声 ---------- */
  (() => {
    const col = $('#endCollage'), end = $('#s-end');
    const imgs = DATA.themes.flatMap(t => t.imgs);
    const pool = [...imgs, ...DATA.gallery.slice(0, 14).map(g => g.src)];
    for (let i = 0; i < 28; i++) {
      const im = document.createElement('img');
      const s = pool[(i * 7) % pool.length];
      im.src = s.startsWith('assets') ? s : `assets/works/${s}.jpg`;
      im.loading = 'lazy';
      col.appendChild(im);
    }
    let t1 = 0;
    App.register('s-end', {
      enter() {
        end.classList.remove('dissolve');
        App.noise.start(0);
        App.noise.alpha = .0;
        clearTimeout(t1);
        t1 = setTimeout(() => {
          end.classList.add('dissolve');
          const t0 = performance.now();
          const fr = now => { const p = clamp((now - t0) / 6000, 0, 1); App.noise.alpha = p * .35; if (p < 1 && App.scenes[App.cur].id === 's-end') requestAnimationFrame(fr); };
          requestAnimationFrame(fr);
        }, 2500);
      },
      leave() { clearTimeout(t1); App.noise.stop(); end.classList.remove('dissolve'); }
    });
  })();
})();
