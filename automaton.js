/* Background automaton, grid text and theme toggle. No dependencies.
 *
 * A one-dimensional cellular automaton is drawn row by row down the page. When it
 * reaches the bottom it wraps to the top and carries on under a new rule from RULES.
 *
 * Text in elements with class "gt" is drawn on the same grid in a small cell font and
 * never changes: the automaton flows around it. On hover, focus or tap, every cell in an
 * ".item" block flips over to its negative (the automaton keeps running inside the box)
 * and the block's ".desc" text appears.
 */
(function () {
  'use strict';

  // ---- Settings you may want to change -----------------------------------
  var SPEED = 28;          // rows drawn per second
  var TRAIL = 22;          // rows behind the leading edge that are still fading
  var RESEED_CHANCE = 0.4; // chance a new pass starts from a few cells instead of the last row
  var FLIP_TIME = 0.7;     // seconds for a block's cells to flip
  var SWEEP = 'down';      // direction the flip travels: 'down' (top to bottom) or 'diagonal'
  var PAD = 3;             // cells of padding inside a block (matches .item padding in style.css)
  // Cell size in CSS pixels, by page width (smaller cells fit more letters on phones).
  function cellSize(width) { return width >= 600 ? 4 : 3; }
  // Curated elementary rules: chaotic (30, 86), fractal (90, 150, 60, 102, 18, 22, 126, 146)
  // and structure-forming (110, 124, 54, 62, 106, 120). All are even-numbered,
  // so an empty background stays empty and the page never flashes.
  var RULES = [30, 86, 90, 150, 110, 124, 54, 62, 22, 126, 60, 102, 106, 120, 18, 146];
  // -------------------------------------------------------------------------

  // Cell font: rows of five cells per character. Capitals and digits use seven rows;
  // lowercase letters with tails (g j p q y) use two more below the baseline.
  var FONT = {
    'a': '00000 00000 01110 00001 01111 10001 01111', 'b': '10000 10000 10110 11001 10001 10001 11110',
    'c': '00000 00000 01110 10000 10000 10001 01110', 'd': '00001 00001 01101 10011 10001 10001 01111',
    'e': '00000 00000 01110 10001 11111 10000 01110', 'f': '00110 01001 01000 11100 01000 01000 01000',
    'g': '00000 00000 01111 10001 10001 10001 01111 00001 01110', 'h': '10000 10000 10110 11001 10001 10001 10001',
    'i': '00100 00000 01100 00100 00100 00100 01110', 'j': '00010 00000 00110 00010 00010 00010 00010 10010 01100',
    'k': '10000 10000 10010 10100 11000 10100 10010', 'l': '01100 00100 00100 00100 00100 00100 01110',
    'm': '00000 00000 11010 10101 10101 10001 10001', 'n': '00000 00000 10110 11001 10001 10001 10001',
    'o': '00000 00000 01110 10001 10001 10001 01110', 'p': '00000 00000 11110 10001 10001 10001 11110 10000 10000',
    'q': '00000 00000 01111 10001 10001 10001 01111 00001 00001', 'r': '00000 00000 10110 11001 10000 10000 10000',
    's': '00000 00000 01111 10000 01110 00001 11110', 't': '01000 01000 11100 01000 01000 01001 00110',
    'u': '00000 00000 10001 10001 10001 10011 01101', 'v': '00000 00000 10001 10001 10001 01010 00100',
    'w': '00000 00000 10001 10001 10101 10101 01010', 'x': '00000 00000 10001 01010 00100 01010 10001',
    'y': '00000 00000 10001 10001 10001 10001 01111 00001 01110', 'z': '00000 00000 11111 00010 00100 01000 11111',
    'A': '01110 10001 10001 11111 10001 10001 10001', 'B': '11110 10001 10001 11110 10001 10001 11110',
    'C': '01110 10001 10000 10000 10000 10001 01110', 'D': '11110 10001 10001 10001 10001 10001 11110',
    'E': '11111 10000 10000 11110 10000 10000 11111', 'F': '11111 10000 10000 11110 10000 10000 10000',
    'G': '01110 10001 10000 10111 10001 10001 01111', 'H': '10001 10001 10001 11111 10001 10001 10001',
    'I': '01110 00100 00100 00100 00100 00100 01110', 'J': '00111 00010 00010 00010 00010 10010 01100',
    'K': '10001 10010 10100 11000 10100 10010 10001', 'L': '10000 10000 10000 10000 10000 10000 11111',
    'M': '10001 11011 10101 10101 10001 10001 10001', 'N': '10001 11001 10101 10011 10001 10001 10001',
    'O': '01110 10001 10001 10001 10001 10001 01110', 'P': '11110 10001 10001 11110 10000 10000 10000',
    'Q': '01110 10001 10001 10001 10101 10010 01101', 'R': '11110 10001 10001 11110 10100 10010 10001',
    'S': '01111 10000 10000 01110 00001 00001 11110', 'T': '11111 00100 00100 00100 00100 00100 00100',
    'U': '10001 10001 10001 10001 10001 10001 01110', 'V': '10001 10001 10001 10001 10001 01010 00100',
    'W': '10001 10001 10001 10101 10101 11011 10001', 'X': '10001 10001 01010 00100 01010 10001 10001',
    'Y': '10001 10001 01010 00100 00100 00100 00100', 'Z': '11111 00001 00010 00100 01000 10000 11111',
    '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110',
    '2': '01110 10001 00001 00010 00100 01000 11111', '3': '11110 00001 00001 01110 00001 00001 11110',
    '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110',
    '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
    '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100',
    ',': '00000 00000 00000 00000 00000 00100 00100 01000', '.': '00000 00000 00000 00000 00000 01100 01100',
    "'": '00100 00100 00000 00000 00000 00000 00000', '-': '00000 00000 00000 01110 00000 00000 00000',
    '/': '00001 00001 00010 00100 01000 10000 10000', ':': '00000 01100 01100 00000 01100 01100 00000',
    '!': '00100 00100 00100 00100 00100 00000 00100', '?': '01110 10001 00001 00010 00100 00000 00100',
    '&': '01100 10010 10100 01000 10101 10010 01101'
  };
  // A slightly smaller 4-cell-wide font (lowercase letters only), for secondary links.
  var FONT_SMALL = {
    'a': '0000 0111 1001 1011 0101', 'b': '1000 1110 1001 1001 1110', 'c': '0000 0111 1000 1000 0111',
    'd': '0001 0111 1001 1001 0111', 'e': '0000 0110 1111 1000 0111', 'f': '0011 0100 1110 0100 0100',
    'g': '0000 0111 1001 1001 0111 0001 0110', 'h': '1000 1110 1001 1001 1001', 'i': '0100 0000 0100 0100 0100',
    'j': '0010 0000 0010 0010 0010 1010 0100', 'k': '1000 1001 1010 1110 1001', 'l': '0100 0100 0100 0100 0010',
    'm': '0000 1001 1111 1001 1001', 'n': '0000 1110 1001 1001 1001', 'o': '0000 0110 1001 1001 0110',
    'p': '0000 1110 1001 1001 1110 1000 1000', 'q': '0000 0111 1001 1001 0111 0001 0001', 'r': '0000 1011 1100 1000 1000',
    's': '0000 0111 1100 0011 1110', 't': '0100 1110 0100 0100 0011', 'u': '0000 1001 1001 1001 0111',
    'v': '0000 1001 1001 0110 0110', 'w': '0000 1001 1001 1111 1001', 'x': '0000 1001 0110 0110 1001',
    'y': '0000 1001 1001 1001 0111 0001 0110', 'z': '0000 1111 0010 0100 1111'
  };
  [FONT, FONT_SMALL].forEach(function (f) { Object.keys(f).forEach(function (k) { f[k] = f[k].split(' '); }); });
  // w: cells per letter; line: cells per line of text; under: row where an underline is drawn.
  var FONTS = {
    big: { glyphs: FONT, w: 5, line: 11, under: 9 },
    small: { glyphs: FONT_SMALL, w: 4, line: 10, under: 7 }
  };

  var page = document.getElementById('page');
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
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', onThemeChange);
    else if (darkQuery.addListener) darkQuery.addListener(onThemeChange);
  }
  labelThemeButton();

  if (!page || !canvas || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var C = 6;               // current cell size
  var g = null;            // grid state
  var paused = false;
  var reduced = !!(motionQuery && motionQuery.matches);
  var still = reduced;     // reduced motion: draw one static pass
  var col = { paper: '', ink: '', text: '', dim: '', box: '', boxCell: '', trail: [] };

  // ---- Grid text blocks ----------------------------------------------------
  var items = Array.prototype.map.call(page.querySelectorAll('.item'), function (el) {
    var blocks = Array.prototype.map.call(el.querySelectorAll('.gt'), function (b) {
      var small = b.getAttribute('data-font') === 'small';
      var text = (b.textContent || '').replace(/\s+/g, ' ').trim();
      return { el: b, text: small ? text.toLowerCase() : text, font: small ? FONTS.small : FONTS.big,
               underline: b.hasAttribute('data-underline'),
               scale: Math.max(1, parseInt(b.getAttribute('data-scale'), 10) || 1), lines: [] };
    });
    return { el: el, desc: el.querySelector('.desc'), blocks: blocks, x0: 0, y0: 0, x1: 0, y1: 0, dy0: 0, p: 0, target: 0, wasOpen: false };
  });

  function wrapText(text, maxCols, scale, adv) {
    var maxChars = Math.max(1, Math.floor((maxCols + scale) / (adv * scale)));
    var lines = [], line = '';
    text.split(' ').forEach(function (word) {
      if (!line) line = word;
      else if ((line + ' ' + word).length <= maxChars) line += ' ' + word;
      else { lines.push(line); line = word; }
    });
    if (line) lines.push(line);
    return lines;
  }

  // Size each text block's element to the rows its letters need, so the page layout
  // (and everything after it) makes room for the cells drawn on the canvas.
  function layout() {
    C = cellSize(page.clientWidth);
    page.style.setProperty('--cell', C + 'px');
    items.forEach(function (it) {
      // Inline blocks (several on one line) are sized to their text; others fill their column.
      var inline = it.el.classList.contains('inline');
      var cols = Math.floor((inline ? it.el.parentElement.clientWidth : it.el.clientWidth) / C) - 2 * PAD;
      it.blocks.forEach(function (b) {
        var adv = b.font.w + 1, longest = 0;
        b.lines = wrapText(b.text, cols, b.scale, adv);
        b.lines.forEach(function (line) { longest = Math.max(longest, line.length); });
        b.el.style.height = (b.lines.length * b.font.line * b.scale * C) + 'px';
        b.el.style.width = inline ? ((longest * adv - 1) * b.scale * C) + 'px' : '';
      });
    });
  }

  // mask[y][x]: 1 = a text cell, 2 = kept clear around text, 0 = the automaton's.
  function buildMask(cols, rows) {
    var mask = [], y, x, dy, dx;
    for (y = 0; y < rows; y++) mask.push(new Uint8Array(cols));
    var pr = page.getBoundingClientRect();
    items.forEach(function (it) {
      var r = it.el.getBoundingClientRect();
      it.x0 = Math.max(0, Math.round((r.left - pr.left) / C));
      it.y0 = Math.max(0, Math.round((r.top - pr.top) / C));
      it.x1 = Math.min(cols, Math.round((r.right - pr.left) / C));
      it.y1 = Math.min(rows, Math.round((r.bottom - pr.top) / C));
      var cy = it.y0 + PAD;
      // Rows from the description down are kept solid when the box is open, so it stays readable.
      it.dy0 = it.desc ? Math.max(it.y0, Math.floor((it.desc.getBoundingClientRect().top - pr.top) / C) - 1) : it.y1;
      it.blocks.forEach(function (b) {
        var adv = b.font.w + 1, sc = b.scale, left = it.x0 + PAD;
        b.lines.forEach(function (line) {
          var i, gr, gc, sy, sx, my, mx;
          for (i = 0; i < line.length; i++) {
            var glyph = b.font.glyphs[line.charAt(i)];
            if (!glyph) continue;
            for (gr = 0; gr < glyph.length; gr++) for (gc = 0; gc < b.font.w; gc++) {
              if (glyph[gr].charAt(gc) !== '1') continue;
              for (sy = 0; sy < sc; sy++) for (sx = 0; sx < sc; sx++) {
                my = cy + gr * sc + sy; mx = left + (i * adv + gc) * sc + sx;
                if (my >= 0 && my < rows && mx >= 0 && mx < cols) mask[my][mx] = 1;
              }
            }
          }
          if (b.underline) {
            // A line of cells under the text, broken where a letter's tail comes down to it.
            var uy = cy + b.font.under * sc, above = uy - 1, width = (line.length * adv - 1) * sc;
            for (sx = 0; sx < width; sx++) {
              mx = left + sx;
              if (uy >= rows || mx < 1 || mx >= cols - 1) continue;
              if (above >= 0 && (mask[above][mx - 1] === 1 || mask[above][mx] === 1 || mask[above][mx + 1] === 1)) continue;
              for (sy = 0; sy < sc && uy + sy < rows; sy++) mask[uy + sy][mx] = 1;
            }
          }
          cy += b.font.line * sc;
        });
      });
    });
    for (y = 0; y < rows; y++) for (x = 0; x < cols; x++) {
      if (mask[y][x] !== 1) continue;
      for (dy = -1; dy <= 1; dy++) for (dx = -1; dx <= 1; dx++) {
        if (y + dy >= 0 && y + dy < rows && x + dx >= 0 && x + dx < cols && mask[y + dy][x + dx] === 0) mask[y + dy][x + dx] = 2;
      }
    }
    return mask;
  }

  // ---- Colours -------------------------------------------------------------
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
    var ink = hexToRgb(cs.getPropertyValue('--ink'), [16, 32, 28]);
    var dim = hexToRgb(cs.getPropertyValue('--cell-dim'), [205, 213, 209]);
    var head = hexToRgb(cs.getPropertyValue('--cell-head'), [31, 79, 216]);
    col.paper = 'rgb(' + paper.join(',') + ')';
    col.ink = 'rgb(' + ink.join(',') + ')';
    col.text = 'rgb(' + hexToRgb(cs.getPropertyValue('--cell-text'), ink).join(',') + ')';
    col.trail = [];
    for (var k = 0; k < TRAIL; k++) {
      var t = Math.pow(k / (TRAIL - 1), 0.7);
      col.trail.push('rgb(' +
        Math.round(head[0] + (dim[0] - head[0]) * t) + ',' +
        Math.round(head[1] + (dim[1] - head[1]) * t) + ',' +
        Math.round(head[2] + (dim[2] - head[2]) * t) + ')');
    }
    col.dim = col.trail[TRAIL - 1];
// The open box: its fill colour, and a quieter tone of it for live cells inside.
    var box = hexToRgb(cs.getPropertyValue('--box'), head);
    col.box = 'rgb(' + box.join(',') + ')';
    col.boxCell = 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(box[i] + (paper[i] - box[i]) * 0.22); }).join(',') + ')';
  }

  // ---- Automaton -----------------------------------------------------------
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
    var row = g.grid[y], m = g.mask[y], top = y * C, x, i, it;
    ctx.fillStyle = col.paper;
    ctx.fillRect(0, top, g.W, C);
    if (row) {
      ctx.fillStyle = colour;
      for (x = 0; x < g.cols; x++) if (row[x] && !m[x]) ctx.fillRect(x * C, top, C, C);
    }
    ctx.fillStyle = col.text;
    for (x = 0; x < g.cols; x++) if (m[x] === 1) ctx.fillRect(x * C, top, C, C);
    for (i = 0; i < items.length; i++) {
      it = items[i];
      if (it.p > 0 && y >= it.y0 && y < it.y1) paintBoxRow(it, y, colour);
    }
  }

  function repaintAll() {
    ctx.fillStyle = col.paper;
    ctx.fillRect(0, 0, g.W, g.H);
    for (var y = 0; y < g.rows; y++) drawRow(y, col.dim);
  }

  // ---- Flipping boxes ------------------------------------------------------
  // The box works like a flip-dot board: every cell is always a whole cell, showing
  // either its front or its back face, and the cells clatter over one by one in a
  // sweep (see SWEEP) with a little randomness. The back face is the negative of the
  // front: empty cells take the box colour, live cells a quieter tone of it, and the text
  // switches to the paper colour. The automaton keeps running inside an open box.
  function backFace(it, x, y, m, live, colour) {
    if (m === 1) return col.paper;
    if (m === 0 && y < it.dy0 && live) return col.boxCell;
    return col.box;
  }
  function paintTile(it, x, y, colour) {
    var w = it.x1 - it.x0, h = it.y1 - it.y0;
    var d = SWEEP === 'diagonal' ? ((x - it.x0) + (y - it.y0)) / Math.max(1, w + h) : (y - it.y0) / Math.max(1, h);
    // A fixed pseudo-random offset per cell, so neighbours don't all flip together.
    var jitter = ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000) / 1000;
    var at = 0.04 + d * 0.62 + jitter * 0.3;   // the moment (0..1) this cell flips
    var m = g.mask[y][x], live = !!(g.grid[y] && g.grid[y][x]), face = null;
    if (it.p > at + 0.03) face = backFace(it, x, y, m, live, colour);
    else if (it.p > at) face = col.text;        // edge-on for an instant, mid-flip
    else if (m === 1) face = col.text;
    else if (m === 0 && live) face = colour;
    ctx.fillStyle = face || col.paper;
    ctx.fillRect(x * C, y * C, C, C);
  }
  function paintBoxRow(it, y, colour) {
    var x, m = g.mask[y], row = g.grid[y];
    colour = colour || col.dim;
    if (it.p >= 1) {
      ctx.fillStyle = col.box;
      ctx.fillRect(it.x0 * C, y * C, (it.x1 - it.x0) * C, C);
      if (row && y < it.dy0) {
        ctx.fillStyle = col.boxCell;
        for (x = it.x0; x < it.x1; x++) if (row[x] && m[x] === 0) ctx.fillRect(x * C, y * C, C, C);
      }
      ctx.fillStyle = col.paper;
      for (x = it.x0; x < it.x1; x++) if (m[x] === 1) ctx.fillRect(x * C, y * C, C, C);
    } else {
      for (x = it.x0; x < it.x1; x++) paintTile(it, x, y, colour);
    }
  }
  function paintBox(it) {
    for (var y = it.y0; y < it.y1; y++) {
      if (it.p > 0) paintBoxRow(it, y); else drawRow(y, col.dim);
    }
  }
  function setOpen(it, open) {
    it.target = open ? 1 : 0;
    it.el.classList.toggle('is-open', !!open);
    if (reduced && g) { it.p = it.target; paintBox(it); }
  }
  function animateBoxes(dt) {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.p === it.target) continue;
      var stepSize = dt / FLIP_TIME;
      it.p = it.target > it.p ? Math.min(1, it.p + stepSize) : Math.max(0, it.p - stepSize);
      paintBox(it);
    }
  }

  var lastPointer = 'mouse';
  items.forEach(function (it) {
    it.el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') setOpen(it, true); });
    it.el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') setOpen(it, false); });
    it.el.addEventListener('focus', function () { setOpen(it, true); });
    it.el.addEventListener('blur', function () { if (lastPointer === 'mouse') setOpen(it, false); });
    // Touch: the first tap flips the block open, a second tap follows the link.
    it.el.addEventListener('pointerdown', function (e) {
      lastPointer = e.pointerType || 'mouse';
      if (lastPointer === 'mouse') return;
      it.wasOpen = it.target === 1;
      items.forEach(function (other) { if (other !== it) setOpen(other, false); });
      setOpen(it, true);
    });
    it.el.addEventListener('click', function (e) {
      if (lastPointer !== 'mouse' && !it.wasOpen) e.preventDefault();
    });
  });
  document.addEventListener('pointerdown', function (e) {
    lastPointer = e.pointerType || 'mouse';
    if (lastPointer === 'mouse') return;
    var inside = e.target && e.target.closest ? e.target.closest('.item') : null;
    if (!inside) items.forEach(function (it) { setOpen(it, false); });
  });

  // ---- Set-up and main loop ------------------------------------------------
  function init() {
    layout();
    var W = page.clientWidth, H = page.clientHeight;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var cols = Math.ceil(W / C) + 1, rows = Math.ceil(H / C);
    var pass = g ? g.pass - 1 : 0;
    g = { W: W, H: H, cols: cols, rows: rows, grid: new Array(rows), mask: buildMask(cols, rows),
          y: 0, pass: pass, rule: 0, table: null, cur: seed(cols, Math.random() < 0.5) };
    items.forEach(function (it) { it.p = it.target; });
    readColours();
    pickRule();
    if (still) { for (var y = 0; y < rows; y++) { g.grid[y] = g.cur; g.cur = nextRow(g.cur); } }
    repaintAll();
  }

  function step() {
    var k, yy;
    g.grid[g.y] = g.cur;
    for (k = 0; k < TRAIL; k++) {
      yy = g.y - k;
      if (yy < 0) break;
      drawRow(yy, col.trail[k]);
    }
    g.cur = nextRow(g.cur);
    g.y += 1;
    if (g.y >= g.rows) wrap();
  }

  function wrap() {
    var k, i, live = 0;
    for (k = 1; k <= TRAIL; k++) if (g.rows - k >= 0) drawRow(g.rows - k, col.dim);
    g.y = 0;
    for (i = 0; i < g.cur.length; i++) if (g.cur[i]) live++;
    // Usually carry the last row into the next rule; sometimes start from a few cells.
    // Always reseed if the pattern died out or filled in completely.
    if (live < 2 || live > g.cur.length - 2) g.cur = seed(g.cols, false);
    else if (Math.random() < RESEED_CHANCE) g.cur = seed(g.cols, true);
    pickRule();
  }

  var last = 0, acc = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (!last) last = t;
    var dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (!g) return;
    if (!paused) {
      acc += dt * SPEED;
      var n = Math.min(8, Math.floor(acc));
      acc -= Math.floor(acc);
      for (var i = 0; i < n; i++) step();
    }
    animateBoxes(dt);
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
        if (page.clientWidth !== g.W || page.clientHeight !== g.H) init();
      }, 150);
    };
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(page);
    else window.addEventListener('resize', onResize);
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
