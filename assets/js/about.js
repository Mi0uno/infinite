/* ==========================================================
   INFINITE — 关于页脚本
   只有报头时钟、网格显影、十字准星。这一页不需要别的。
   ========================================================== */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  var cross = document.getElementById('crosshair');
  var coords = document.getElementById('coords');
  var fine = window.matchMedia('(pointer: fine)').matches;

  if (cross && coords && fine && !reduce) {
    var tx = 0, ty = 0, cx = 0, cy = 0, live = false;
    var hot = null;

    window.addEventListener('pointermove', function (e) {
      tx = e.clientX;
      ty = e.clientY;
      if (!live) {
        live = true;
        cx = tx;
        cy = ty;
        cross.classList.add('is-live');
      }
      coords.textContent = ('000' + Math.round(e.clientX)).slice(-4) + ' ' + ('000' + Math.round(e.clientY)).slice(-4);
      var t = e.target;
      var hit = t && t.closest ? t.closest('a,button,input,select,textarea,label,summary') : null;
      if (hit !== hot) {
        hot = hit;
        cross.classList.toggle('is-hot', !!hit);
      }
    }, { passive: true });

    (function loop() {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      cross.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
      requestAnimationFrame(loop);
    })();
  }
})();
