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

  /* ---------- 筛选 / 搜索 ---------- */

  var groupsEl = document.getElementById('groups');
  var kindList = document.getElementById('kindList');
  var stateList = document.getElementById('stateList');
  var qEl = document.getElementById('q');
  var crumb = document.getElementById('crumb');
  var emptyEl = document.getElementById('empty');
  var emptyQ = document.getElementById('emptyq');
  var resetEl = document.getElementById('reset');

  if (groupsEl && kindList && stateList) {
    var items = Array.prototype.map.call(
      groupsEl.querySelectorAll('.kb-item'),
      function (el) {
        return {
          el: el,
          kind: el.getAttribute('data-kind') || '',
          state: el.getAttribute('data-state') || '',
          text: (el.getAttribute('data-text') || '').toLowerCase()
        };
      }
    );

    var groups = Array.prototype.map.call(
      groupsEl.querySelectorAll('.kb-group'),
      function (el) {
        return { el: el, key: el.getAttribute('data-group') || '' };
      }
    );

    var kind = '全部';
    var state = '全部';
    var kw = '';

    var wordOf = function (list, val) {
      var input = list.querySelector('input[value="' + val + '"]');
      var label = input && input.nextElementSibling;
      var span = label && label.querySelector('span');
      return span ? span.textContent.trim() : '全部';
    };

    var apply = function () {
      var q = kw.trim();
      var seen = {};
      var shown = 0;

      items.forEach(function (it) {
        var on = (kind === '全部' || it.kind === kind) &&
                 (state === '全部' || it.state === state) &&
                 (!q || it.text.indexOf(q) > -1);
        it.el.hidden = !on;
        if (on) {
          shown++;
          seen[it.kind] = (seen[it.kind] || 0) + 1;
        }
      });

      /* 组里一条都不剩就整组收起来，别留个空标题 */
      groups.forEach(function (g) {
        g.el.hidden = !seen[g.key];
      });

      if (emptyEl) emptyEl.hidden = shown > 0;

      if (emptyQ) emptyQ.textContent = q;

      if (crumb) {
        var label;
        if (q) label = '「' + q + '」';
        else if (kind !== '全部') label = wordOf(kindList, kind);
        else if (state !== '全部') label = wordOf(stateList, state);
        else label = '全部';
        crumb.textContent = label;
      }

    };

    /* 高亮由 :checked 管，脚本只读选中值 */
    kindList.addEventListener('change', function (e) {
      if (!e.target.name || e.target.name !== 'kind') return;
      kind = e.target.value;
      apply();
    });

    stateList.addEventListener('change', function (e) {
      if (!e.target.name || e.target.name !== 'state') return;
      state = e.target.value;
      apply();
    });

    var timer = null;
    if (qEl) {
      qEl.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          kw = qEl.value.toLowerCase();
          apply();
        }, 130);
      });
    }

    if (resetEl) {
      resetEl.addEventListener('click', function () {
        if (qEl) qEl.value = '';
        kw = '';
        kind = '全部';
        state = '全部';
        var ka = kindList.querySelector('input[value="全部"]');
        var sa = stateList.querySelector('input[value="全部"]');
        if (ka) ka.checked = true;
        if (sa) sa.checked = true;
        apply();
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
        apply();
        qEl.blur();
      }
    });

    apply();
  }
})();
