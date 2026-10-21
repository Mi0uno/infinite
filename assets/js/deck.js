/* INFINITE — 课件查看
   翻页只有一个真状态：cur。其余全是它的投影。 */
(function () {
  'use strict';

  var doc = document;
  var slides = [].slice.call(doc.querySelectorAll('.dk-slide'));
  var navLinks = [].slice.call(doc.querySelectorAll('.dk-nav a'));
  var dotBox = doc.getElementById('dkDots');
  var bar = doc.getElementById('dkBar');
  var nowEl = doc.getElementById('dkNow');
  var pctEl = doc.getElementById('dkPct');
  var noEl = doc.getElementById('dkNo');
  var noteEl = doc.getElementById('dnText');
  var prevBtn = doc.getElementById('dkPrev');
  var nextBtn = doc.getElementById('dkNext');
  var fullBtn = doc.getElementById('dkFull');

  var TOTAL = slides.length;
  var cur = -1;
  var dots = [];

  /* 每页一句备注，念的时候不至于找不到话 */
  var NOTES = [
    '开场就一句话：这一份讲的是一个字节的旅行，不是操作系统课。',
    'scancode 是键盘说的话。三个字节里有一个是抬起码，别把它当成字符。',
    '中断上下文里不做重活，所以它只是把字节塞进队列，剩下的交给别人。',
    '行规程是整个链路上唯一一处不拷贝内存的地方，它只做判断。',
    'read 的返回值是字节数，不是字符串。这里很多人第一次踩空。',
    '4 KB 是 glibc 的默认值，不是标准。行缓冲是遇到换行才吐。',
    'write 之后你以为屏幕应该变了，其实还没有 —— 内核只是拿到了数据。',
    '终端软件做的事比多数人想的多：解析、排版、把字画成点。',
    '到这里已经没有「字符」了，只有像素和纹理。但拷贝没有停。',
    '七次是这一条路径上的数。换一个终端、换一个字体引擎，这个数会变。'
  ];

  function pad(n) {
    return ('0' + n).slice(-2);
  }

  function buildDots() {
    if (!dotBox) return;
    for (var i = 0; i < TOTAL; i++) {
      var d = doc.createElement('span');
      d.className = 'dk-dot';
      dotBox.appendChild(d);
      dots.push(d);
    }
  }

  function go(i) {
    i = Math.max(0, Math.min(TOTAL - 1, i));
    if (i === cur) return;
    cur = i;

    for (var k = 0; k < TOTAL; k++) {
      var on = k === i;
      slides[k].classList.toggle('is-on', on);
      slides[k].setAttribute('aria-hidden', on ? 'false' : 'true');
      if (dots[k]) dots[k].classList.toggle('is-on', on);
      if (navLinks[k]) {
        navLinks[k].classList.toggle('is-now', on);
        if (on) navLinks[k].setAttribute('aria-current', 'true');
        else navLinks[k].removeAttribute('aria-current');
      }
    }

    var pct = Math.round((i + 1) / TOTAL * 100);
    if (nowEl) nowEl.textContent = String(i + 1);
    if (pctEl) pctEl.textContent = pct + '%';
    if (bar) bar.style.setProperty('--p', pct + '%');
    if (noEl) noEl.textContent = pad(i + 1);
    if (noteEl) noteEl.textContent = NOTES[i] || '';
    if (prevBtn) prevBtn.disabled = i === 0;
    if (nextBtn) nextBtn.disabled = i === TOTAL - 1;
  }

  /* ---------- 满屏：只改一层 class，不动浏览器全屏 API ---------- */

  function setFull(on) {
    doc.body.classList.toggle('is-full', on);
    if (fullBtn) fullBtn.textContent = on ? '退出' : '满屏';
  }

  function toggleFull() {
    setFull(!doc.body.classList.contains('is-full'));
  }

  /* ---------- 事件 ---------- */

  if (prevBtn) prevBtn.addEventListener('click', function () { go(cur - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { go(cur + 1); });
  if (fullBtn) fullBtn.addEventListener('click', toggleFull);

  navLinks.forEach(function (a, k) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      go(k);
    });
  });

  doc.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;

    var k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === 'j') { go(cur + 1); e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'k') { go(cur - 1); e.preventDefault(); }
    else if (k === 'Home') { go(0); e.preventDefault(); }
    else if (k === 'End') { go(TOTAL - 1); e.preventDefault(); }
    else if (k === 'f' || k === 'F') { toggleFull(); e.preventDefault(); }
    else if (k === 'Escape') { setFull(false); }
  });

  /* 触屏左右划 */
  var tx = 0;
  var ty = 0;
  var stage = doc.getElementById('dkStage');
  if (stage) {
    stage.addEventListener('touchstart', function (e) {
      tx = e.changedTouches[0].clientX;
      ty = e.changedTouches[0].clientY;
    }, { passive: true });

    stage.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
      go(dx < 0 ? cur + 1 : cur - 1);
    }, { passive: true });
  }

  /* ---------- 时钟 ---------- */

  var clock = doc.getElementById('clock');
  if (clock) {
    var tick = function () {
      clock.textContent = new Date().toTimeString().slice(0, 8);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- 起步 ---------- */

  buildDots();

  var start = 0;
  if (location.hash) {
    var idx = slides.map(function (s) { return '#' + s.id; }).indexOf(location.hash);
    if (idx >= 0) start = idx;
  }
  go(start);
})();
