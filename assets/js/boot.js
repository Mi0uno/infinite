/* ============================================================
   载入页的进度
   进度是假的，但不能是瞎编的：资源没到之前只爬到九十二，
   load 之后才补上最后那几个数。
   数值按真实时间算，不按帧数 —— 掉帧、后台标签页、省电模式
   都改变不了它什么时候走完。走完再停一拍（满格的条你得看见）才揭。
   ============================================================ */

(function () {
  'use strict';

  var el = document.getElementById('loader');
  if (!el) return;

  var doc = document.documentElement;
  var ring = document.getElementById('ldRing');
  var pct = document.getElementById('ldPct');
  var phase = document.getElementById('ldPhase');

  /* r=86 的周长，环从十二点开始收 */
  var LEN = 2 * Math.PI * 86;

  var pad = function (n) {
    var s = String(Math.round(n));
    return s.length >= 3 ? s : ('00' + s).slice(-3);
  };

  var paint = function (v) {
    if (pct) pct.textContent = pad(v);
    if (ring) ring.style.strokeDashoffset = (LEN * (1 - v / 100)).toFixed(2);
  };

  var finish = function () {
    el.classList.add('is-gone');
    doc.classList.remove('is-loading');
  };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    finish();
    return;
  }

  doc.classList.add('is-loading');

  var started = performance.now();
  var loadedAt = 0;
  var loaded = false;
  var revealed = false;

  var MIN = 620;    /* 至少让人看清这张封面 */
  var RAMP = 780;   /* 爬到九十二用这么久 */
  var HOLD = 180;   /* 满格之后停这一下 */

  var three = 0;   /* 100 只留给 reveal，不让数字和文字对不上 */

  var valueAt = function (now) {
    var t = Math.min(1, (now - started) / RAMP);
    var base = (1 - Math.pow(1 - t, 2.4)) * 92;

    if (!loaded) return base;

    /* 资源到了，往九十六补，剩下那四个数等 reveal */
    var k = Math.min(1, (now - loadedAt) / 240);
    return base + (96 - base) * k;
  };

  var loop = function (now) {
    if (revealed) return;
    paint(valueAt(now));
    requestAnimationFrame(loop);
  };

  requestAnimationFrame(loop);

  var reveal = function () {
    if (revealed) return;
    revealed = true;

    paint(100);
    if (phase) phase.textContent = '就绪';

    window.setTimeout(function () {
      el.classList.add('is-out');
      window.setTimeout(finish, 640);
    }, HOLD);
  };

  /* 三条路都会走到这里：load 了、load 迟迟不来、或者时间已经够久 */
  var settle = function () {
    if (loaded) return;
    loaded = true;
    loadedAt = performance.now();
    var waited = loadedAt - started;
    window.setTimeout(reveal, Math.max(0, MIN - waited) + 260);
  };

  window.addEventListener('load', settle, { once: true });
  window.setTimeout(function () {
    if (!loaded) settle();
  }, 4000);
})();
