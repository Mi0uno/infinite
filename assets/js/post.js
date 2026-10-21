/* ============================================================
   INFINITE — 文章页交互
   比首页少：没有下潜、没有生成层、没有深度读数。
   比首页多：一条阅读进度线，一个跟着读的目录。
   滚动里只写 transform，不碰布局。
   ============================================================ */

(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* ---------- 报头时钟 ---------- */
  const clock = document.getElementById('clock');
  if (clock) {
    const tick = () => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      clock.textContent = `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 对准标记 ---------- */
  const cross = document.getElementById('crosshair');
  const coords = document.getElementById('coords');

  if (cross && fine && !reduce) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;

    const loop = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cross.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
      raf = Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1
        ? requestAnimationFrame(loop)
        : null;
    };

    addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      coords.textContent = `${Math.round(tx)},${Math.round(ty)}`;
      cross.classList.add('is-live');
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    addEventListener('pointerleave', () => cross.classList.remove('is-live'));
  }

  /* ---------- 阅读进度 + 目录高亮 ----------
     两件事共用一次滚动计算：同一帧里读高度与 rect，
     读一次布局，写两次 transform。 */
  const bar = document.getElementById('bar');
  const heads = [...document.querySelectorAll('.prose > h2[id]')];

  const links = new Map();
  document.querySelectorAll('#toc a').forEach((a) => {
    const id = a.getAttribute('href').slice(1);
    if (id) links.set(id, a);
  });

  let cur = null;
  let queued = false;

  const measure = () => {
    queued = false;

    /* 进度 */
    if (bar) {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      bar.style.transform = `scaleX(${p.toFixed(4)})`;
    }

    /* 目录：最后一个顶部越过 150px 的章节算当前 */
    if (heads.length) {
      let found = null;
      for (const h of heads) {
        if (h.getBoundingClientRect().top <= 150) found = h;
        else break;
      }
      if (!found && scrollY < 200) found = heads[0];

      if (found !== cur) {
        if (cur && links.has(cur.id)) links.get(cur.id).classList.remove('is-cur');
        if (found && links.has(found.id)) links.get(found.id).classList.add('is-cur');
        cur = found;
      }
    }
  };

  const onScroll = () => {
    if (!queued) {
      queued = true;
      requestAnimationFrame(measure);
    }
  };

  measure();
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });
})();
