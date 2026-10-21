/* ==========================================================
   INFINITE — 知识库脚本
   时钟 / 网格显影 / 十字准星 / 类型筛选 / 搜索
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
    if (e.key === 'g' || e.key === 'G') {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      setGrid(!overlay.classList.contains('is-on'));
    }
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

  /* ---------- 类型筛选 / 搜索 ---------- */

  var gridEl = document.getElementById('grid');
  var filterEl = document.getElementById('filter');
  var qEl = document.getElementById('q');
  var emptyEl = document.getElementById('empty');
  var emptyQ = document.getElementById('emptyq');
  var resetEl = document.getElementById('reset');

  if (gridEl && filterEl && qEl) {
    var items = Array.prototype.map.call(
      gridEl.querySelectorAll('.kb-item'),
      function (el) {
        return {
          el: el,
          kind: el.getAttribute('data-kind') || '',
          text: (el.getAttribute('data-text') || '').toLowerCase()
        };
      }
    );

    var gap = gridEl.querySelector('.kb-gap');
    var kind = '全部';
    var kw = '';

    var apply = function () {
      var q = kw.trim();
      var shown = 0;

      items.forEach(function (it) {
        var on = (kind === '全部' || it.kind === kind) && (!q || it.text.indexOf(q) > -1);
        it.el.hidden = !on;
        if (on) shown++;
      });

      /* 空格只在什么都没筛的时候出现——它是版面的空缺，不是结果 */
      if (gap) gap.hidden = !(kind === '全部' && !q);

      if (emptyEl) emptyEl.hidden = shown > 0;
      if (emptyQ) emptyQ.textContent = q;
    };

    var setKind = function (next) {
      kind = next;
      Array.prototype.forEach.call(filterEl.querySelectorAll('button'), function (b) {
        var on = (b.getAttribute('data-kind') || '全部') === next;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      apply();
    };

    filterEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn) return;
      setKind(btn.getAttribute('data-kind') || '全部');
    });

    var timer = null;
    qEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        kw = qEl.value.toLowerCase();
        apply();
      }, 130);
    });

    if (resetEl) {
      resetEl.addEventListener('click', function () {
        qEl.value = '';
        kw = '';
        setKind('全部');
      });
    }

    window.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== qEl) {
        e.preventDefault();
        qEl.focus();
      }
      if (e.key === 'Escape' && document.activeElement === qEl) {
        qEl.value = '';
        kw = '';
        apply();
        qEl.blur();
      }
    });

    apply();
  }
})();
