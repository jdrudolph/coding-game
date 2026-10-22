// ============================================================================
// PIXEL RENDERER: ward scene, sprites, bitmap font, particles
// Internal resolution 384x216, scaled up with nearest-neighbour.
// ============================================================================
const VW = 384, VH = 216;

// ---- 3x5 bitmap font
const GLYPHS = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001011001111', '4': '101101111001001',
  '5': '111100111001111', '6': '111100111101111', '7': '111001010010010', '8': '111101111101111', '9': '111101111001111',
  'A': '010101111101101', 'B': '110101110101110', 'C': '011100100100011', 'D': '110101101101110', 'E': '111100110100111',
  'F': '111100110100100', 'G': '011100101101011', 'H': '101101111101101', 'I': '111010010010111', 'J': '001001001101010',
  'K': '101101110101101', 'L': '100100100100111', 'M': '101111111101101', 'N': '110101101101101', 'O': '010101101101010',
  'P': '110101110100100', 'Q': '010101101110011', 'R': '110101110101101', 'S': '011100010001110', 'T': '111010010010010',
  'U': '101101101101111', 'V': '101101101101010', 'W': '101101111111101', 'X': '101101010101101', 'Y': '101101010010010',
  'Z': '111001010100111', '.': '000000000000010', ':': '000010000010000', '-': '000000111000000', '+': '000010111010000',
  '/': '001001010100100', '!': '010010010000010', '?': '111001010000010', '%': '101001010100101', '€': '011100111100011',
  '(': '010100100100010', ')': '010001001001010', ',': '000000000010100', "'": '010010000000000', '>': '100010001010100',
  '<': '001010100010001', '#': '101111101111101', ' ': '000000000000000', '=': '000111000111000', '*': '000101010101000',
};
function ptext(ctx, str, x, y, color, scale = 1, align = 'left') {
  str = String(str).toUpperCase();
  const w = str.length * 4 * scale - scale;
  if (align === 'center') x -= Math.floor(w / 2); else if (align === 'right') x -= w;
  ctx.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const g = GLYPHS[str[i]] || GLYPHS['?'];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') ctx.fillRect(x + (i * 4 + c) * scale, y + r * scale, scale, scale);
  }
  return w;
}
function ptextOutlined(ctx, str, x, y, color, outline, scale = 1, align = 'left') {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) ptext(ctx, str, x + dx, y + dy, outline, scale, align);
  return ptext(ctx, str, x, y, color, scale, align);
}

function R(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); }
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r + amt))); g = Math.max(0, Math.min(255, Math.round(g + amt))); b = Math.max(0, Math.min(255, Math.round(b + amt)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ---- layout
function bedLayout(n) {
  const gap = 47, w = 30; const total = n * w + (n - 1) * (gap - w);
  const x0 = Math.round(52 + (330 - total) / 2);
  const out = []; for (let i = 0; i < n; i++) out.push({ x: x0 + i * gap, y: 52, w, h: 54 });
  return out;
}
const DOOR = { x: 8, y: 34, w: 32, h: 26 };
const AISLE_Y = 128;
const SPOTS = { door: { x: 24, y: 70 }, station: { x: 178, y: 160 }, desk: { x: 290, y: 168 }, coffee: { x: 352, y: 186 }, wait: [{ x: 14, y: 186 }, { x: 28, y: 186 }, { x: 42, y: 186 }] };

// ============================================================================
// STATIC BACKGROUND
// ============================================================================
function buildBackground(ward, beds) {
  const c = document.createElement('canvas'); c.width = VW; c.height = VH; const ctx = c.getContext('2d');
  const icu = ward.icu;
  const wallA = icu ? '#93aebd' : '#a3bdb5', wallB = shade(wallA, -14), wallC = shade(wallA, -40);
  // ceiling edge + wall
  R(ctx, 0, 0, VW, 4, '#2c3a3c');
  R(ctx, 0, 4, VW, 38, wallA);
  for (let x = 0; x < VW; x += 2) R(ctx, x, 4 + ((x * 7) % 5), 1, 1, shade(wallA, 6));
  R(ctx, 0, 42, VW, 2, shade(wallA, 20));
  R(ctx, 0, 44, VW, 14, wallB);
  R(ctx, 0, 58, VW, 3, wallC);
  // floor tiles
  const fA = icu ? '#c6d2d8' : '#cad7cf', fB = icu ? '#bcc9d0' : '#bfcec5', grout = icu ? '#aebcc4' : '#b2c2b9';
  for (let y = 61; y < VH; y += 12) for (let x = 0; x < VW; x += 12) {
    R(ctx, x, y, 12, 12, ((x / 12 + (y - 61) / 12) & 1) ? fA : fB);
    R(ctx, x, y, 12, 1, grout); R(ctx, x, y, 1, 12, grout);
  }
  // floor shine streaks
  ctx.globalAlpha = 0.18; for (let i = 0; i < 9; i++) R(ctx, 30 + i * 44, 64, 2, 150, '#ffffff'); ctx.globalAlpha = 1;
  // walkway stripe
  R(ctx, 0, AISLE_Y + 16, VW, 2, icu ? '#7fa6c4' : '#7fb8a4');
  R(ctx, 0, AISLE_Y + 19, VW, 1, icu ? '#7fa6c4' : '#7fb8a4');

  // door with exit sign
  R(ctx, DOOR.x - 2, DOOR.y - 3, DOOR.w + 4, DOOR.h + 3, '#5d6f70');
  R(ctx, DOOR.x, DOOR.y, DOOR.w, DOOR.h, '#d9e3df');
  R(ctx, DOOR.x + DOOR.w / 2, DOOR.y, 1, DOOR.h, '#8a9c9a');
  for (const dx of [5, 21]) { R(ctx, DOOR.x + dx, DOOR.y + 5, 6, 6, '#7aa6b8'); R(ctx, DOOR.x + dx + 1, DOOR.y + 6, 2, 2, '#c8e4ee'); }
  R(ctx, DOOR.x + 13, DOOR.y + 14, 2, 4, '#8a9c9a'); R(ctx, DOOR.x + 17, DOOR.y + 14, 2, 4, '#8a9c9a');
  // door mat
  R(ctx, DOOR.x, 61, DOOR.w, 6, '#55606a'); for (let x = DOOR.x + 1; x < DOOR.x + DOOR.w; x += 3) R(ctx, x, 62, 1, 4, '#646f7a');

  // hand sanitiser
  R(ctx, 46, 40, 5, 9, '#e8eef0'); R(ctx, 47, 42, 3, 4, '#7ac0e0'); R(ctx, 48, 49, 1, 2, '#9aa');

  // per-bed wall details (windows drawn dynamically)
  for (const b of beds) {
    // window frame
    R(ctx, b.x - 1, 6, b.w + 2, 30, '#e9efe9'); R(ctx, b.x - 1, 35, b.w + 2, 2, '#c9d3cd');
    // bed light
    R(ctx, b.x + 9, 38, 12, 3, '#d8d8c8'); R(ctx, b.x + 10, 41, 10, 1, '#fff6c8');
    // oxygen / wall outlets
    R(ctx, b.x + b.w + 3, 46, 6, 6, '#e6ece8'); R(ctx, b.x + b.w + 4, 47, 2, 2, '#4f9e5a'); R(ctx, b.x + b.w + 7, 47, 1, 2, '#3f6fbf'); R(ctx, b.x + b.w + 4, 50, 4, 1, '#c03c3c');
  }

  // nurse station
  const sx = 128, sy = 166;
  R(ctx, sx - 2, sy + 26, 110, 4, 'rgba(0,0,0,0.12)');
  R(ctx, sx, sy, 104, 8, '#e9dcc2'); R(ctx, sx, sy + 8, 104, 2, '#cdbb98');
  R(ctx, sx, sy + 10, 104, 18, '#5f7fa6'); R(ctx, sx, sy + 10, 104, 1, '#7d9cc2');
  for (let i = 0; i < 6; i++) R(ctx, sx + 6 + i * 17, sy + 14, 10, 10, '#56769c');
  ptext(ctx, 'NURSES', sx + 52, sy + 16, '#dfe8f4', 1, 'center');
  // station top items
  R(ctx, sx + 8, sy - 7, 14, 9, '#2a2f3a'); R(ctx, sx + 9, sy - 6, 12, 6, '#3d6f8f'); R(ctx, sx + 14, sy + 2, 4, 2, '#2a2f3a');
  R(ctx, sx + 30, sy + 1, 8, 5, '#f4f4ee'); R(ctx, sx + 31, sy + 2, 6, 1, '#b8c'); R(ctx, sx + 40, sy + 2, 7, 4, '#f4f4ee');
  R(ctx, sx + 70, sy - 1, 6, 6, '#c03c3c'); R(ctx, sx + 71, sy, 4, 2, '#e65c5c');
  R(ctx, sx + 86, sy - 6, 5, 8, '#9a6a3a'); R(ctx, sx + 84, sy - 11, 9, 6, '#4f9e5a'); R(ctx, sx + 86, sy - 13, 5, 3, '#6fbf6a');

  // coder desk
  const dx = 268, dy = 178;
  R(ctx, dx - 1, dy + 20, 58, 3, 'rgba(0,0,0,0.12)');
  R(ctx, dx, dy, 56, 6, '#b88a5a'); R(ctx, dx, dy + 6, 56, 2, '#8a6440'); R(ctx, dx + 2, dy + 8, 3, 12, '#8a6440'); R(ctx, dx + 51, dy + 8, 3, 12, '#8a6440');
  R(ctx, dx + 4, dy - 10, 16, 11, '#1f2430'); R(ctx, dx + 24, dy - 10, 16, 11, '#1f2430'); R(ctx, dx + 11, dy + 1, 2, 2, '#1f2430'); R(ctx, dx + 31, dy + 1, 2, 2, '#1f2430');
  R(ctx, dx + 43, dy - 7, 9, 2, '#f4f4ee'); R(ctx, dx + 43, dy - 5, 9, 2, '#e4e8f4'); R(ctx, dx + 43, dy - 3, 9, 2, '#f4f4ee'); R(ctx, dx + 43, dy - 1, 9, 2, '#e8e4d4');

  // coffee machine
  const cx = 344, cy = 152;
  R(ctx, cx - 4, cy + 22, 28, 18, '#6f7e86'); R(ctx, cx - 4, cy + 22, 28, 2, '#8a9aa2');
  R(ctx, cx, cy, 20, 22, '#2b2f36'); R(ctx, cx + 1, cy + 1, 18, 4, '#3d434c');
  R(ctx, cx + 4, cy + 7, 12, 8, '#171a1f'); R(ctx, cx + 8, cy + 10, 4, 1, '#888');
  R(ctx, cx + 6, cy + 16, 8, 1, '#5a5f66');
  R(ctx, cx - 3, cy + 40, 26, 2, 'rgba(0,0,0,0.15)');

  // waiting chairs
  for (let i = 0; i < 3; i++) { const x = 6 + i * 14; R(ctx, x, 190, 12, 4, '#4a78b0'); R(ctx, x, 182, 12, 8, '#5a88c0'); R(ctx, x + 1, 194, 2, 6, '#3a4a5a'); R(ctx, x + 9, 194, 2, 6, '#3a4a5a'); }
  ptext(ctx, 'WAIT', 27, 206, '#5a6a72', 1, 'center');

  // plants
  for (const [px, py] of [[80, 196], [242, 196], [370, 120]]) {
    R(ctx, px - 4, py, 9, 8, '#b8693a'); R(ctx, px - 5, py, 11, 2, '#d0804a');
    R(ctx, px - 5, py - 7, 4, 7, '#3f8e4a'); R(ctx, px + 1, py - 9, 4, 9, '#4f9e5a'); R(ctx, px - 2, py - 11, 3, 6, '#6fbf6a'); R(ctx, px + 3, py - 5, 3, 5, '#3f8e4a');
  }
  // water cooler
  R(ctx, 104, 182, 10, 18, '#e4ecf0'); R(ctx, 105, 172, 8, 10, '#8fc8ee'); R(ctx, 106, 173, 2, 6, '#c8e8fa'); R(ctx, 107, 188, 4, 2, '#3f6fbf');
  return c;
}

// ============================================================================
// DYNAMIC DRAWING
// ============================================================================
function skyColors(hour) {
  // returns [top, bottom, isNight]
  if (hour < 5 || hour >= 21) return ['#0b1030', '#1a2350', true];
  if (hour < 7) return ['#3a3a78', '#e8946a', false];
  if (hour < 17) return ['#5fa8e8', '#bfe2f8', false];
  if (hour < 19) return ['#6a78c8', '#f4b07a', false];
  return ['#2a2a68', '#8a5a8a', true];
}
function nightAlpha(hour) {
  if (hour >= 22 || hour < 5) return 0.42;
  if (hour >= 19) return 0.12 + (hour - 19) * 0.1;
  if (hour < 7) return 0.42 - (hour - 5) * 0.18;
  return 0;
}

function drawWindows(ctx, beds, t, hour) {
  const [top, bot, night] = skyColors(hour);
  for (const b of beds) {
    const x = b.x + 1, y = 8, w = b.w - 2, h = 26;
    for (let i = 0; i < h; i++) { ctx.fillStyle = i < h / 2 ? top : bot; ctx.fillRect(x, y + i, w, 1); }
    // blend middle
    R(ctx, x, y + 12, w, 2, shade(bot, -10));
    if (night) {
      for (let s = 0; s < 4; s++) { const sx = x + ((b.x * 7 + s * 11) % w), sy = y + ((b.x + s * 5) % 12); R(ctx, sx, sy, 1, 1, (Math.floor(t * 3 + s) % 4) ? '#ffffff' : '#8890c0'); }
      if (b === beds[1]) { R(ctx, x + 18, y + 3, 5, 5, '#f4f0d8'); R(ctx, x + 20, y + 3, 3, 3, top); }
    } else {
      // clouds
      const cx = x + ((t * 6 + b.x * 3) % (w + 20)) - 10;
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      R(ctx, cx, y + 6, 10, 3, '#ffffff'); R(ctx, cx + 2, y + 4, 6, 2, '#ffffff'); R(ctx, cx + 14, y + 15, 8, 2, '#f0f6ff');
      // distant buildings
      R(ctx, x, y + h - 6, 6, 6, '#8aa0b8'); R(ctx, x + 8, y + h - 9, 5, 9, '#7a90a8'); R(ctx, x + 16, y + h - 5, 7, 5, '#8aa0b8'); R(ctx, x + 24, y + h - 8, 4, 8, '#7a90a8');
      ctx.restore();
      if (b === beds[0] && hour >= 7 && hour < 17) { R(ctx, x + 20, y + 3, 4, 4, '#fff4b0'); }
    }
    if (night) { R(ctx, x, y + h - 6, 6, 6, '#1a2040'); R(ctx, x + 8, y + h - 9, 5, 9, '#141a38'); R(ctx, x + 16, y + h - 5, 7, 5, '#1a2040'); R(ctx, x + 24, y + h - 8, 4, 8, '#141a38'); R(ctx, x + 9, y + h - 7, 1, 1, '#f4d870'); R(ctx, x + 25, y + h - 5, 1, 1, '#f4d870'); }
    // mullions
    R(ctx, x + Math.floor(w / 2), y, 1, h, '#e9efe9'); R(ctx, x, y + 12, w, 1, '#e9efe9');
  }
}

function drawClock(ctx, x, y, hour, minute) {
  R(ctx, x - 6, y - 6, 13, 13, '#2c3438'); R(ctx, x - 5, y - 5, 11, 11, '#f4f4ee');
  R(ctx, x - 6, y - 6, 1, 1, 'rgba(0,0,0,0)');
  for (const [dx, dy] of [[0, -4], [4, 0], [0, 4], [-4, 0]]) R(ctx, x + dx, y + dy, 1, 1, '#555');
  const ha = ((hour % 12) + minute / 60) / 12 * Math.PI * 2, ma = minute / 60 * Math.PI * 2;
  for (let i = 0; i <= 2; i++) R(ctx, x + Math.round(Math.sin(ha) * i), y - Math.round(Math.cos(ha) * i), 1, 1, '#222');
  for (let i = 0; i <= 4; i++) R(ctx, x + Math.round(Math.sin(ma) * i), y - Math.round(Math.cos(ma) * i), 1, 1, '#c03c3c');
}

function drawHead(ctx, x, y, look, facing = 'down') {
  // 8x8 head, x,y top-left
  const { skin, hair, bald } = look;
  R(ctx, x + 1, y, 6, 8, skin); R(ctx, x, y + 1, 8, 6, skin);
  if (!bald) { R(ctx, x, y, 8, 3, hair); R(ctx, x + 1, y - 1, 6, 1, hair); R(ctx, x, y + 3, 1, 2, hair); R(ctx, x + 7, y + 3, 1, 2, hair); }
  else { R(ctx, x, y + 2, 1, 3, hair); R(ctx, x + 7, y + 2, 1, 3, hair); R(ctx, x + 2, y, 4, 1, shade(skin, 18)); }
  if (facing === 'down') { R(ctx, x + 2, y + 4, 1, 1, '#2a2020'); R(ctx, x + 5, y + 4, 1, 1, '#2a2020'); R(ctx, x + 1, y + 5, 1, 1, shade(skin, -12)); R(ctx, x + 6, y + 5, 1, 1, shade(skin, -12)); }
  else if (facing === 'up') { R(ctx, x, y, 8, 6, hair); }
}

function drawBed(ctx, b, p, t, opts) {
  const { x, y, w } = b; const icu = opts.icu;
  // shadow
  ctx.globalAlpha = 0.16; R(ctx, x + 2, y + 52, w, 4, '#000'); ctx.globalAlpha = 1;
  // headboard
  R(ctx, x - 1, y - 1, w + 2, 6, icu ? '#4a5f78' : '#5d6e7e'); R(ctx, x, y, w, 1, icu ? '#6a82a0' : '#7d8e9e');
  // frame
  R(ctx, x, y + 5, w, 46, '#9aa6ae'); R(ctx, x + 1, y + 5, w - 2, 45, '#f2f5f4');
  // mattress shading
  R(ctx, x + 1, y + 48, w - 2, 2, '#d8dedc');
  // footboard
  R(ctx, x - 1, y + 50, w + 2, 4, icu ? '#4a5f78' : '#5d6e7e');
  // wheels
  R(ctx, x, y + 54, 3, 2, '#2a2f36'); R(ctx, x + w - 3, y + 54, 3, 2, '#2a2f36');
  // pillow
  R(ctx, x + 6, y + 6, w - 12, 8, '#ffffff'); R(ctx, x + 6, y + 13, w - 12, 1, '#dfe6e8');
  if (p && p.inBed) {
    const look = p.look; const bl = look.blanket;
    // body under blanket
    R(ctx, x + 3, y + 18, w - 6, 31, bl); R(ctx, x + 3, y + 18, w - 6, 3, '#ffffff'); R(ctx, x + 3, y + 21, w - 6, 1, shade(bl, -25));
    for (let yy = y + 25; yy < y + 48; yy += 6) R(ctx, x + 3, yy, w - 6, 1, shade(bl, 18));
    R(ctx, x + 9, y + 22, w - 18, 26, shade(bl, -10)); // body bump
    R(ctx, x + 10, y + 23, w - 20, 1, shade(bl, 10));
    // arms
    R(ctx, x + 6, y + 21, 3, 9, look.skin === '#7a4a2e' ? '#7a4a2e' : '#e6eef4'); R(ctx, x + w - 9, y + 21, 3, 9, '#e6eef4');
    R(ctx, x + 6, y + 29, 3, 2, look.skin); R(ctx, x + w - 9, y + 29, 3, 2, look.skin);
    // head (breathing bob)
    const bob = Math.floor(t * 1.2 + p.id) % 2;
    drawHead(ctx, x + 11, y + 9 + bob * 0, look, 'down');
    if (opts.sleep) { R(ctx, x + 13, y + 13, 1, 1, look.skin); R(ctx, x + 16, y + 13, 1, 1, look.skin); R(ctx, x + 13, y + 13, 1, 1, '#4a3a3a'); R(ctx, x + 16, y + 13, 1, 1, '#4a3a3a'); }
    // IV line
    R(ctx, x + w - 7, y + 26, 1, 1, '#a8d8f0');
  } else {
    R(ctx, x + 3, y + 22, w - 6, 26, opts.cleaning ? '#e8e8e0' : '#dfe8ee'); R(ctx, x + 3, y + 22, w - 6, 2, '#ffffff');
    for (let yy = y + 27; yy < y + 48; yy += 5) R(ctx, x + 3, yy, w - 6, 1, '#cfdbe2');
  }
  // side equipment
  if (icu) {
    // ventilator
    R(ctx, x + w + 2, y + 18, 11, 16, '#e4e8ec'); R(ctx, x + w + 3, y + 20, 9, 5, '#203040'); R(ctx, x + w + 3, y + 34, 2, 4, '#5a6470'); R(ctx, x + w + 10, y + 34, 2, 4, '#5a6470');
    if (p && p.inBed) { R(ctx, x + w + 1, y + 24, 1, 1, '#a8c8e8'); R(ctx, x + w - 2, y + 16, 3, 1, '#a8c8e8'); }
  } else {
    // bedside table
    R(ctx, x + w + 3, y + 22, 10, 12, '#d8c8a8'); R(ctx, x + w + 3, y + 22, 10, 2, '#e8dcc0'); R(ctx, x + w + 4, y + 28, 8, 1, '#b8a888');
    if (p && p.inBed && p.id % 3 === 0) { R(ctx, x + w + 6, y + 17, 3, 5, '#d8e8f0'); R(ctx, x + w + 5, y + 14, 2, 2, '#e8608a'); R(ctx, x + w + 8, y + 13, 2, 2, '#f0c040'); R(ctx, x + w + 6, y + 12, 2, 2, '#e8608a'); }
    if (p && p.inBed && p.id % 3 === 1) { R(ctx, x + w + 5, y + 19, 5, 3, '#f0e0a0'); R(ctx, x + w + 6, y + 18, 3, 1, '#c03c3c'); }
  }
  // IV pole
  R(ctx, x - 6, y - 4, 1, 50, '#8a969e'); R(ctx, x - 8, y + 46, 5, 1, '#5a646c');
  if (p && p.inBed) { R(ctx, x - 9, y - 4, 4, 7, '#c8e8f8'); R(ctx, x - 8, y - 1, 2, 3, '#a8d4ee'); }
  // monitor
  R(ctx, x - 12, y - 14, 12, 9, '#2a3038'); R(ctx, x - 11, y - 13, 10, 7, '#0c1a14'); R(ctx, x - 7, y - 5, 2, 3, '#2a3038');
}

function drawMonitorGlow(ctx, b, p, t, alarm) {
  const x = b.x - 11, y = b.y - 13;
  if (!p || !p.inBed) { R(ctx, x + 1, y + 3, 8, 1, '#1d3a2c'); return; }
  const col = alarm ? ((Math.floor(t * 4) % 2) ? '#ff5c6c' : '#802030') : '#3ef08a';
  // scrolling ECG
  const off = Math.floor(t * 12 + p.id * 3) % 10;
  for (let i = 0; i < 10; i++) {
    const ph = (i + off) % 10; let dy = 3;
    if (ph === 4) dy = 1; else if (ph === 5) dy = 5; else if (ph === 6) dy = 2;
    R(ctx, x + i, y + dy, 1, 1, col);
  }
  R(ctx, x + 8, y, 2, 1, '#f4d870');
}

// ---- characters (10x18 box, x,y = feet center)
function drawPerson(ctx, x, y, o, t) {
  const walking = o.walking; const frame = walking ? Math.floor(t * 8) % 2 : 0; const dir = o.dir || 1;
  x = Math.round(x); y = Math.round(y);
  ctx.globalAlpha = 0.2; R(ctx, x - 4, y - 1, 9, 2, '#000'); ctx.globalAlpha = 1;
  const top = o.top, pants = o.pants || shade(o.top, -20);
  // legs
  if (walking) { R(ctx, x - 3, y - 6 + (frame ? 1 : 0), 2, 5 - (frame ? 1 : 0), pants); R(ctx, x + 1, y - 6 + (frame ? 0 : 1), 2, 5 - (frame ? 0 : 1), pants); }
  else { R(ctx, x - 3, y - 6, 2, 5, pants); R(ctx, x + 1, y - 6, 2, 5, pants); }
  R(ctx, x - 3, y - 1, 2, 1, '#222'); R(ctx, x + 1, y - 1, 2, 1, '#222');
  // torso
  R(ctx, x - 4, y - 13, 8, 7, top);
  if (o.coat) { R(ctx, x - 4, y - 13, 8, 8, '#f4f6f8'); R(ctx, x - 1, y - 13, 2, 6, top); R(ctx, x - 4, y - 6, 2, 1, '#f4f6f8'); R(ctx, x + 2, y - 6, 2, 1, '#f4f6f8'); R(ctx, x - 2, y - 12, 1, 4, '#3a3a44'); R(ctx, x + 1, y - 12, 1, 3, '#3a3a44'); R(ctx, x - 2, y - 8, 4, 1, '#3a3a44'); }
  // arms
  const sw = walking ? (frame ? 1 : -1) : 0;
  const armC = o.coat ? '#e4e8ec' : shade(top, -10);
  R(ctx, x - 5, y - 12 + sw, 1, 5, armC); R(ctx, x + 4, y - 12 - sw, 1, 5, armC);
  R(ctx, x - 5, y - 7 + sw, 1, 1, o.skin); R(ctx, x + 4, y - 7 - sw, 1, 1, o.skin);
  if (o.wave) { R(ctx, x + 4, y - 17 + (Math.floor(t * 6) % 2), 1, 5, armC); R(ctx, x + 4, y - 18 + (Math.floor(t * 6) % 2), 1, 1, o.skin); }
  if (o.bag) { R(ctx, x + 4, y - 8, 4, 4, '#7a4a2a'); R(ctx, x + 5, y - 9, 2, 1, '#5a3a1a'); }
  // head
  const hx = x - 4, hy = y - 21;
  drawHead(ctx, hx, hy, { skin: o.skin, hair: o.hair, bald: o.bald }, o.back ? 'up' : 'down');
  if (o.cap) { R(ctx, hx, hy - 1, 8, 2, o.cap); R(ctx, hx + 3, hy - 1, 2, 1, '#e65c5c'); }
  if (o.glasses) { R(ctx, hx + 1, hy + 4, 3, 1, '#222'); R(ctx, hx + 4, hy + 4, 3, 1, '#222'); }
}

function drawStretcher(ctx, x, y, p, t) {
  x = Math.round(x); y = Math.round(y);
  ctx.globalAlpha = 0.18; R(ctx, x - 14, y - 1, 30, 3, '#000'); ctx.globalAlpha = 1;
  R(ctx, x - 14, y - 10, 28, 7, '#9aa6ae'); R(ctx, x - 13, y - 10, 26, 6, '#f2f5f4');
  R(ctx, x - 7, y - 10, 18, 5, p.look.blanket);
  drawHead(ctx, x - 14, y - 15, p.look, 'down');
  R(ctx, x - 13, y - 3, 2, 2, '#2a2f36'); R(ctx, x + 11, y - 3, 2, 2, '#2a2f36');
}

function drawBubble(ctx, x, y, kind, t) {
  const bob = Math.round(Math.sin(t * 5) * 1.5);
  y += bob;
  const col = { clue: '#ffd84a', ask: '#ffffff', vague: '#ffb84d', alarm: '#ff5c6c', done: '#4fd1a5' }[kind] || '#fff';
  R(ctx, x - 5, y - 9, 11, 9, '#1a1d2a'); R(ctx, x - 4, y - 8, 9, 7, col); R(ctx, x - 1, y, 3, 2, '#1a1d2a'); R(ctx, x, y, 1, 1, col);
  const ink = '#1a1d2a';
  if (kind === 'clue' || kind === 'alarm') { R(ctx, x, y - 7, 1, 3, ink); R(ctx, x, y - 3, 1, 1, ink); }
  else if (kind === 'ask') { const n = Math.floor(t * 3) % 4; for (let i = 0; i < 3; i++) if (i < n) R(ctx, x - 2 + i * 2, y - 4, 1, 1, ink); }
  else if (kind === 'vague') { R(ctx, x - 1, y - 7, 3, 1, ink); R(ctx, x + 1, y - 6, 1, 1, ink); R(ctx, x, y - 5, 1, 1, ink); R(ctx, x, y - 3, 1, 1, ink); }
  else if (kind === 'done') { R(ctx, x - 2, y - 4, 1, 1, ink); R(ctx, x - 1, y - 3, 1, 1, ink); R(ctx, x, y - 4, 1, 1, ink); R(ctx, x + 1, y - 5, 1, 1, ink); R(ctx, x + 2, y - 6, 1, 1, ink); }
}

function drawFootTag(ctx, b, p, t, selected, sel6) {
  const x = b.x, y = b.y + 57;
  // bed number
  R(ctx, x + 9, y, 12, 7, selected ? '#3d7bff' : '#f4f4ee'); ptext(ctx, String(b.n), x + 15, y + 1, selected ? '#ffffff' : '#2a2f36', 1, 'center');
  if (!p || !p.inBed) return;
  // discharge timer bar
  const left = Math.max(0, p.dischargeT - t);
  const frac = Math.min(1, left / 4);
  const col = left < 0.5 ? ((Math.floor(t * 30) % 2) ? '#ff5c6c' : '#ffd0d0') : left < 1.2 ? '#ffb84d' : '#4fd1a5';
  R(ctx, x - 1, y + 9, b.w + 2, 5, '#1a1d2a'); R(ctx, x, y + 10, Math.max(1, Math.round(b.w * frac)), 3, col);
  ptextOutlined(ctx, left.toFixed(1), x + b.w / 2, y + 16, '#ffffff', '#1a1d2a', 1, 'center');
  // coding status chip
  const coded = !!p.coding.pdx; const n = p.coding.sdx.length + p.coding.procs.length;
  R(ctx, x + b.w - 6, y, 8, 7, '#1a1d2a'); R(ctx, x + b.w - 5, y + 1, 6, 5, coded ? '#4fd1a5' : '#5a6070');
  if (coded) { R(ctx, x + b.w - 4, y + 3, 1, 1, '#1a1d2a'); R(ctx, x + b.w - 3, y + 4, 1, 1, '#1a1d2a'); R(ctx, x + b.w - 2, y + 3, 1, 1, '#1a1d2a'); R(ctx, x + b.w - 1, y + 2, 1, 1, '#1a1d2a'); }
  if (n) ptext(ctx, '+' + n, x - 2, y + 1, '#2a2f36');
}

function drawSelection(ctx, b, t) {
  const x = b.x - 4, y = b.y - 4, w = b.w + 8, h = 74; const off = Math.floor(t * 10) % 4;
  ctx.fillStyle = '#3d7bff';
  for (let i = 0; i < w; i++) { if ((i + off) % 4 < 2) { ctx.fillRect(x + i, y, 1, 1); ctx.fillRect(x + w - 1 - i, y + h - 1, 1, 1); } }
  for (let i = 0; i < h; i++) { if ((i + off) % 4 < 2) { ctx.fillRect(x + w - 1, y + i, 1, 1); ctx.fillRect(x, y + h - 1 - i, 1, 1); } }
}

// ---- auditor portrait (boss)
function drawAuditor(ctx, x, y, s, t, mood) {
  // s = pixel scale; a 32x40 portrait
  const P = (px, py, w, h, c) => R(ctx, x + px * s, y + py * s, w * s, h * s, c);
  const skin = '#f0c8a0', hair = '#6a6a78', suit = '#2e3a5a';
  const shake = mood === 'hit' ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
  x += shake * s;
  // body
  P(4, 26, 24, 14, suit); P(13, 26, 6, 8, '#f4f4ee'); P(15, 27, 2, 7, '#a02838');
  P(4, 26, 3, 14, shade(suit, 15)); P(25, 26, 3, 14, shade(suit, -15));
  // clipboard
  P(20, 30, 10, 10, '#a87a4a'); P(21, 31, 8, 8, '#f4f4ee'); P(23, 29, 4, 2, '#888'); for (let i = 0; i < 3; i++) P(22, 33 + i * 2, 6, 1, '#7a8aa8');
  P(19, 34, 3, 3, skin);
  // head
  P(9, 6, 14, 18, skin); P(8, 9, 16, 12, skin);
  P(8, 4, 16, 6, hair); P(7, 6, 3, 8, hair); P(22, 6, 3, 8, hair); P(10, 3, 12, 2, hair);
  // bun
  P(12, 0, 8, 4, hair);
  // glasses
  P(9, 12, 6, 4, '#20202a'); P(17, 12, 6, 4, '#20202a'); P(10, 13, 4, 2, mood === 'win' ? '#f4f4ff' : '#c8e0f4'); P(18, 13, 4, 2, mood === 'win' ? '#f4f4ff' : '#c8e0f4'); P(15, 13, 2, 1, '#20202a');
  // eyes behind
  if (mood !== 'win') { P(12, 13, 1, 2, '#20202a'); P(20, 13, 1, 2, '#20202a'); }
  // brows
  if (mood === 'angry' || mood === 'hit') { P(9, 10, 5, 1, hair); P(18, 10, 5, 1, hair); P(13, 11, 1, 1, hair); P(18, 11, 1, 1, hair); }
  else { P(9, 11, 5, 1, hair); P(18, 11, 5, 1, hair); }
  // mouth
  if (mood === 'win') { P(13, 19, 6, 1, '#8a3030'); P(12, 18, 1, 1, '#8a3030'); P(19, 18, 1, 1, '#8a3030'); }
  else if (mood === 'hit') { P(14, 18, 4, 3, '#5a2020'); }
  else { P(13, 19, 6, 1, '#8a3030'); }
  P(15, 16, 2, 2, shade(skin, -20));
  // earrings
  P(8, 17, 1, 2, '#f0c040'); P(23, 17, 1, 2, '#f0c040');
}

// ---- portraits for chart header
function drawPortrait(canvas, look, sex) {
  const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const s = canvas.width / 16;
  const P = (px, py, w, h, c) => R(ctx, px * s, py * s, w * s, h * s, c);
  P(0, 0, 16, 16, '#2a3150');
  P(0, 11, 16, 5, '#9fc3e8'); P(5, 11, 6, 2, '#dfe9f4'); // gown
  P(3, 2, 10, 10, look.skin); P(2, 4, 12, 6, look.skin);
  if (!look.bald) { P(2, 1, 12, 4, look.hair); P(3, 0, 10, 1, look.hair); P(2, 5, 1, 4, look.hair); P(13, 5, 1, 4, look.hair); if (sex === 'F') { P(1, 4, 2, 7, look.hair); P(13, 4, 2, 7, look.hair); } }
  else { P(2, 4, 1, 4, look.hair); P(13, 4, 1, 4, look.hair); P(5, 2, 4, 1, shade(look.skin, 20)); }
  P(5, 6, 2, 2, '#ffffff'); P(9, 6, 2, 2, '#ffffff'); P(6, 7, 1, 1, '#1a1410'); P(10, 7, 1, 1, '#1a1410');
  P(7, 9, 2, 1, shade(look.skin, -30)); P(6, 10, 4, 1, '#a04848');
  P(3, 8, 1, 1, shade(look.skin, -15)); P(12, 8, 1, 1, shade(look.skin, -15));
}
function drawDocPortrait(canvas, d) {
  const ctx = canvas.getContext('2d'); const s = canvas.width / 16;
  const P = (px, py, w, h, c) => R(ctx, px * s, py * s, w * s, h * s, c);
  P(0, 0, 16, 16, d.color);
  P(0, 11, 16, 5, '#f4f6f8'); P(6, 11, 4, 3, '#5a7aa8'); P(5, 12, 1, 3, '#333'); P(10, 12, 1, 2, '#333');
  P(3, 2, 10, 10, d.skin); P(2, 4, 12, 6, d.skin);
  P(2, 1, 12, 4, d.hair); P(3, 0, 10, 1, d.hair);
  P(5, 6, 2, 2, '#fff'); P(9, 6, 2, 2, '#fff'); P(6, 7, 1, 1, '#111'); P(10, 7, 1, 1, '#111');
  if (d.id === 'brandt') { P(4, 5, 4, 1, d.hair); P(9, 5, 4, 1, d.hair); P(6, 10, 4, 1, '#6a3030'); }
  else if (d.id === 'novak') { P(6, 9, 4, 1, '#a04848'); P(5, 10, 1, 1, '#a04848'); P(10, 10, 1, 1, '#a04848'); }
  else { P(6, 10, 4, 1, '#a04848'); }
  if (d.id === 'weiss') { P(4, 6, 4, 2, 'rgba(20,20,30,0.6)'); P(9, 6, 4, 2, 'rgba(20,20,30,0.6)'); P(8, 6, 1, 1, '#222'); }
}

// ---- pixel icons (for HTML, drawn to small canvases -> data URLs)
const ICONS = {};
function makeIcon(name, size, fn) {
  const c = document.createElement('canvas'); c.width = size; c.height = size; const ctx = c.getContext('2d'); fn((x, y, w, h, col) => R(ctx, x, y, w, h, col)); ICONS[name] = c.toDataURL();
}
function buildIcons() {
  makeIcon('bolt', 9, P => { P(4, 0, 3, 1, '#ffd84a'); P(3, 1, 3, 1, '#ffd84a'); P(2, 2, 3, 1, '#ffd84a'); P(1, 3, 6, 1, '#ffd84a'); P(4, 4, 3, 1, '#ffd84a'); P(3, 5, 3, 1, '#ffd84a'); P(2, 6, 3, 1, '#ffd84a'); P(2, 7, 2, 1, '#ffd84a'); });
  makeIcon('cup', 9, P => { P(1, 2, 6, 6, '#f4f4ee'); P(2, 3, 4, 2, '#7a4a2a'); P(7, 3, 1, 3, '#f4f4ee'); P(8, 4, 1, 1, '#f4f4ee'); P(2, 0, 1, 2, '#c8d0dc'); P(4, 0, 1, 1, '#c8d0dc'); P(1, 8, 6, 1, '#a8b0bc'); });
  makeIcon('steth', 9, P => { P(1, 0, 1, 4, '#c8d0dc'); P(5, 0, 1, 4, '#c8d0dc'); P(2, 4, 3, 1, '#c8d0dc'); P(3, 5, 1, 2, '#c8d0dc'); P(4, 7, 3, 1, '#c8d0dc'); P(7, 5, 2, 2, '#4fd1a5'); P(7, 7, 1, 1, '#c8d0dc'); });
  makeIcon('paper', 9, P => { P(1, 0, 6, 9, '#e9f0ee'); P(2, 2, 4, 1, '#7a8aa8'); P(2, 4, 4, 1, '#7a8aa8'); P(2, 6, 3, 1, '#7a8aa8'); P(6, 0, 1, 1, '#9aa'); });
  makeIcon('book', 9, P => { P(0, 1, 4, 7, '#3d7bff'); P(5, 1, 4, 7, '#3d7bff'); P(4, 1, 1, 7, '#1d3b8f'); P(1, 2, 2, 1, '#c8dcff'); P(6, 2, 2, 1, '#c8dcff'); });
  makeIcon('bed', 9, P => { P(0, 3, 1, 5, '#c8d0dc'); P(8, 5, 1, 3, '#c8d0dc'); P(1, 5, 7, 2, '#e9f0ee'); P(1, 4, 2, 1, '#ffffff'); P(3, 4, 5, 1, '#7fb8d8'); });
  makeIcon('eye', 9, P => { P(2, 2, 5, 1, '#b48cff'); P(1, 3, 7, 3, '#b48cff'); P(2, 6, 5, 1, '#b48cff'); P(3, 3, 3, 3, '#ffffff'); P(4, 4, 1, 1, '#1a1d2a'); });
  makeIcon('shield', 9, P => { P(1, 0, 7, 5, '#4fd1a5'); P(2, 5, 5, 2, '#4fd1a5'); P(3, 7, 3, 1, '#4fd1a5'); P(4, 8, 1, 1, '#4fd1a5'); P(4, 1, 1, 5, '#e9fff6'); P(2, 3, 5, 1, '#e9fff6'); });
  makeIcon('binder', 9, P => { P(1, 0, 7, 9, '#e0a03c'); P(2, 1, 5, 7, '#f4d890'); P(0, 2, 2, 1, '#888'); P(0, 6, 2, 1, '#888'); P(3, 3, 3, 1, '#a07020'); });
  makeIcon('heart', 9, P => { P(1, 1, 3, 1, '#ff5c6c'); P(5, 1, 3, 1, '#ff5c6c'); P(0, 2, 9, 3, '#ff5c6c'); P(1, 5, 7, 1, '#ff5c6c'); P(2, 6, 5, 1, '#ff5c6c'); P(3, 7, 3, 1, '#ff5c6c'); P(4, 8, 1, 1, '#ff5c6c'); P(1, 2, 1, 1, '#ffd0d4'); });
  makeIcon('heartEmpty', 9, P => { P(1, 1, 3, 1, '#4a5070'); P(5, 1, 3, 1, '#4a5070'); P(0, 2, 9, 3, '#4a5070'); P(1, 5, 7, 1, '#4a5070'); P(2, 6, 5, 1, '#4a5070'); P(3, 7, 3, 1, '#4a5070'); P(4, 8, 1, 1, '#4a5070'); });
  makeIcon('star', 9, P => { P(4, 0, 1, 2, '#ffd84a'); P(3, 2, 3, 1, '#ffd84a'); P(0, 3, 9, 1, '#ffd84a'); P(1, 4, 7, 1, '#ffd84a'); P(2, 5, 5, 1, '#ffd84a'); P(2, 6, 2, 1, '#ffd84a'); P(5, 6, 2, 1, '#ffd84a'); P(1, 7, 2, 1, '#ffd84a'); P(6, 7, 2, 1, '#ffd84a'); });
  makeIcon('starEmpty', 9, P => { P(4, 0, 1, 2, '#3a4060'); P(3, 2, 3, 1, '#3a4060'); P(0, 3, 9, 1, '#3a4060'); P(1, 4, 7, 1, '#3a4060'); P(2, 5, 5, 1, '#3a4060'); P(2, 6, 2, 1, '#3a4060'); P(5, 6, 2, 1, '#3a4060'); P(1, 7, 2, 1, '#3a4060'); P(6, 7, 2, 1, '#3a4060'); });
  makeIcon('clock', 9, P => { P(2, 0, 5, 1, '#c8d0dc'); P(1, 1, 7, 7, '#c8d0dc'); P(2, 8, 5, 1, '#c8d0dc'); P(2, 1, 5, 7, '#1a1d2a'); P(4, 2, 1, 3, '#ffd84a'); P(5, 4, 2, 1, '#ffd84a'); });
  makeIcon('flag', 9, P => { P(1, 0, 1, 9, '#c8d0dc'); P(2, 0, 6, 4, '#ff5c6c'); P(2, 4, 3, 1, '#ff5c6c'); });
  makeIcon('note', 9, P => { P(1, 0, 7, 9, '#ffb84d'); P(2, 2, 5, 1, '#7a4a10'); P(2, 4, 5, 1, '#7a4a10'); P(4, 6, 1, 2, '#7a4a10'); });
}
