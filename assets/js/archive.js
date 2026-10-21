/* ==========================================================
   INFINITE — 记录页脚本
   时钟 / 网格显影 / 十字准星 / 年份 + 标签筛选 / 搜索 / 分页 · 全览
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

  /* ---------- 年份 / 标签 / 搜索 / 分页 · 全览 ---------- */

  var listEl = document.getElementById('list');
  var pagerEl = document.getElementById('pager');
  var filterEl = document.getElementById('filter');
  var yfilterEl = document.getElementById('yfilter');
  var qEl = document.getElementById('q');
  var viewEl = document.querySelector('.ar-view');

  var PER = 7;

  if (listEl && pagerEl && filterEl && qEl) {
    var mode = { year: '全部', tag: '全部', q: '', page: 1, view: 'page' };
    var pool = [];
    var blankTpl = null;

    /* 把静态列表读成数据再清空 —— 之后每次绘制都从这份数据重建 */
    Array.prototype.forEach.call(listEl.querySelectorAll('.ar-year'), function (sec) {
      var head = sec.querySelector('.ar-yhead');
      var year = head ? head.textContent.trim().slice(0, 4) : '----';

      if (sec.querySelector('.ar-blank')) { blankTpl = sec.cloneNode(true); return; }

      Array.prototype.forEach.call(sec.querySelectorAll('.ar-row'), function (row) {
        pool.push({
          el: row,
          year: year,
          tag: row.getAttribute('data-tag') || '—',
          text: (row.textContent || '').replace(/\s+/g, ' ').toLowerCase()
        });
      });
    });

    listEl.innerHTML = '';

    var mk = function (tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };

    var hit = function (item) {
      if (mode.year !== '全部' && item.year !== mode.year) return false;
      if (mode.tag !== '全部' && item.tag !== mode.tag) return false;
      if (!mode.q) return true;
      return item.text.indexOf(mode.q) !== -1;
    };

    /* ---- 年份按钮：从数据里长出来，不手写 ---- */

    if (yfilterEl) {
      var years = [];
      pool.forEach(function (x) {
        if (years.indexOf(x.year) === -1) years.push(x.year);
      });
      years.sort().reverse();

      var allY = mk('button', 'is-on', '全部');
      allY.type = 'button';
      allY.setAttribute('data-year', '全部');
      allY.setAttribute('aria-pressed', 'true');
      yfilterEl.appendChild(allY);

      years.forEach(function (y) {
        var b = mk('button', null, y);
        b.type = 'button';
        b.setAttribute('data-year', y);
        b.setAttribute('aria-pressed', 'false');
        yfilterEl.appendChild(b);
      });
    }

    /* ---- 绘制零件 ---- */

    var appendGroups = function (chunk) {
      var secs = listEl.querySelectorAll('.ar-year');
      var curSec = secs.length ? secs[secs.length - 1] : null;
      var curOl = curSec ? curSec.querySelector('.ar-rows') : null;
      var curYear = curSec ? curSec.getAttribute('data-year') : null;

      chunk.forEach(function (item) {
        if (item.year !== curYear) {
          curSec = mk('section', 'ar-year');
          curSec.setAttribute('data-year', item.year);
          var head = mk('h2', 'ar-yhead', item.year + ' ');
          head.appendChild(mk('span', null, ''));
          curSec.appendChild(head);
          curOl = mk('ol', 'ar-rows');
          curSec.appendChild(curOl);
          listEl.appendChild(curSec);
          curYear = item.year;
        }
        curOl.appendChild(item.el);
      });
    };

    /* 组头的数字 = 这一页 / 这一批已经露出来的条数，跨页时看得出还没完 */
    var syncCounts = function (hits) {
      Array.prototype.forEach.call(listEl.querySelectorAll('.ar-year'), function (sec) {
        var sp = sec.querySelector('.ar-yhead span');
        if (!sp) return;
        var y = sec.getAttribute('data-year');
        var total = 0;
        for (var i = 0; i < hits.length; i++) if (hits[i].year === y) total++;
        if (!total) { sp.textContent = '0 条'; return; }
        var shown = sec.querySelectorAll('.ar-row').length;
        sp.textContent = shown < total ? shown + ' / ' + total + ' 条' : shown + ' 条';
      });
    };

    var drawEmpty = function () {
      listEl.innerHTML = '';
      var emp = mk('div', 'ar-empty');
      emp.appendChild(mk('p', null, '没有匹配的条目。'));
      var why = [];
      if (mode.year !== '全部') why.push('年份「' + mode.year + '」');
      if (mode.tag !== '全部') why.push('栏目「' + mode.tag + '」');
      if (mode.q) why.push('关键词「' + mode.q + '」');
      if (why.length) emp.appendChild(mk('p', null, why.join(' · ')));
      var reset = mk('button', 'ar-reset', '清掉条件');
      reset.type = 'button';
      emp.appendChild(reset);
      listEl.appendChild(emp);
    };

    var drawPager = function (pages, total, from, flow) {
      pagerEl.innerHTML = '';

      if (!total) {
        pagerEl.appendChild(mk('span', 'ar-pgmeta', '0 条'));
        return;
      }

      if (flow) {
        var fmeta = mk('span', 'ar-pgmeta');
        fmeta.appendChild(mk('b', null, from + ' / ' + total + ' 条'));
        fmeta.appendChild(document.createTextNode(' · 全览'));
        pagerEl.appendChild(fmeta);
        return;
      }

      var prev = mk('button', 'ar-pg', '← 上一页');
      prev.type = 'button';
      prev.setAttribute('data-go', 'prev');
      prev.disabled = mode.page <= 1;
      pagerEl.appendChild(prev);

      var marks = [];
      for (var i = 1; i <= pages; i++) {
        if (pages <= 7 || i === 1 || i === pages || Math.abs(i - mode.page) <= 1) marks.push(i);
        else if (marks[marks.length - 1] !== '…') marks.push('…');
      }

      marks.forEach(function (m) {
        if (m === '…') { pagerEl.appendChild(mk('span', 'ar-pg-gap', '…')); return; }
        var b = mk('button', 'ar-pg' + (m === mode.page ? ' is-cur' : ''), m < 10 ? '0' + m : '' + m);
        b.type = 'button';
        b.setAttribute('data-page', m);
        if (m === mode.page) b.setAttribute('aria-current', 'page');
        pagerEl.appendChild(b);
      });

      var next = mk('button', 'ar-pg', '下一页 →');
      next.type = 'button';
      next.setAttribute('data-go', 'next');
      next.disabled = mode.page >= pages;
      pagerEl.appendChild(next);

      var meta = mk('span', 'ar-pgmeta');
      meta.appendChild(mk('b', null, (from + 1) + '—' + (from + Math.min(PER, total - from))));
      meta.appendChild(document.createTextNode(' / ' + total + ' 条 · ' + mode.page + '/' + pages + ' 页'));
      pagerEl.appendChild(meta);
    };

    var tail = function (hits, label) {
      if (blankTpl && mode.tag === '全部' && mode.year === '全部' && !mode.q) {
        listEl.appendChild(blankTpl.cloneNode(true));
      }
      if (label) listEl.appendChild(mk('p', 'ar-end', label));
    };

    /* ---- 分页模式 ---- */

    var renderPage = function (jump) {
      var hits = pool.filter(hit);

      if (!hits.length) {
        drawEmpty();
        drawPager(1, 0, 0, false);
        return;
      }

      var pages = Math.max(1, Math.ceil(hits.length / PER));
      if (mode.page > pages) mode.page = pages;
      if (mode.page < 1) mode.page = 1;

      var from = (mode.page - 1) * PER;
      var slice = hits.slice(from, from + PER);

      listEl.innerHTML = '';
      appendGroups(slice);
      syncCounts(hits);

      if (mode.page === pages) tail(hits, '');

      drawPager(pages, hits.length, from, false);

      if (jump && listEl.getBoundingClientRect().top < 0) {
        listEl.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      }
    };

    /* ---- 全览模式：一批一批往下接，不切断 ---- */

    var flowIndex = 0;
    var flowDone = false;

    var flowStart = function () {
      var hits = pool.filter(hit);
      flowIndex = 0;
      flowDone = false;

      if (!hits.length) {
        drawEmpty();
        drawPager(1, 0, 0, true);
        return;
      }

      listEl.innerHTML = '';
      flowFill();
    };

    /* 一批一批往下去；内容还没撑出可滚距离时接着填，免得停在半页 */
    var flowFill = function () {
      var guard = 0;
      while (!flowDone && guard++ < 60) {
        flowStep();
        if (flowDone) break;
        var gap = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
        if (gap >= 900) break;
      }
    };

    var flowStep = function () {
      if (flowDone) return;

      var hits = pool.filter(hit);
      var chunk = hits.slice(flowIndex, flowIndex + PER);
      if (chunk.length) {
        appendGroups(chunk);
        flowIndex += chunk.length;
        syncCounts(hits);
      }

      if (flowIndex >= hits.length) {
        flowDone = true;
        tail(hits, '全部 ' + hits.length + ' 条都在这里了。没有更多。');
      }

      drawPager(1, hits.length, flowIndex, true);
    };

    var paint = function (jump) {
      if (mode.view === 'flow') {
        flowStart();
        if (jump && listEl.getBoundingClientRect().top < 0) {
          listEl.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
        }
      } else {
        renderPage(jump);
      }
    };

    /* ---- 事件 ---- */

    var setOn = function (box, btn) {
      Array.prototype.forEach.call(box.querySelectorAll('button'), function (b) {
        var on = b === btn;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    };

    if (yfilterEl) {
      yfilterEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        mode.year = btn.getAttribute('data-year') || '全部';
        mode.page = 1;
        setOn(yfilterEl, btn);
        paint(true);
      });
    }

    filterEl.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      mode.tag = btn.getAttribute('data-tag') || '全部';
      mode.page = 1;
      setOn(filterEl, btn);
      paint(true);
    });

    if (viewEl) {
      viewEl.addEventListener('click', function (e) {
        var btn = e.target.closest('button');
        if (!btn) return;
        var v = btn.getAttribute('data-view');
        if (!v || v === mode.view) return;
        mode.view = v;
        mode.page = 1;
        setOn(viewEl, btn);
        paint(true);
      });
    }

    var timer = null;
    var seek = function () {
      mode.q = qEl.value.trim().toLowerCase();
      mode.page = 1;
      paint(true);
    };

    qEl.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(seek, 130);
    });

    qEl.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        qEl.value = '';
        clearTimeout(timer);
        seek();
        qEl.blur();
      } else if (e.key === 'Enter') {
        clearTimeout(timer);
        seek();
      }
    });

    window.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      qEl.focus();
      qEl.select();
    });

    pagerEl.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn || btn.disabled) return;
      if (btn.hasAttribute('data-page')) mode.page = parseInt(btn.getAttribute('data-page'), 10) || 1;
      else if (btn.getAttribute('data-go') === 'prev') mode.page -= 1;
      else if (btn.getAttribute('data-go') === 'next') mode.page += 1;
      renderPage(true);
    });

    listEl.addEventListener('click', function (e) {
      if (!e.target.closest('.ar-reset')) return;
      mode.year = '全部';
      mode.tag = '全部';
      mode.q = '';
      mode.page = 1;
      qEl.value = '';
      if (yfilterEl) setOn(yfilterEl, yfilterEl.querySelector('button'));
      setOn(filterEl, filterEl.querySelector('button'));
      paint(false);
    });

    /* 全览：快到底部就接下一批 */
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (mode.view !== 'flow' || flowDone || ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        if (mode.view !== 'flow' || flowDone) return;
        var gap = document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
        if (gap < 900) flowFill();
      });
    }, { passive: true });

    paint(false);
  }
})();
