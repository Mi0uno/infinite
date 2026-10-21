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

  /* ---------- 十字准星 ---------- */
  /* ---------- 筛选 / 搜索 / 分页 ---------- */

  var gridEl = document.getElementById('grid');
  var kindList = document.getElementById('kindList');
  var fieldSel = document.getElementById('fieldSel');
  var stateSel = document.getElementById('stateSel');
  var qEl = document.getElementById('q');
  var crumb = document.getElementById('crumb');
  var countEl = document.getElementById('count');
  var pagerEl = document.getElementById('pager');
  var emptyEl = document.getElementById('empty');
  var emptyQ = document.getElementById('emptyq');
  var resetEl = document.getElementById('reset');

  if (gridEl && kindList && fieldSel && stateSel) {
    var PER = 6;

    var FIELD_CN = { rev: '逆向', net: '网络协议', sys: '系统', sec: '密码学', fe: '前端', meta: '方法' };
    var STATE_CN = { doing: '在读', todo: '没开始', done: '看完了' };

    var items = Array.prototype.map.call(
      gridEl.querySelectorAll('.kc-item'),
      function (el) {
        return {
          el: el,
          kind: el.getAttribute('data-kind') || '',
          field: el.getAttribute('data-field') || '',
          state: el.getAttribute('data-state') || '',
          text: (el.getAttribute('data-text') || '').toLowerCase()
        };
      }
    );

    /* 从 DOM 读当前选中值：刷新后浏览器会还原表单状态，不读就与界面对不上 */
    var checkedOf = function (list, name, fallback) {
      var hit = list.querySelector('input[name="' + name + '"]:checked');
      return hit ? hit.value : fallback;
    };

    var kind = checkedOf(kindList, 'kind', '全部');
    var field = fieldSel.value || '全部';
    var state = stateSel.value || '全部';
    var kw = '';
    var page = 1;

    var kindWord = function (val) {
      var input = kindList.querySelector('input[value="' + val + '"]');
      var label = input && input.nextElementSibling;
      var span = label && label.querySelector('span');
      return span ? span.textContent.trim() : val;
    };

    var mk = function (tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text != null) e.textContent = text;
      return e;
    };

    /* 每个维度剩多少，都按「其他维度已经选了什么」算——
       选了课程，领域里就只剩课程真有的那几个，为 0 的置灰不可选。
       这就是每个分类自己那一套分类器。 */
    var countsFor = function (dim) {
      var q = kw.trim();
      var out = {};
      items.forEach(function (it) {
        if (dim !== 'kind' && kind !== '全部' && it.kind !== kind) return;
        if (dim !== 'field' && field !== '全部' && it.field !== field) return;
        if (dim !== 'state' && state !== '全部' && it.state !== state) return;
        if (q && it.text.indexOf(q) < 0) return;
        out[it[dim]] = (out[it[dim]] || 0) + 1;
      });
      return out;
    };

    var paintSel = function (sel, counts, cn) {
      Array.prototype.forEach.call(sel.options, function (op) {
        if (op.value === '全部') {
          op.textContent = '全部';
          op.disabled = false;
          return;
        }
        var n = counts[op.value] || 0;
        op.textContent = (cn[op.value] || op.value) + ' · ' + n;
        /* 当前选中的那条就算变 0 也不置灰，否则下拉会失去落点 */
        op.disabled = n === 0 && !op.selected;
      });
    };

    var paintSels = function () {
      paintSel(fieldSel, countsFor('field'), FIELD_CN);
      paintSel(stateSel, countsFor('state'), STATE_CN);

      var left = items.filter(function (it) {
        return it.kind === '全部' || it.kind === kind;
      }).length;
      Array.prototype.forEach.call(kindList.querySelectorAll('input[name="kind"]'), function (inp) {
        var label = inp.nextElementSibling;
        var num = label && label.querySelector('b');
        if (!num) return;
        if (inp.value === '全部') { num.textContent = String(items.length); return; }
        num.textContent = String(items.filter(function (it) { return it.kind === inp.value; }).length);
      });
      void left;
    };

    var drawPager = function (pages, total, from) {
      pagerEl.innerHTML = '';

      if (!total) {
        pagerEl.appendChild(mk('span', 'kb-pgmeta', '0 条'));
        return;
      }

      var prev = mk('button', 'kb-pg', '← 上一页');
      prev.type = 'button';
      prev.setAttribute('data-go', 'prev');
      prev.disabled = page <= 1;
      pagerEl.appendChild(prev);

      for (var i = 1; i <= pages; i++) {
        var b = mk('button', 'kb-pg', i < 10 ? '0' + i : '' + i);
        b.type = 'button';
        b.setAttribute('data-go', String(i));
        if (i === page) {
          b.classList.add('is-cur');
          b.setAttribute('aria-current', 'page');
        }
        pagerEl.appendChild(b);
      }

      var next = mk('button', 'kb-pg', '下一页 →');
      next.type = 'button';
      next.setAttribute('data-go', 'next');
      next.disabled = page >= pages;
      pagerEl.appendChild(next);

      pagerEl.appendChild(
        mk('span', 'kb-pgmeta', (from + 1) + '—' + Math.min(from + PER, total) +
           ' / ' + total + ' 条 · ' + page + '/' + pages + ' 页')
      );
    };

    var render = function (scroll) {
      var q = kw.trim();
      var hits = items.filter(function (it) {
        return (kind === '全部' || it.kind === kind) &&
               (field === '全部' || it.field === field) &&
               (state === '全部' || it.state === state) &&
               (!q || it.text.indexOf(q) > -1);
      });

      var pages = Math.max(1, Math.ceil(hits.length / PER));
      if (page > pages) page = pages;

      var from = (page - 1) * PER;

      items.forEach(function (it) { it.el.hidden = true; });
      hits.slice(from, from + PER).forEach(function (it) { it.el.hidden = false; });

      if (countEl) {
        countEl.textContent = hits.length === items.length
          ? items.length + ' 条'
          : hits.length + ' / ' + items.length + ' 条';
      }

      if (emptyEl) emptyEl.hidden = hits.length > 0;
      if (emptyQ) emptyQ.textContent = q;

      if (crumb) {
        var bits = [];
        if (kind !== '全部') bits.push(kindWord(kind));
        if (field !== '全部') bits.push(FIELD_CN[field] || field);
        if (state !== '全部') bits.push(STATE_CN[state] || state);
        if (q) bits.push('「' + q + '」');
        crumb.textContent = bits.length ? bits.join(' · ') : '全部';
      }

      paintSels();
      drawPager(pages, hits.length, from);

      /* 换页时回上边，不然翻完还停在半截 */
      if (scroll) {
        var top = gridEl.getBoundingClientRect().top + window.scrollY - 140;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      }
    };

    kindList.addEventListener('change', function (e) {
      if (e.target.name !== 'kind') return;
      kind = e.target.value;
      page = 1;
      render(false);
    });

    fieldSel.addEventListener('change', function () {
      field = fieldSel.value;
      page = 1;
      render(false);
    });

    stateSel.addEventListener('change', function () {
      state = stateSel.value;
      page = 1;
      render(false);
    });

    pagerEl.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('button') : null;
      if (!btn || btn.disabled) return;
      var go = btn.getAttribute('data-go');

      if (go === 'prev') page = Math.max(1, page - 1);
      else if (go === 'next') page = page + 1;
      else page = parseInt(go, 10) || 1;

      render(true);
    });

    var timer = null;
    if (qEl) {
      qEl.addEventListener('input', function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          kw = qEl.value.toLowerCase();
          page = 1;
          render(false);
        }, 130);
      });
    }

    if (resetEl) {
      resetEl.addEventListener('click', function () {
        if (qEl) qEl.value = '';
        kw = '';
        kind = '全部';
        field = '全部';
        state = '全部';
        fieldSel.value = '全部';
        stateSel.value = '全部';
        page = 1;
        render(false);
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
        page = 1;
        render(false);
        qEl.blur();
      }
    });

    render(false);
  }
})();
