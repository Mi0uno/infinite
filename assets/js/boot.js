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
  var fill = document.getElementById('ldFill');
  var pct = document.getElementById('ldPct');
  var phase = document.getElementById('ldPhase');
  var bar = document.querySelector('.ld-track');

  var pad = function (n) {
    var s = String(Math.round(n));
    return s.length >= 3 ? s : ('00' + s).slice(-3);
  };

  var paint = function (v) {
    if (fill) fill.style.width = v.toFixed(2) + '%';
    if (pct) pct.textContent = pad(v);
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

  /* 这个会话里已经看过一遍了，不拦第二遍 */
  var KEY = 'infinite.boot';
  try {
    if (sessionStorage.getItem(KEY) === '1') {
      finish();
      return;
    }
    sessionStorage.setItem(KEY, '1');
  } catch (err) { /* 隐私模式下 sessionStorage 会抛，当没看过 */ }

  doc.classList.add('is-loading');

  var started = performance.now();
  var loaded = false;
  var revealed = false;

  var MIN = 620;    /* 至少让人看清这张封面 */
  var RAMP = 780;   /* 爬到九十二用这么久 */
  var HOLD = 180;   /* 满格之后停这一下 */

  var valueAt = function (now) {
    if (loaded) return 100;
    var t = Math.min(1, (now - started) / RAMP);
    /* easeOutQuad 偏三次，前十帧涨得快，后面拖住 */
    return (1 - Math.pow(1 - t, 2.4)) * 92;
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
    if (bar) bar.style.background = 'var(--ink)';

    window.setTimeout(function () {
      el.classList.add('is-out');
      window.setTimeout(finish, 640);
    }, HOLD);
  };

  /* 三条路都会走到这里：load 了、load 迟迟不来、或者时间已经够久 */
  var settle = function () {
    loaded = true;
    var waited = performance.now() - started;
    window.setTimeout(reveal, Math.max(0, MIN - waited));
  };

  window.addEventListener('load', settle, { once: true });
  window.setTimeout(function () {
    if (!loaded) settle();
  }, 4000);
})();
