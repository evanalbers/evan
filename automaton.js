/* Background automaton + theme toggle. No dependencies.
 *
 * A one-dimensional cellular automaton is drawn row by row down the page.
 * When it reaches the bottom it wraps to the top and carries on under a new
 * rule picked from RULES, overwriting the previous pass.
 */
(function () {
  'use strict';

  // ---- Settings you may want to change -----------------------------------
  var CELL = 6;            // cell size in CSS pixels
  var SPEED = 28;          // rows drawn per second
  var TRAIL = 22;          // rows behind the leading edge that are still fading
  var RESEED_CHANCE = 0.4; // chance a new pass starts from a few cells instead of the last row
  // Curated elementary rules: chaotic (30, 86), fractal (90, 150, 60, 102, 18, 22, 126, 146)
  // and structure-forming (110, 124, 54, 62, 106, 120). All are even-numbered,
  // so an empty background stays empty and the page never flashes.
  var RULES = [30, 86, 90, 150, 110, 124, 54, 62, 22, 126, 60, 102, 106, 120, 18, 146];
  // -------------------------------------------------------------------------

  var canvas = document.getElementById('automaton');
  var ruleEl = document.getElementById('ca-rule');
  var passEl = document.getElementById('ca-pass');
  var pauseBtn = document.getElementById('ca-toggle');
  var themeBtn = document.getElementById('theme-toggle');
  var root = document.documentElement;
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  // ---- Theme ---------------------------------------------------------------
  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set === 'light' || set === 'dark') return set;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }
  function labelThemeButton() {
    if (themeBtn) themeBtn.textContent = currentTheme() === 'dark' ? 'Light mode' : 'Dark mode';
  }
  function onThemeChange() {
    labelThemeButton();
    if (g) { readColours(); repaintAll(); }
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      onThemeChange();
    });
  }
  if (darkQuery) {
    var onScheme = function () { onThemeChange(); };
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', onScheme);
    else if (darkQuery.addListener) darkQuery.addListener(onScheme);
  }
  labelThemeButton();

  if (!canvas || !canvas.getContext) return;

  // ---- Automaton -----------------------------------------------------------
  var ctx = canvas.getContext('2d');
  var g = null;            // current grid state
  var paused = false;
  var still = !!(motionQuery && motionQuery.matches); // reduced motion: draw one static pass
  var colours = { paper: '#f2f4f3', trail: [] };

  function hexToRgb(value, fallback) {
    var v = String(value || '').trim();
    var m = /^#([0-9a-f]{6})$/i.exec(v) || /^#([0-9a-f]{3})$/i.exec(v);
    if (!m) return fallback;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function readColours() {
    var cs = getComputedStyle(root);
    var paper = hexToRgb(cs.getPropertyValue('--paper'), [242, 244, 243]);
    var dim = hexToRgb(cs.getPropertyValue('--cell-dim'), [205, 213, 209]);
    var head = hexToRgb(cs.getPropertyValue('--cell-head'), [31, 79, 216]);
    colours.paper = 'rgb(' + paper.join(',') + ')';
    colours.trail = [];
    for (var k = 0; k < TRAIL; k++) {
      var t = Math.pow(k / (TRAIL - 1), 0.7);
      colours.trail.push('rgb(' +
        Math.round(head[0] + (dim[0] - head[0]) * t) + ',' +
        Math.round(head[1] + (dim[1] - head[1]) * t) + ',' +
        Math.round(head[2] + (dim[2] - head[2]) * t) + ')');
    }
  }

  function seed(n, sparse) {
    var row = new Uint8Array(n), i;
    if (sparse) {
      var count = 1 + Math.floor(Math.random() * 3);
      for (i = 0; i < count; i++) row[Math.floor(n * (0.2 + 0.6 * Math.random()))] = 1;
    } else {
      for (i = 0; i < n; i++) row[i] = Math.random() < 0.5 ? 1 : 0;
    }
    return row;
  }

  function pickRule() {
    var r;
    do { r = RULES[Math.floor(Math.random() * RULES.length)]; } while (r === g.rule && RULES.length > 1);
    g.rule = r;
    g.table = [];
    for (var i = 0; i < 8; i++) g.table.push((r >> i) & 1);
    g.pass += 1;
    if (ruleEl) ruleEl.textContent = 'Rule ' + r;
    if (passEl) passEl.textContent = 'pass ' + g.pass;
  }

  function nextRow(row) {
    var n = row.length, out = new Uint8Array(n), t = g.table;
    for (var i = 0; i < n; i++) {
      out[i] = t[(row[(i + n - 1) % n] << 2) | (row[i] << 1) | row[(i + 1) % n]];
    }
    return out;
  }

  function drawRow(y, colour) {
    var row = g.grid[y], top = y * CELL;
    ctx.fillStyle = colours.paper;
    ctx.fillRect(0, top, g.W, CELL);
    if (!row) return;
    ctx.fillStyle = colour;
    for (var x = 0; x < g.cols; x++) if (row[x]) ctx.fillRect(x * CELL, top, CELL, CELL);
  }

  function repaintAll() {
    var dimColour = colours.trail[TRAIL - 1];
    ctx.fillStyle = colours.paper;
    ctx.fillRect(0, 0, g.W, g.H);
    for (var y = 0; y < g.rows; y++) if (g.grid[y]) drawRow(y, dimColour);
  }

  function init() {
    var host = canvas.parentElement;
    var W = host.clientWidth, H = host.clientHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cols = Math.ceil(W / CELL) + 1, rows = Math.ceil(H / CELL);
    var pass = g ? g.pass - 1 : 0;
    g = { W: W, H: H, cols: cols, rows: rows, grid: new Array(rows), y: 0, pass: pass, rule: 0, table: null,
          cur: seed(cols, Math.random() < 0.5) };
    readColours();
    ctx.fillStyle = colours.paper;
    ctx.fillRect(0, 0, W, H);
    pickRule();
    if (still) fillPass();
  }

  function step() {
    var k, yy;
    g.grid[g.y] = g.cur;
    for (k = 0; k < TRAIL; k++) {
      yy = g.y - k;
      if (yy < 0) break;
      drawRow(yy, colours.trail[k]);
    }
    g.cur = nextRow(g.cur);
    g.y += 1;
    if (g.y >= g.rows) wrap();
  }

  function wrap() {
    var k, i, live = 0;
    for (k = 1; k <= TRAIL; k++) if (g.rows - k >= 0) drawRow(g.rows - k, colours.trail[TRAIL - 1]);
    g.y = 0;
    for (i = 0; i < g.cur.length; i++) if (g.cur[i]) live++;
    // Usually carry the last row into the next rule; sometimes start from a few cells.
    // Always reseed if the pattern died out or filled in completely.
    if (live < 2 || live > g.cur.length - 2) g.cur = seed(g.cols, false);
    else if (Math.random() < RESEED_CHANCE) g.cur = seed(g.cols, true);
    pickRule();
  }

  // Draw one whole pass at once, with no animation (used for reduced motion).
  function fillPass() {
    var dimColour = colours.trail[TRAIL - 1];
    for (var y = 0; y < g.rows; y++) { g.grid[y] = g.cur; drawRow(y, dimColour); g.cur = nextRow(g.cur); }
    g.y = 0;
  }

  var last = 0, acc = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (!last) last = t;
    var dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (paused || !g) return;
    acc += dt * SPEED;
    var n = Math.min(8, Math.floor(acc));
    acc -= Math.floor(acc);
    for (var i = 0; i < n; i++) step();
  }

  function labelPauseButton() {
    if (pauseBtn) pauseBtn.textContent = paused ? 'Play' : 'Pause';
  }
  if (pauseBtn) {
    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      if (!paused) still = false;
      labelPauseButton();
    });
  }

  function start() {
    if (still) paused = true;
    init();
    labelPauseButton();
    var timer = null;
    var onResize = function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var host = canvas.parentElement;
        if (host.clientWidth !== g.W || host.clientHeight !== g.H) init();
      }, 150);
    };
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(canvas.parentElement);
    else window.addEventListener('resize', onResize);
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
