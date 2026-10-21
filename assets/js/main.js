/* ============================================================
   INFINITE — 交互层
   一个 rAF 循环管所有随滚动变化的东西：
   纸的深度、暗角、刻度、读数、首屏视差。
   除了追加节点，全程不碰布局。
   ============================================================ */

(() => {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const root = document.documentElement;

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
    let hot = null;

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
      coords.textContent = ('000' + Math.round(tx)).slice(-4) + ' ' + ('000' + Math.round(ty)).slice(-4);
      var t = e.target;
      var hit = t && t.closest ? t.closest('a,button,input,select,textarea,label,summary') : null;
      if (hit !== hot) {
        hot = hit;
        cross.classList.toggle('is-hot', !!hit);
      }
      cross.classList.add('is-live');
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });

    addEventListener('pointerleave', () => cross.classList.remove('is-live'));
  }

  /* ---------- 让字轻微没对准 ----------
     每一处偏移一次性生成，刷新即变。
     这是排版事故的模拟，不是动画。 */
  const nudge = (el, max) => {
    if (!el) return;
    el.style.transform = `translateY(${(Math.random() * max).toFixed(2)}px)`;
  };

  document.querySelectorAll('.e-zh').forEach((el, i) => {
    if (i % 3 === 0) nudge(el, 0.9);
  });
  document.querySelectorAll('.e-num').forEach((el, i) => {
    if (i % 4 === 1) el.style.transform = `translateX(${(Math.random() * 0.8).toFixed(2)}px)`;
  });

  /* ---------- 滚动进入（只给静态部分） ----------
     不用 IntersectionObserver：整页只观察六七个块，
     在滚动循环里读一次 rect 就够，时机可控，
     也不会在某些内嵌浏览器里留一页白纸。 */
  const statics = [...document.querySelectorAll(
    '.intro-grid, .sec-head, .slot-pull, .slot-now, .col-head, .col-grid'
  )].map((el) => ({ el, seen: false }));

  let pending = 0;

  if (!reduce) {
    statics.forEach((item) => {
      item.el.classList.add('reveal');
      pending++;
    });
  }

  const revealCheck = () => {
    if (!pending) return;
    const vh = window.innerHeight;
    /* 底边上收 6%，露出来才算数 */
    const line = vh - vh * 0.06;

    for (const item of statics) {
      if (item.seen) continue;
      const r = item.el.getBoundingClientRect();
      if (r.top < line && r.bottom > 0) {
        item.seen = true;
        pending--;
        item.el.classList.add('is-in');
      }
    }
  };

  /* ============================================================
     无限下潜
     ============================================================ */

  const stream = document.getElementById('stream');
  const sentinel = document.getElementById('sentinel');
  const countEl = document.getElementById('count');
  const loadedEl = document.getElementById('loaded');

  /* 越往下，能写出来的字越少。这些都是真的没写，不是编的。 */
  const LV1 = [
    '还没写', '只有标题', '写到一半', '删了', '不适合放出来',
    '存在别处', '待验证', '已归档，不公开', '忘了', '下次再说',
    '记在纸上，纸丢了', '需要一台已经不存在的机器', '复现不了',
    '当时没截图', '只有一段日志', '结论推翻了三次',
    '改到第四版', '对方不让写', '等一个补丁', '等一个道歉'
  ];

  const LV2 = [
    '空', '待补', '未成文', '暂缺', '—', '无正文',
    '只有编号', '打开是空页', '草稿', '搁下'
  ];

  const TAGS = ['逆向', '攻防', '开发', '运维', '协议', '固件', '随笔', '日常', '自述'];

  const MARKS = [
    '以下尚未写',
    '深度在增加，内容在减少',
    '再往下只有编号',
    '这里开始变淡',
    '你还在往下',
    '纸还够',
    '这一段没有正文',
    '继续，没有底'
  ];

  const MAX_GEN = 620;
  const BATCH = 12;

  let seq = 11;            /* 当前编号 */
  let genCount = 0;
  let batchNo = 0;
  let cursorDate = new Date(2024, 10, 15); /* 2024.11.15，往前倒 */
  let exhausted = false;

  const pad3 = (n) => String(n).padStart(3, '0');
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  const stampDate = () => {
    /* 编号越大，时间越早 —— 索引是往回翻的 */
    cursorDate = new Date(cursorDate.getTime() - (3 + ((Math.random() * 9) | 0)) * 864e5);
    const y = cursorDate.getFullYear();
    const m = String(cursorDate.getMonth() + 1).padStart(2, '0');
    const d = String(cursorDate.getDate()).padStart(2, '0');
    return `${y}.${m}.${d}`;
  };

  const makeEntry = (lv) => {
    const el = document.createElement('article');
    el.className = `entry is-gen ${lv}`;

    const a = document.createElement('a');
    a.className = 'entry-link';
    a.href = '#';
    a.setAttribute('aria-disabled', 'true');
    /* 空条目不参与跳转 */
    a.addEventListener('click', (ev) => ev.preventDefault());

    const num = document.createElement('span');
    num.className = 'gen-num';
    num.textContent = pad3(seq);

    const text = document.createElement('span');
    text.className = 'gen-text';
    text.textContent = lv === 'lv3' ? '空' : lv === 'lv2' ? pick(LV2) : pick(LV1);

    const tag = document.createElement('span');
    tag.className = 'gen-meta';
    tag.textContent = lv === 'lv3' ? '' : pick(TAGS);

    const date = document.createElement('span');
    date.className = 'gen-meta';
    date.textContent = lv === 'lv3' ? '' : stampDate();

    const len = document.createElement('span');
    len.className = 'gen-meta';
    len.textContent = '';

    a.append(num, text, tag, date, len);
    el.append(a);

    seq++;
    genCount++;
    return el;
  };

  const makeMark = () => {
    const el = document.createElement('div');
    el.className = 'gen-mark';
    const b = document.createElement('b');
    b.textContent = `DEPTH ${String(batchNo).padStart(2, '0')}`;
    const s = document.createElement('span');
    s.textContent = pick(MARKS);
    el.append(b, s);
    return el;
  };

  /* 三层衰减：还留着形状 → 只剩一句话 → 只剩编号 */
  const levelOf = (b) => (b < 2 ? 'lv1' : b < 5 ? 'lv2' : 'lv3');

  const appendBatch = () => {
    if (exhausted) return;

    const frag = document.createDocumentFragment();
    const lv = levelOf(batchNo);

    for (let i = 0; i < BATCH; i++) {
      /* 深层偶尔回光返照，多一句能读的话 */
      const cur = lv === 'lv3' && Math.random() < 0.18 ? 'lv2' : lv;
      frag.append(makeEntry(cur));
    }

    if (batchNo > 0 && batchNo % 3 === 0) frag.append(makeMark());

    stream.append(frag);

    batchNo++;

    const shown = 10 + genCount;
    if (countEl) {
      countEl.textContent = genCount
        ? `${shown} 条，其中 2 条已封存`
        : '10 条，其中 2 条已封存';
    }
    if (loadedEl) loadedEl.textContent = String(shown);

    if (genCount >= MAX_GEN) {
      exhausted = true;
      if (sentinel) {
        const label = sentinel.querySelector('.ss-label');
        if (label) label.textContent = '这一册到此为止，下一册还没印';
      }
    }
  };

  /* 追加靠位置轮询，不靠 IntersectionObserver。
     每追加一批，观察目标自己就往下走了；
     直接读一次 rect 反而时机可控，也不怕老引擎。 */
  let filling = false;

  const sentinelNear = () => {
    if (!sentinel) return false;
    return sentinel.getBoundingClientRect().top < window.innerHeight + 900;
  };

  const fill = () => {
    if (filling || exhausted || !stream) return;
    filling = true;
    const t0 = performance.now();

    const step = () => {
      /* 单次最多填 240ms，不把长任务压在滚动上 */
      if (exhausted || performance.now() - t0 > 240 || !sentinelNear()) {
        filling = false;
        return;
      }
      appendBatch();
      requestAnimationFrame(step);
    };

    step();
  };

  /* ============================================================
     深度：一个 rAF 循环，只写 opacity / transform
     ============================================================ */

  const wash = document.getElementById('wash');
  const vignette = document.getElementById('vignette');
  const depthEl = document.getElementById('depth');
  const hsMark = document.getElementById('hsMark');
  const scale = document.querySelector('.hud-scale');
  const readout = document.querySelector('.hud-read');
  const toTop = document.getElementById('toTop');
  const issueEl = document.getElementById('issue');
  const pars = [...document.querySelectorAll('[data-par]')];
  const heroInf = document.querySelector('.hero-inf');

  let lastY = -1;
  let ticking = false;
  let shownDepth = -1;
  let shownIssue = -1;
  let hudOn = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(frame);
  };

  function frame() {
    ticking = false;
    const y = window.scrollY || root.scrollTop || 0;
    if (y === lastY) return;
    lastY = y;

    /* 衰减曲线：越往下越接近饱和，永远差一点点不到 1。
       6500 这个常数决定"多快沉下去"：三屏可见，十屏明显。 */
    const d = 1 - Math.exp(-y / 6500);

    /* 纸被墨浸进去，视口收拢成隧道 */
    const wa = d * 0.45;
    if (wash) wash.style.opacity = wa.toFixed(3);
    if (vignette) vignette.style.opacity = Math.min(1, d * 1.45).toFixed(3);

    /* 按钮底色跟着纸一起沉：#ECEBE7 与 #191710 在同一层混出来的那个灰。
       不这么做的话，深下去之后右下角会浮着一块新纸。 */
    if (toTop) {
      toTop.style.setProperty('--hud-bg', 'rgb(' +
        Math.round(236 - 211 * wa) + ',' +
        Math.round(235 - 212 * wa) + ',' +
        Math.round(231 - 215 * wa) + ')');
    }

    /* 仪表：滚过一屏才亮起来 */
    if (!hudOn && y > 260) {
      hudOn = true;
      scale && scale.classList.add('is-on');
      readout && readout.classList.add('is-on');
      toTop && toTop.classList.add('is-on');
    } else if (hudOn && y <= 260) {
      hudOn = false;
      scale && scale.classList.remove('is-on');
      readout && readout.classList.remove('is-on');
      toTop && toTop.classList.remove('is-on');
    }

    /* 读数：每 120px 记一米 */
    const m = Math.round(y / 120);
    if (m !== shownDepth) {
      shownDepth = m;
      if (depthEl) depthEl.textContent = String(m).padStart(4, '0');
    }

    /* 刻度标记沿轨道下滑 */
    if (hsMark && scale) {
      const p = 1 - Math.exp(-y / 9000);
      hsMark.style.transform = `translateY(${(p * scale.clientHeight).toFixed(1)}px)`;
    }

    /* 期号随深度递增：你在往下，刊在往上 */
    const issue = 7 + Math.floor(y / 3400);
    if (issue !== shownIssue && issueEl && issue < 100) {
      shownIssue = issue;
      issueEl.textContent = `ISSUE ${String(issue).padStart(2, '0')}`;
    }

    /* 首屏视差：滚得越远，标题退得越慢，于是沉下去 */
    if (!reduce && pars.length) {
      const lim = window.innerHeight * 1.35;
      if (y < lim) {
        const f = 1 - y / lim;
        for (const el of pars) {
          const rate = parseFloat(el.dataset.par) || 0.1;
          el.style.transform = `translate3d(0, ${(y * rate).toFixed(2)}px, 0)`;
        }
        const hero = pars[0] && pars[0].closest('.hero-grid');
        if (hero) hero.style.opacity = f.toFixed(3);
        /* 底色那个记号散得比字快，于是看起来在更远的地方 */
        if (heroInf) heroInf.style.opacity = (f * f).toFixed(3);
      }
    }
    /* 视口靠到底部的哨兵，就把流续上 */
    if (!filling && sentinelNear()) fill();

    /* 静态块露头就显影 */
    revealCheck();
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { lastY = -1; onScroll(); }, { passive: true });

  /* 首帧跑一次，处理刷新后停在中间的深链 */
  frame();

  /* ---------- 回到表面 ---------- */
  if (toTop) {
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    });
  }

})();

/* ============================================================
   鼠标：首屏那张底稿跟着手走
   三组各走各的速率（写在 CSS 里），这里只负责把归一化坐标
   送进 --mx / --my，剩下交给 calc()。准星是反着走的。
   ============================================================ */

(() => {
  const inf = document.querySelector('.hero-inf');
  if (!inf) return;

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (calm || !fine) return;

  let tx = 0;         // 目标
  let ty = 0;
  let cx = 0;         // 现在
  let cy = 0;
  let wx = 9;         // 上一次写进去的，省得过早写重复值
  let wy = 9;
  let running = false;

  const step = () => {
    cx += (tx - cx) * 0.075;
    cy += (ty - cy) * 0.075;

    if (Math.abs(cx - wx) > 0.0015 || Math.abs(cy - wy) > 0.0015) {
      wx = cx;
      wy = cy;
      inf.style.setProperty('--mx', cx.toFixed(4));
      inf.style.setProperty('--my', cy.toFixed(4));
      inf.style.setProperty('--deg', (cx * 2.6).toFixed(3) + 'deg');
    }

    /* 追上了就停，别空转 */
    if (Math.abs(tx - cx) > 0.0012 || Math.abs(ty - cy) > 0.0012) {
      requestAnimationFrame(step);
    } else {
      running = false;
    }
  };

  const kick = () => {
    if (running) return;
    running = true;
    requestAnimationFrame(step);
  };

  addEventListener('pointermove', (e) => {
    /* 滚过首屏之后这张图就看不见了，没必要再算 */
    if (scrollY > innerHeight * 1.2) return;
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
    kick();
  }, { passive: true });

  /* 指针离开窗口，回中 */
  document.documentElement.addEventListener('mouseleave', () => {
    tx = 0;
    ty = 0;
    kick();
  });
})();

/* ============================================================
   信号不好
   不是闪一下，也不是整块变色——字自己错开、重影、亮度抖。
   两层伪元素复制同一段文本（只能走 data 属性），各切一条横带往反方
   向挪。切片位置每次现掷，所以同一个字两次坏得不一样。

   池子是全页的：标题、导语、条目名、当下清单、版权页。
   只在首屏抖就成了一个孤立的效果，而信号衰减是整页的事。
   ============================================================ */

(() => {
  const POOL = [
    '.hero-title .ln',
    '.sec-head h2',
    '.e-title',
    '.e-tag',
    '.e-num',
    '.now-list dd',
    '.col-grid dd',
    '.mh-brand'
  ];

  /* 判断一段文字占几行。伪元素复制出来的永远是单行（white-space: pre），
     多行段落被复制后会变成一条长条，错位时和原字完全对不上——所以
     只收单行的。 */
  const lineCount = (el) => {
    const r = document.createRange();
    r.selectNodeContents(el);
    const rects = [...r.getClientRects()].filter((x) => x.width > 0 && x.height > 0);
    if (rects.length < 2) return rects.length || 1;
    const tops = new Set(rects.map((x) => Math.round(x.top)));
    return tops.size;
  };

  const els = [];
  POOL.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      /* 带内部标记的跳过：伪元素只能读到纯文本，
         复制出来会丢掉那些标记的样式，反而露馅。 */
      if (sel !== '.hero-title .ln' && el.querySelector('br, span, cite, em, b, i, a, code')) return;
      const t = el.textContent.trim();
      if (!t || t.length > 40) return;
      if (lineCount(el) > 1) return;
      el.dataset.gl = t;
      el.classList.add('gl');
      els.push(el);
    });
  });

  if (els.length < 3) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rnd = (a, b) => a + Math.random() * (b - a);

  /* 四帧五个参数：横移、斜切、影子错开量。每次现掷，
     同一个字两次坏得不一样。 */
  const seed = (el) => {
    for (let i = 1; i <= 5; i++) {
      el.style.setProperty('--x' + i, rnd(-.026, .026).toFixed(4) + 'em');
      el.style.setProperty('--k' + i, rnd(-1.1, 1.1).toFixed(2) + 'deg');
      el.style.setProperty('--s' + i, rnd(.012, .042).toFixed(4) + 'em');
    }
  };

  const glitch = (el, ms) => {
    if (el.classList.contains('is-gl')) return;
    seed(el);
    el.classList.add('is-gl');
    setTimeout(() => el.classList.remove('is-gl'), ms);
  };

  const tick = () => {
    if (document.hidden) {
      setTimeout(tick, 2000);
      return;
    }

    const el = els[Math.floor(Math.random() * els.length)];
    glitch(el, 460 + Math.random() * 320);

    /* 三成机会别处再掉一段——干扰不会只挑一个地方 */
    if (Math.random() < 0.34) {
      setTimeout(() => {
        const other = els[Math.floor(Math.random() * els.length)];
        glitch(other, 260 + Math.random() * 280);
      }, 180 + Math.random() * 300);
    }

    setTimeout(tick, 820 + Math.random() * 2100);
  };

  setTimeout(tick, 900);
})();
