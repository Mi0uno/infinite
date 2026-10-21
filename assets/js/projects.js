/* ==========================================================
   INFINITE — 项目页脚本
   时钟 / 网格显影 / 十字准星 / 状态 + 栈筛选 / 搜索 / 分页
   ========================================================== */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pending = 0;

  /* ---------- 报头时钟 ---------- */

  var clock = document.getElementById('clock');
  if (clock) {
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var tick = function () {
      var d = new Date();
      clock.textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 十字准星 ---------- */

  var cross = document.getElementById('crosshair');
  var coords = document.getElementById('coords');
  var fine = window.matchMedia('(pointer: fine)').matches;

  if (cross && coords && fine && !reduce) {
    var tx = 0, ty = 0, cx = 0, cy = 0, live = false;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!live) {
        live = true;
        cx = tx;
        cy = ty;
        cross.classList.add('is-live');
      }
      coords.textContent = Math.round(e.clientX) + ',' + Math.round(e.clientY);
    }, { passive: true });

    window.addEventListener('pointerleave', function () {
      live = false;
      cross.classList.remove('is-live');
    });

    (function loop() {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cross.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- 筛选 / 搜索 / 分页 ----------
     三条条件是 AND。每页三块：六件东西分两页，翻页才有点意义。 */

  var PER = 3;

  var listEl = document.getElementById('list');
  var pagerEl = document.getElementById('pager');
  var qEl = document.getElementById('pq');

  var pool = listEl ? [].slice.call(listEl.querySelectorAll('.item')).map(function (el) {
    return {
      el: el,
      state: el.getAttribute('data-state') || '',
      stack: el.getAttribute('data-stack') || '',
      /* 整块文字都进索引：名称、一句话、说明、栈、状态 */
      text: (el.textContent || '').replace(/\s+/g, ' ').toLowerCase()
    };
  }) : [];

  var GROUPS = [
    {
      el: document.getElementById('sfilter'),
      key: 'state',
      labels: { live: '还在跑', half: '半死', off: '停了' }
    },
    {
      el: document.getElementById('tfilter'),
      key: 'stack',
      labels: { c: 'C', python: 'Python', js: 'JS', go: 'Go', shell: 'Shell' }
    }
  ];

  var mode = { state: 'all', stack: 'all', q: '', page: 1 };
  var hits = [];
  var touched = false;

  var mk = function (tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  var emptyEl = mk('div', 'pj-empty');
  emptyEl.hidden = true;
  if (listEl) listEl.parentNode.insertBefore(emptyEl, listEl.nextSibling);

  var hitOf = function (it) {
    if (mode.state !== 'all' && it.state !== mode.state) return false;
    if (mode.stack !== 'all' && it.stack !== mode.stack) return false;
    if (mode.q && it.text.indexOf(mode.q) < 0) return false;
    return true;
  };

  var showAll = function () {
    pending = 0;
    pool.forEach(function (it) { it.el.classList.add('reveal', 'is-in'); });
  };

  var go = function (n) {
    mode.page = n;
    touched = true;
    render();
  };

  var drawPager = function (pages, total, from, count) {
    if (!pagerEl) return;
    pagerEl.innerHTML = '';

    /* 一条都没有时不摆页码 —— 空结果页上挂一个孤零零亮着的 01 很怪 */
    if (!total) {
      pagerEl.appendChild(mk('span', 'pj-pgmeta', '0 个项目'));
      return;
    }

    var prev = mk('button', 'pj-pg', '← 上一页');
    prev.type = 'button';
    prev.disabled = mode.page <= 1;
    prev.addEventListener('click', function () { go(mode.page - 1); });
    pagerEl.appendChild(prev);

    var marks = [];
    for (var i = 1; i <= pages; i++) {
      if (pages <= 7 || i === 1 || i === pages || Math.abs(i - mode.page) <= 1) marks.push(i);
      else if (marks[marks.length - 1] !== '…') marks.push('…');
    }

    marks.forEach(function (m) {
      if (m === '…') {
        var sp = mk('span', 'pj-pgmeta', '…');
        sp.style.marginLeft = '0';
        pagerEl.appendChild(sp);
        return;
      }
      var b = mk('button', 'pj-pg' + (m === mode.page ? ' is-cur' : ''), m < 10 ? '0' + m : '' + m);
      b.type = 'button';
      if (m === mode.page) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', function () { go(m); });
      pagerEl.appendChild(b);
    });

    var next = mk('button', 'pj-pg', '下一页 →');
    next.type = 'button';
    next.disabled = mode.page >= pages;
    next.addEventListener('click', function () { go(mode.page + 1); });
    pagerEl.appendChild(next);

    pagerEl.appendChild(mk('span', 'pj-pgmeta',
      (from + 1) + '—' + (from + count) + ' / ' + total + ' 个项目 · ' + mode.page + '/' + pages + ' 页'));
  };

  var render = function () {
    hits = pool.filter(hitOf);

    var total = hits.length;
    var pages = Math.max(1, Math.ceil(total / PER));
    if (mode.page > pages) mode.page = pages;

    var from = (mode.page - 1) * PER;
    var slice = hits.slice(from, from + PER);

    pool.forEach(function (it) { it.el.hidden = slice.indexOf(it) < 0; });

    if (!total) {
      emptyEl.innerHTML = '';
      emptyEl.appendChild(mk('p', '', '没有匹配的项目。'));
      if (mode.q) {
        var p = mk('p', '', '关键词「');
        p.appendChild(mk('b', '', mode.q));
        p.appendChild(document.createTextNode('」'));
        emptyEl.appendChild(p);
      }
      var rb = mk('button', 'pj-reset', '清掉条件');
      rb.type = 'button';
      rb.addEventListener('click', reset);
      emptyEl.appendChild(rb);
      emptyEl.hidden = false;
    } else {
      emptyEl.hidden = true;
    }

    drawPager(pages, total, from, slice.length);

    if (touched) showAll();
  };

  var reset = function () {
    mode.state = 'all';
    mode.stack = 'all';
    mode.q = '';
    mode.page = 1;
    if (qEl) qEl.value = '';
    touched = true;

    GROUPS.forEach(function (g) {
      if (!g.el) return;
      [].slice.call(g.el.querySelectorAll('button')).forEach(function (b) {
        var on = b.getAttribute('data-' + g.key) === 'all';
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });

    render();
  };

  /* 按钮从数据里长出来：将来加一件 Go 的东西，栈那排自己多一个按钮 */
  GROUPS.forEach(function (g) {
    if (!g.el) return;
    g.el.innerHTML = '';

    var all = mk('button', 'is-on', '全部');
    all.type = 'button';
    all.setAttribute('data-' + g.key, 'all');
    all.setAttribute('aria-pressed', 'true');
    g.el.appendChild(all);

    var seen = {};
    pool.forEach(function (it) { seen[it[g.key]] = true; });

    Object.keys(g.labels).forEach(function (k) {
      if (!seen[k]) return;
      var b = mk('button', '', g.labels[k]);
      b.type = 'button';
      b.setAttribute('data-' + g.key, k);
      b.setAttribute('aria-pressed', 'false');
      g.el.appendChild(b);
    });

    g.el.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || !g.el.contains(btn)) return;
      var v = btn.getAttribute('data-' + g.key);
      if (!v || mode[g.key] === v) return;

      mode[g.key] = v;
      mode.page = 1;
      touched = true;

      [].slice.call(g.el.querySelectorAll('button')).forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });

      render();
    });
  });

  /* 搜索：130ms 防抖，别每敲一个字母重排一次 */
  if (qEl) {
    var qtimer = 0;
    qEl.addEventListener('input', function () {
      var v = qEl.value.trim().toLowerCase();
      clearTimeout(qtimer);
      qtimer = setTimeout(function () {
        if (mode.q === v) return;
        mode.q = v;
        mode.page = 1;
        touched = true;
        render();
      }, 130);
    });

    qEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        qEl.value = '';
        qEl.blur();
        if (mode.q) {
          mode.q = '';
          mode.page = 1;
          touched = true;
          render();
        }
      }
    });
  }

  window.addEventListener('keydown', function (e) {
    if (e.key !== '/' || !qEl) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    e.preventDefault();
    qEl.focus();
  });

  render();

  /* ---------- 逐块显影 ----------
     不用 IntersectionObserver：几块东西，在滚动循环里读一次 rect 就够。
     一旦动过筛选，后面的内容直接显现 —— 翻页时再来一次淡入只会让人等。 */

  var items = pool.filter(function (it) { return !it.el.hidden; }).map(function (it) { return it.el; });

  if (!reduce && items.length) {
    items.forEach(function (el) {
      el.classList.add('reveal');
      pending++;
    });

    var check = function () {
      if (!pending) return;
      var line = window.innerHeight * 0.94;
      for (var i = 0; i < items.length; i++) {
        var el = items[i];
        if (el.classList.contains('is-in')) continue;
        var r = el.getBoundingClientRect();
        if (r.top < line && r.bottom > 0) {
          el.classList.add('is-in');
          pending--;
        }
      }
    };

    var queued = false;
    var onScroll = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        check();
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    check();
  }

})();
