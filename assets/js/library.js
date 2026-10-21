/* ==========================================================
   INFINITE — 知识库脚本
   时钟 / 网格显影 / 十字准星 / 分类 + 状态 + 搜索
   ========================================================== */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ---------- 网格显影 ---------- */

  var overlay = document.getElementById('overlay');
  var gridBtn = document.getElementById('gridBtn');

  var setGrid = function (on) {
    if (!overlay || !gridBtn) return;
    overlay.classList.toggle('is-on', on);
    gridBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
  };

  if (gridBtn) {
    gridBtn.addEventListener('click', function () {
      setGrid(!overlay.classList.contains('is-on'));
    });
  }

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    setGrid(!overlay.classList.contains('is-on'));
  });

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

  /* ---------- 筛选 / 搜索 / 分页 ---------- */

  var gridEl = document.getElementById('grid');
  var kindList = document.getElementById('kindList');
  var fieldList = document.getElementById('fieldList');
  var stateList = document.getElementById('stateList');
  var qEl = document.getElementById('q');
  var crumb = document.getElementById('crumb');
  var countEl = document.getElementById('count');
  var pagerEl = document.getElementById('pager');
  var emptyEl = document.getElementById('empty');
  var emptyQ = document.getElementById('emptyq');
  var resetEl = document.getElementById('reset');

  if (gridEl && kindList && fieldList && stateList) {
    var PER = 6;

    var items = Array.prototype.map.call(
      gridEl.querySelectorAll('.kc-item'),
      function (el) {
        return {
          el: el,
          kind: el.getAttribute('data-kind') || '',
          field: el.getAttribute('data-field') || '',
          state: el.getAttribute('data-state') || '',
          text: (el.getAttribute('data-text') || '').toLowerCase()
        };
      }
    );

    var kind = '全部';
    var field = '全部';
    var state = '全部';
    var kw = '';
    var page = 1;

    var wordOf = function (list, val) {
      var input = list.querySelector('input[value="' + val + '"]');
      var label = input && input.nextElementSibling;
      var span = label && label.querySelector('span');
      return span ? span.textContent.trim() : '全部';
    };

    var mk = function (tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    };

    var drawPager = function (pages, total, from) {
      pagerEl.innerHTML = '';

      if (!total) {
        pagerEl.appendChild(mk('span', 'kb-pgmeta', '0 条'));
        return;
      }

      var prev = mk('button', 'kb-pg', '← 上一页');
      prev.type = 'button';
      prev.setAttribute('data-go', 'prev');
      prev.disabled = page <= 1;
      pagerEl.appendChild(prev);

      for (var i = 1; i <= pages; i++) {
        var b = mk('button', 'kb-pg', i < 10 ? '0' + i : '' + i);
        b.type = 'button';
        b.setAttribute('data-go', String(i));
        if (i === page) {
          b.classList.add('is-cur');
          b.setAttribute('aria-current', 'page');
        }
        pagerEl.appendChild(b);
      }

      var next = mk('button', 'kb-pg', '下一页 →');
      next.type = 'button';
      next.setAttribute('data-go', 'next');
      next.disabled = page >= pages;
      pagerEl.appendChild(next);

      pagerEl.appendChild(
        mk('span', 'kb-pgmeta', (from + 1) + '—' + Math.min(from + PER, total) +
           ' / ' + total + ' 条 · ' + page + '/' + pages + ' 页')
      );
    };

    var render = function (scroll) {
      var q = kw.trim();
      var hits = items.filter(function (it) {
        return (kind === '全部' || it.kind === kind) &&
               (field === '全部' || it.field === field) &&
               (state === '全部' || it.state === state) &&
               (!q || it.text.indexOf(q) > -1);
      });

      var pages = Math.max(1, Math.ceil(hits.length / PER));
      if (page > pages) page = pages;

      var from = (page - 1) * PER;

      items.forEach(function (it) { it.el.hidden = true; });
      hits.slice(from, from + PER).forEach(function (it) { it.el.hidden = false; });

      if (countEl) {
        countEl.textContent = hits.length === items.length
          ? items.length + ' 条'
          : hits.length + ' / ' + items.length + ' 条';
      }

      if (emptyEl) emptyEl.hidden = hits.length > 0;
      if (emptyQ) emptyQ.textContent = q;

      if (crumb) {
        var bits = [];
        if (kind !== '全部') bits.push(wordOf(kindList, kind));
        if (field !== '全部') bits.push(wordOf(fieldList, field));
        if (state !== '全部') bits.push(wordOf(stateList, state));
        if (q) bits.push('「' + q + '」');
        crumb.textContent = bits.length ? bits.join(' · ') : '全部';
      }

      drawPager(pages, hits.length, from);

      /* 换页时回上边，不然翻完还停在半截 */
      if (scroll) {
        var top = gridEl.getBoundingClientRect().top + window.scrollY - 96;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    };

    kindList.addEventListener('change', function (e) {
      if (e.target.name !== 'kind') return;
      kind = e.target.value;
      page = 1;
      render(false);
    });

    fieldList.addEventListener('change', function (e) {
      if (e.target.name !== 'field') return;
      field = e.target.value;
      page = 1;
      render(false);
    });

    stateList.addEventListener('change', function (e) {
      if (e.target.name !== 'state') return;
      state = e.target.value;
      page = 1;
      render(false);
    });

    pagerEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn || btn.disabled) return;
      var go = btn.getAttribute('data-go');

      if (go === 'prev') page = Math.max(1, page - 1);
      else if (go === 'next') page = page + 1;
      else page = parseInt(go, 10) || 1;

      render(true);
    });

    var timer = null;
    if (qEl) {
      qEl.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          kw = qEl.value.toLowerCase();
          page = 1;
          render(false);
        }, 130);
      });
    }

    if (resetEl) {
      resetEl.addEventListener('click', function () {
        if (qEl) qEl.value = '';
        kw = '';
        kind = '全部';
        state = '全部';
        page = 1;
        var ka = kindList.querySelector('input[value="全部"]');
        var sa = stateList.querySelector('input[value="全部"]');
        if (ka) ka.checked = true;
        if (sa) sa.checked = true;
        render(false);
      });
    }

    window.addEventListener('keydown', function (e) {
      if (!qEl) return;
      if (e.key === '/' && document.activeElement !== qEl) {
        e.preventDefault();
        qEl.focus();
      }
      if (e.key === 'Escape' && document.activeElement === qEl) {
        qEl.value = '';
        kw = '';
        page = 1;
        render(false);
        qEl.blur();
      }
    });

    render(false);
  }
})();
