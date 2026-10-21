/* INFINITE — 视频观看
   一根时间轴，两个驱动源：有片源就跟着 video.currentTime 走，
   没有就走自己的钟 —— 屏幕上的稿子跟的是同一根轴。 */
(function () {
  'use strict';

  var doc = document;
  var video = doc.getElementById('wvVideo');
  var stage = doc.getElementById('wvStage');
  var playBtn = doc.getElementById('wvPlay');
  var nowEl = doc.getElementById('wvNow');
  var lenEl = doc.getElementById('wvLen');
  var track = doc.getElementById('wvTrack');
  var fill = doc.getElementById('wvFill');
  var knob = doc.getElementById('wvKnob');
  var marks = doc.getElementById('wvMarks');
  var rateBtn = doc.getElementById('wvRate');
  var muteBtn = doc.getElementById('wvMute');
  var fullBtn = doc.getElementById('wvFull');
  var readNo = doc.getElementById('wrNo');
  var readLine = doc.getElementById('wrLine');
  var readTotal = doc.getElementById('wrTotal');
  var readHint = doc.getElementById('wrHint');
  var sideBar = doc.getElementById('wvBar');
  var sideSeen = doc.getElementById('wvSeen');
  var sidePct = doc.getElementById('wvPct');
  var navLinks = [].slice.call(doc.querySelectorAll('.wv-nav a'));
  var lineEls = [].slice.call(doc.querySelectorAll('.wv-lines li'));

  var DUR = track ? parseFloat(track.getAttribute('aria-valuemax')) || 0 : 0;
  if (!DUR) DUR = 2892;

  /* 每句的时间码从 DOM 读，HTML 是唯一数据源 */
  var LINES = lineEls.map(function (li) {
    var s = li.querySelector('.ws-s');
    return {
      t: parseFloat(li.getAttribute('data-t')) || 0,
      text: s ? s.textContent.trim() : ''
    };
  });

  var CHAPS = navLinks.map(function (a) {
    return parseFloat(a.getAttribute('data-t')) || 0;
  });

  var state = {
    t: 0,
    playing: false,
    rate: 1,
    hasVideo: false,
    line: -1,
    chap: -1
  };

  function pad2(n) {
    return ('0' + Math.floor(n)).slice(-2);
  }

  function fmt(sec) {
    sec = Math.max(0, Math.floor(sec));
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    return (h > 0 ? h + ':' + pad2(m) : pad2(m)) + ':' + pad2(s);
  }

  function indexAt(list, t) {
    var idx = 0;
    for (var i = 0; i < list.length; i++) {
      if (t + 0.35 >= list[i]) idx = i;
      else break;
    }
    return idx;
  }

  /* ---------- 渲染 ---------- */

  function render() {
    var pct = Math.min(1, state.t / DUR);

    if (nowEl) nowEl.textContent = fmt(state.t);
    if (fill) fill.style.width = (pct * 100).toFixed(2) + '%';
    if (knob) knob.style.left = (pct * 100).toFixed(2) + '%';
    if (track) track.setAttribute('aria-valuenow', Math.round(state.t));

    /* 左栏进度 */
    if (sideBar) sideBar.style.setProperty('--p', (pct * 100).toFixed(1) + '%');
    if (sideSeen) sideSeen.textContent = String(Math.floor(state.t / 60));
    if (sidePct) sidePct.textContent = Math.round(pct * 100) + '%';

    /* 章节 */
    var ci = indexAt(CHAPS, state.t);
    if (ci !== state.chap) {
      if (navLinks[state.chap]) {
        navLinks[state.chap].classList.remove('is-now');
        navLinks[state.chap].removeAttribute('aria-current');
      }
      if (navLinks[ci]) {
        navLinks[ci].classList.add('is-now');
        navLinks[ci].setAttribute('aria-current', 'true');
      }
      state.chap = ci;
    }

    /* 当前句 */
    var li = indexAt(LINES.map(function (l) { return l.t; }), state.t);
    if (li !== state.line) {
      if (lineEls[state.line]) lineEls[state.line].classList.remove('is-now');
      if (lineEls[li]) lineEls[li].classList.add('is-now');
      if (readNo) readNo.textContent = ('0' + (li + 1)).slice(-2);
      if (readLine && LINES[li]) readLine.textContent = LINES[li].text;
      state.line = li;
    }
  }

  /* ---------- 播放 ---------- */

  function play() {
    if (state.playing) return;
    if (state.t >= DUR - 0.5) state.t = 0;
    state.playing = true;
    if (playBtn) {
      playBtn.classList.add('is-on');
      playBtn.setAttribute('aria-label', '暂停');
    }
    if (state.hasVideo && video) {
      video.play().catch(function () { /* 自动播放被拦下就停在暂停态 */ });
    }
    render();
  }

  function pause() {
    state.playing = false;
    if (playBtn) {
      playBtn.classList.remove('is-on');
      playBtn.setAttribute('aria-label', '播放');
    }
    if (state.hasVideo && video) {
      try { video.pause(); } catch (err) { /* 没有片源时 pause 会抛，忽略 */ }
    }
  }

  function toggle() {
    if (state.playing) pause();
    else play();
  }

  function seek(t) {
    state.t = Math.max(0, Math.min(DUR, t));
    if (state.hasVideo && video) {
      try { video.currentTime = state.t; } catch (err) { /* 同上 */ }
    }
    render();
  }

  /* ---------- 时钟 ---------- */

  var last = 0;
  function loop(now) {
    if (!last) last = now;
    var dt = (now - last) / 1000;
    last = now;

    if (state.playing) {
      if (state.hasVideo && video) {
        state.t = video.currentTime;
      } else {
        state.t += dt * state.rate;
        if (state.t >= DUR) {
          state.t = DUR;
          pause();
        }
      }
      render();
    }
    window.requestAnimationFrame(loop);
  }

  /* ---------- 进度条拖拽 ---------- */

  var dragging = false;

  function atX(clientX) {
    var r = track.getBoundingClientRect();
    var p = (clientX - r.left) / (r.width || 1);
    return Math.max(0, Math.min(1, p)) * DUR;
  }

  if (track) {
    track.addEventListener('pointerdown', function (e) {
      dragging = true;
      try { track.setPointerCapture(e.pointerId); } catch (err) { /* 老浏览器没有指针捕获 */ }
      seek(atX(e.clientX));
    });

    track.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      seek(atX(e.clientX));
    });

    var stop = function (e) {
      if (!dragging) return;
      dragging = false;
      try { track.releasePointerCapture(e.pointerId); } catch (err) { /* 同上 */ }
    };
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);

    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { seek(state.t + 5); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { seek(state.t - 5); e.preventDefault(); }
      else if (e.key === 'Home') { seek(0); e.preventDefault(); }
      else if (e.key === 'End') { seek(DUR); e.preventDefault(); }
    });
  }

  /* ---------- 按钮 ---------- */

  if (playBtn) playBtn.addEventListener('click', toggle);

  var RATES = [1, 1.25, 1.5, 2, 0.75];
  var rateIdx = 0;
  if (rateBtn) {
    rateBtn.addEventListener('click', function () {
      rateIdx = (rateIdx + 1) % RATES.length;
      state.rate = RATES[rateIdx];
      rateBtn.textContent = state.rate.toFixed(2).replace(/0$/, '') + '×';
      if (state.hasVideo && video) video.playbackRate = state.rate;
    });
  }

  var muted = false;
  if (muteBtn) {
    muteBtn.addEventListener('click', function () {
      muted = !muted;
      if (state.hasVideo && video) video.muted = muted;
      muteBtn.textContent = muted ? '静音中' : '音量';
    });
  }

  if (fullBtn) {
    fullBtn.addEventListener('click', function () {
      var on = !doc.body.classList.contains('is-full');
      doc.body.classList.toggle('is-full', on);
      fullBtn.textContent = on ? '退出' : '满屏';
    });
  }

  /* 章节跳转 */
  navLinks.forEach(function (a, i) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      seek(CHAPS[i]);
    });
  });

  /* 转录跳转 */
  lineEls.forEach(function (li, i) {
    var a = li.querySelector('a');
    if (!a) return;
    a.addEventListener('click', function (e) {
      e.preventDefault();
      seek(LINES[i].t);
    });
  });

  /* ---------- 键盘 ---------- */

  doc.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (t === track) return;

    if (e.key === ' ' || e.key === 'k') { toggle(); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { seek(state.t + 5); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { seek(state.t - 5); e.preventDefault(); }
    else if (e.key === 'f' || e.key === 'F') {
      if (fullBtn) fullBtn.click();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      doc.body.classList.remove('is-full');
      if (fullBtn) fullBtn.textContent = '满屏';
    }
  });

  /* ---------- 片源探测 ---------- */

  function probe() {
    /* 没有 <source> 也没有 src 时，readyState 永远是 0 */
    state.hasVideo = !!(video && (video.currentSrc || video.src));
    if (stage) stage.setAttribute('data-mode', state.hasVideo ? 'video' : 'read');
    if (readHint && state.hasVideo) readHint.textContent = '';
  }

  if (video) {
    video.addEventListener('loadedmetadata', function () {
      state.hasVideo = true;
      if (stage) stage.setAttribute('data-mode', 'video');
      if (video.duration && isFinite(video.duration)) {
        DUR = video.duration;
        if (lenEl) lenEl.textContent = fmt(DUR);
        if (track) track.setAttribute('aria-valuemax', String(Math.round(DUR)));
      }
    });
  }

  /* ---------- 章节刻度 ---------- */

  function drawMarks() {
    if (!marks) return;
    CHAPS.forEach(function (t, i) {
      if (i === 0) return;
      var m = doc.createElement('span');
      m.className = 'wv-mark';
      m.style.left = ((t / DUR) * 100).toFixed(2) + '%';
      marks.appendChild(m);
    });
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

  probe();
  if (lenEl) lenEl.textContent = fmt(DUR);
  if (readTotal) readTotal.textContent = String(LINES.length);
  drawMarks();
  render();
  window.requestAnimationFrame(loop);
})();
