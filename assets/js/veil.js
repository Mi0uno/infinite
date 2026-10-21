/* ==========================================================
   INFINITE — 换页遮罩
   入场靠 CSS 动画自己跑完（JS 没跑也照常揭），
   离场才需要这几十行：把纸从下面推回来，盖满了再跳。
   ========================================================== */

(function () {
  'use strict';

  var veil = document.querySelector('.veil');
  if (!veil) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce) {
    veil.style.display = 'none';
    return;
  }

  /* 从往返缓存回来时，遮罩可能还停在盖住位置的样子 */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) {
      veil.classList.remove('is-fall');
      document.body.classList.remove('is-shut');
    }
  });

  /* 载入动画的兜底：有的引擎（省电模式、后台标签页、老内核）
     根本不推进 CSS 动画，元素会一直停在 opacity 0 那一帧。
     一秒半以后无论如何都让内容出来。 */
  window.setTimeout(function () {
    document.body.classList.add('is-boot');
  }, 2600);

  var leaving = false;

  document.addEventListener('click', function (e) {
    if (leaving) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (!e.target || !e.target.closest) return;

    var a = e.target.closest('a[href]');
    if (!a) return;

    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;
    if (a.hostname && a.hostname !== location.hostname) return;

    /* 同页锚点交给浏览器自己滚，别为它播一次换页 */
    var url;
    try {
      url = new URL(a.href, location.href);
    } catch (err) {
      return;
    }
    if (url.pathname === location.pathname && url.hash) return;

    e.preventDefault();
    leaving = true;

    /* 知识库和课程页让内容先散场，纸再盖上来 */
    document.body.classList.add('is-shut');

    veil.classList.remove('is-fall');
    /* 强制一帧，让动画从头播 */
    void veil.offsetWidth;
    veil.classList.add('is-fall');

    /* 动画 320ms，多留 40ms 余量；就算卡住，纸也已经盖住了 */
    window.setTimeout(function () {
      location.href = a.href;
    }, 360);
  }, true);
})();
