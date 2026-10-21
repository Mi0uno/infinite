/* ============================================================
   课程详情页：时钟、网格显影、十字准星、单元开合记忆
   ============================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 报头时钟 ---------- */

  var clock = document.getElementById('clock');

  if (clock) {
    var tick = function () {
      var d = new Date();
      var p = function (n) { return n < 10 ? '0' + n : '' + n; };
      clock.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 十字准星 ---------- */

  var cross = document.getElementById('crosshair');
  var coords = document.getElementById('coords');
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (cross && fine && !reduce) {
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight / 2;
    var tx = cx;
    var ty = cy;
    var live = false;
    var running = false;

    var loop = function () {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;

      cross.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';

      if (coords) coords.textContent = ('000' + Math.round(tx)).slice(-4) + ' ' + ('000' + Math.round(ty)).slice(-4);

      if (Math.abs(tx - cx) < 0.4 && Math.abs(ty - cy) < 0.4) {
        running = false;
        return;
      }

      requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;

      if (!live) {
        live = true;
        cross.classList.add('is-live');
      }

      var t = e.target;
      var hit = t && t.closest ? t.closest('a,button,input,select,textarea,label,summary') : null;
      if (hit !== hot) {
        hot = hit;
        cross.classList.toggle('is-hot', !!hit);
      }

      if (!running) {
        running = true;
        requestAnimationFrame(loop);
      }
    }, { passive: true });

    window.addEventListener('pointerleave', function () {
      cross.classList.remove('is-live');
      live = false;
    });
  }

  /* ---------- 单元开合：打开一个不动其它的，但记住上次看的是哪个 ---------- */

  var units = document.querySelectorAll('.cu-unit');

  Array.prototype.forEach.call(units, function (unit) {
    var head = unit.querySelector('.cu-head');
    if (!head) return;

    /* 用 click 不用 toggle：load 时带 open 的 details 也会发 toggle，
       页面一进来就自己滚到第三个单元去了。 */
    head.addEventListener('click', function () {
      if (unit.open) return;   /* 这一下是收起，不动滚动 */

      setTimeout(function () {
        var top = unit.getBoundingClientRect().top + window.scrollY - 72;
        if (top <= window.scrollY) return;
        window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
      }, 0);
    });
  });

  /* 左侧目录：滚到哪里，哪个单元亮着 */
  var navLinks = document.querySelectorAll('.cu-nav a');
  var sections = document.querySelectorAll('.cu-unit');

  if (navLinks.length && sections.length && 'IntersectionObserver' in window) {
    var map = {};

    Array.prototype.forEach.call(navLinks, function (a) {
      map[a.getAttribute('href').slice(1)] = a;
    });

    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = map[en.target.id];
        if (!a || !en.isIntersecting) return;

        Array.prototype.forEach.call(navLinks, function (x) {
          if (x !== a) x.classList.remove('is-here');
        });
        a.classList.add('is-here');
      });
    }, { rootMargin: '-15% 0px -70% 0px' });

    Array.prototype.forEach.call(sections, function (s) { seen.observe(s); });
  }
})();
