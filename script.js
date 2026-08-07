/* Haotong Liang — gallery behaviour: reveal on scroll, lightbox, keyboard + swipe nav */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Sticky bar turns solid once the hero is behind us ─────── */
  var bar = document.querySelector('.topbar');
  var onScroll = function () {
    bar.classList.toggle('solid', window.scrollY > window.innerHeight * 0.6);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Autoplaying animations are motion; honour the OS setting ─ */
  if (reduce) {
    document.querySelectorAll('video[autoplay]').forEach(function (v) {
      v.removeAttribute('autoplay');
      v.pause();
    });
  }

  /* ── Fade images in as they decode, so no half-painted tiles ─ */
  document.querySelectorAll('.shot img').forEach(function (img) {
    if (img.complete && img.naturalWidth) img.classList.add('loaded');
    else img.addEventListener('load', function () { img.classList.add('loaded'); }, { once: true });
  });

  /* ── Masonry ───────────────────────────────────────────────────
     CSS multi-column fills each column in turn and balances by estimated
     height, which leaves a ragged hole at the bottom of whichever column
     drew the short straw. Pack into the currently shortest column instead.
     The CSS columns stay as the no-JS fallback. */
  var grids = Array.prototype.slice.call(document.querySelectorAll('.grid'));

  function packGrids() {
    grids.forEach(function (grid) {
      var tiles = Array.prototype.slice.call(grid.querySelectorAll('.shot'));

      // Back to a flat list so the CSS column-count is readable again.
      grid.classList.remove('masonry');
      Array.prototype.slice.call(grid.querySelectorAll('.masonry-col'))
        .forEach(function (c) { c.parentNode.removeChild(c); });
      tiles.forEach(function (t) { grid.appendChild(t); });

      var n = parseInt(window.getComputedStyle(grid).columnCount, 10);
      if (!n || n < 2) return;                    // one column: nothing to balance

      var cols = [];
      for (var i = 0; i < n; i++) {
        var col = document.createElement('div');
        col.className = 'masonry-col';
        cols.push(col);
      }
      grid.classList.add('masonry');
      cols.forEach(function (c) { grid.appendChild(c); });

      // Pass 1: park everything in one column to measure each tile at its
      // real column width, which is the only way to know how tall it lands.
      tiles.forEach(function (t) { cols[0].appendChild(t); });
      var sized = tiles.map(function (t) {
        return { el: t, h: t.getBoundingClientRect().height };
      });

      // Pass 2: tallest first into whichever column is currently shortest.
      // Placing the big tiles while there is still room to absorb them is
      // what keeps the columns ending level; going in DOM order does not.
      var buckets = cols.map(function () { return []; });
      var heights = cols.map(function () { return 0; });
      sized.slice().sort(function (a, b) { return b.h - a.h; }).forEach(function (item) {
        var k = 0;
        for (var i = 1; i < heights.length; i++) if (heights[i] < heights[k]) k = i;
        buckets[k].push(item);
        heights[k] += item.h;
      });

      // Pass 3: nudge single tiles from the tallest column to the shortest
      // while that narrows the gap. Cheap at this size, and it takes the
      // remaining raggedness down to roughly one caption's worth.
      var spread = function () { return Math.max.apply(null, heights) - Math.min.apply(null, heights); };
      for (var pass = 0; pass < 40; pass++) {
        var hi = 0, lo = 0;
        for (var i = 1; i < heights.length; i++) {
          if (heights[i] > heights[hi]) hi = i;
          if (heights[i] < heights[lo]) lo = i;
        }
        var before = spread(), best = -1, bestSpread = before;
        for (var j = 0; j < buckets[hi].length; j++) {
          var h = buckets[hi][j].h;
          heights[hi] -= h; heights[lo] += h;
          if (spread() < bestSpread) { bestSpread = spread(); best = j; }
          heights[hi] += h; heights[lo] -= h;
        }
        if (best < 0) break;
        var moved = buckets[hi].splice(best, 1)[0];
        buckets[lo].push(moved);
        heights[hi] -= moved.h; heights[lo] += moved.h;
      }

      buckets.forEach(function (bucket, i) {
        bucket.forEach(function (item) { cols[i].appendChild(item.el); });
      });
    });
  }

  packGrids();
  // Caption wrapping shifts once the webfont lands, which changes tile heights.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(packGrids);

  var repackTimer;
  window.addEventListener('resize', function () {
    clearTimeout(repackTimer);
    repackTimer = setTimeout(packGrids, 180);
  });

  /* ── Reveal on scroll ──────────────────────────────────────── */
  var shots = Array.prototype.slice.call(document.querySelectorAll('.shot'));
  if (reduce || !('IntersectionObserver' in window)) {
    shots.forEach(function (s) { s.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    shots.forEach(function (s) { io.observe(s); });
  }

  /* ── Lightbox ──────────────────────────────────────────────── */
  var figs = Array.prototype.slice.call(document.querySelectorAll('.shot[data-i]'));
  if (!figs.length) return;

  var lb = document.getElementById('lightbox');
  var lbImg = document.getElementById('lb-img');
  var lbTitle = document.getElementById('lb-title');
  var lbNote = document.getElementById('lb-note');
  var closeBtn = lb.querySelector('.lb-close');
  var prevBtn = lb.querySelector('.lb-prev');
  var nextBtn = lb.querySelector('.lb-next');
  var current = -1;
  var lastFocus = null;

  function preload(i) {
    var f = figs[(i + figs.length) % figs.length];
    if (!f) return;
    var url = f.querySelector('img').dataset.full;
    if (url) { var p = new Image(); p.src = url; }
  }

  function show(i) {
    current = (i + figs.length) % figs.length;
    var fig = figs[current];
    var img = fig.querySelector('img');
    var cap = fig.querySelector('figcaption');

    lbImg.src = img.dataset.full || img.src;
    lbImg.alt = img.alt;
    lbTitle.textContent = cap.querySelector('b').textContent;
    lbNote.textContent = cap.querySelector('span').textContent;

    preload(current + 1);
    preload(current - 1);
  }

  function open(i) {
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.classList.add('lb-lock');
    show(i);
    requestAnimationFrame(function () { lb.classList.add('open'); });
    closeBtn.focus();
  }

  function close() {
    lb.classList.remove('open');
    document.body.classList.remove('lb-lock');
    var done = function () {
      lb.hidden = true;
      lbImg.removeAttribute('src');
    };
    if (reduce) done();
    else setTimeout(done, 280);
    if (lastFocus) lastFocus.focus();
  }

  figs.forEach(function (fig, i) {
    var btn = fig.querySelector('.shot-btn');
    if (btn) btn.addEventListener('click', function () { open(i); });
  });

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', function () { show(current - 1); });
  nextBtn.addEventListener('click', function () { show(current + 1); });

  lb.addEventListener('click', function (e) {
    if (e.target === lb || e.target.classList.contains('lb-stage')) close();
  });

  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowLeft') show(current - 1);
    else if (e.key === 'ArrowRight') show(current + 1);
    else if (e.key === 'Tab') {
      /* keep focus inside the dialog while it is open */
      var focusable = [closeBtn, prevBtn, nextBtn];
      var idx = focusable.indexOf(document.activeElement);
      e.preventDefault();
      var next = e.shiftKey ? idx - 1 : idx + 1;
      focusable[(next + focusable.length) % focusable.length].focus();
    }
  });

  /* Swipe on touch devices */
  var x0 = null;
  lb.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 55) show(current + (dx < 0 ? 1 : -1));
    x0 = null;
  }, { passive: true });
})();
