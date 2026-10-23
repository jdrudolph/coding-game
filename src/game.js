// ============================================================================
// GAME: shift simulation, ward scene, chart UI, coding interactions
// ============================================================================
const DAY_SEC = 30; // one game day = 30 real seconds at 1x
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (n, cls = '') => `<img class="icon ${cls}" src="${ICONS[n]}" alt="">`;
const root = document.getElementById('root');
let G = null;
let SCENE = null; // whatever the canvas currently draws

// ---------------------------------------------------------------- save data
const SAVE_KEY = 'codeblue.save.v1';
function defaultSave() { return { settings: { sfx: true, music: true, musicV2: true, tips: true, name: '', hard: false }, tipsSeen: {}, career: null, daily: {}, friends: [], quick: {}, stats: { shifts: 0, clean: 0, cases: 0 } }; }
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.settings) { const d = defaultSave(); return Object.assign(d, s, { settings: Object.assign(d.settings, s.settings), stats: Object.assign(d.stats, s.stats || {}) }); } } catch (e) { }
  return defaultSave();
}
let SAVE = loadSave();
// music became the default with the new soundtrack: switch it on once for older saves
if (!SAVE.settings.musicV2) { SAVE.settings.music = true; SAVE.settings.musicV2 = true; }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAVE)); } catch (e) { } }

// ---------------------------------------------------------------- helpers
function hourOf(t) { return ((t - Math.floor(t)) * 24); }
function fmtClock(t) { const h = hourOf(t); const hh = Math.floor(h), mm = Math.floor((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
function fmtWhen(t) { return 'Day ' + (Math.floor(t) + 1) + ' · ' + fmtClock(t); }
function toast(msg, cls = '', ms = 3200) {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div'); el.className = 'toast ' + cls; el.innerHTML = msg; box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), ms);
}
function hasPerk(k) { return G && G.perks.has(k); }

// ============================================================================
// SCENE (shared by title demo and the real shift)
// ============================================================================
function makeScene(wardId, nBeds) {
  const ward = WARDS[wardId];
  const layout = bedLayout(nBeds || ward.beds);
  const beds = layout.map((b, i) => Object.assign(b, { n: i + 1, p: null, cleanUntil: 0 }));
  return {
    ward, wardId, beds, bg: buildBackground(ward, beds), actors: [], t: 7 / 24, real: 0,
    stationNurse: { top: '#5aa0d8', skin: '#e8b48a', hair: '#3a2a1e', cap: '#ffffff' },
    coder: { x: SPOTS.desk.x, y: SPOTS.desk.y + 26, path: [], walking: false, at: 'desk' },
  };
}

function pathTo(a, b) { return [{ x: a.x, y: AISLE_Y }, { x: b.x, y: AISLE_Y }, { x: b.x, y: b.y }]; }
function addNurses(scene, n) {
  const looks = [{ top: '#6fc3b0', skin: '#c98e62', hair: '#1a1410' }, { top: '#5aa0d8', skin: '#f2c9a0', hair: '#c89a5a', cap: '#ffffff' }, { top: '#d88ab8', skin: '#e8b48a', hair: '#7a5230' }];
  for (let i = 0; i < n; i++) scene.actors.push(Object.assign({ kind: 'nurse', x: 150 + i * 40, y: AISLE_Y + 4, path: [], wait: 1 + i * 2, speed: 34 }, looks[i % 3]));
}
function stepActors(scene, dt) {
  for (const a of scene.actors) {
    if (a.path && a.path.length) {
      const tgt = a.path[0]; const dx = tgt.x - a.x, dy = tgt.y - a.y; const d = Math.hypot(dx, dy); const sp = (a.speed || 36) * dt;
      a.walking = true; if (Math.abs(dx) > 0.5) a.dir = dx > 0 ? 1 : -1;
      if (d <= sp) { a.x = tgt.x; a.y = tgt.y; a.path.shift(); if (!a.path.length) { a.walking = false; a.onArrive && a.onArrive(a); } }
      else { a.x += dx / d * sp; a.y += dy / d * sp; }
    } else if (a.kind === 'nurse') {
      a.wait -= dt;
      if (a.wait <= 0) {
        const occupied = scene.beds.filter(b => b.p && b.p.inBed);
        let tgt;
        if (occupied.length && Math.random() < 0.75) { const b = occupied[Math.floor(Math.random() * occupied.length)]; tgt = { x: b.x + b.w + 8, y: b.y + 46 }; }
        else tgt = Math.random() < 0.5 ? { x: SPOTS.station.x + (Math.random() * 40 - 20), y: SPOTS.station.y - 6 } : { x: 60 + Math.random() * 280, y: AISLE_Y + 8 };
        a.path = pathTo(a, tgt); a.wait = 2 + Math.random() * 4;
      }
    }
  }
  scene.actors = scene.actors.filter(a => !a.dead);
  const c = scene.coder;
  if (c.path.length) {
    const tgt = c.path[0]; const dx = tgt.x - c.x, dy = tgt.y - c.y; const d = Math.hypot(dx, dy); const sp = 50 * dt; c.walking = true; if (Math.abs(dx) > 0.5) c.dir = dx > 0 ? 1 : -1;
    if (d <= sp) { c.x = tgt.x; c.y = tgt.y; c.path.shift(); if (!c.path.length) c.walking = false; } else { c.x += dx / d * sp; c.y += dy / d * sp; }
  }
}

function renderScene(ctx, scene) {
  const t = scene.real, gt = scene.t, hour = hourOf(gt);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(scene.bg, 0, 0);
  drawWindows(ctx, scene.beds, t, hour);
  // sign + clock
  const sw = scene.ward.station.length * 4 + 5;
  R(ctx, 4, 8, sw, 9, '#2658d6'); R(ctx, 4, 16, sw, 1, '#163a9a'); ptext(ctx, scene.ward.station, 7, 10, '#ffffff', 1);
  const clockX = scene.beds[0].x - 22;
  if (clockX >= 50) drawClock(ctx, clockX, 24, Math.floor(hour), Math.floor((hour % 1) * 60));
  const night = nightAlpha(hour) > 0.3;
  for (const b of scene.beds) {
    const p = b.p;
    drawBed(ctx, b, p, t, { icu: scene.ward.icu, sleep: night, cleaning: b.cleanUntil > gt });
  }
  // waiting patients
  if (scene.waiting) scene.waiting.slice(0, 3).forEach((p, i) => drawPerson(ctx, SPOTS.wait[i].x + 2, SPOTS.wait[i].y + 2, { top: '#9fc3e8', skin: p.look.skin, hair: p.look.hair, bald: p.look.bald }, t));
  // actors by y
  const drawables = scene.actors.slice();
  drawables.push(Object.assign({ kind: 'coder' }, scene.coder));
  drawables.sort((a, b) => a.y - b.y);
  for (const a of drawables) {
    if (a.kind === 'nurse') drawPerson(ctx, a.x, a.y, a, t);
    else if (a.kind === 'doctor') drawPerson(ctx, a.x, a.y, Object.assign({ coat: true }, a), t);
    else if (a.kind === 'porter') { drawStretcher(ctx, a.x + (a.dir || 1) * 16, a.y, a.patient, t); drawPerson(ctx, a.x, a.y, a, t); }
    else if (a.kind === 'porterBack') drawPerson(ctx, a.x, a.y, a, t);
    else if (a.kind === 'leaver') drawPerson(ctx, a.x, a.y, a, t);
    else if (a.kind === 'coder') drawPerson(ctx, a.x, a.y, { top: '#3d7bff', pants: '#2a3048', skin: '#f0c49a', hair: '#4a3020', back: a.at === 'desk' && !a.walking, walking: a.walking, dir: a.dir, glasses: a.at !== 'desk' }, t);
  }
  // station nurse behind counter
  const sx = 128, sy = 166;
  drawPerson(ctx, sx + 60, sy + 12, scene.stationNurse, t);
  R(ctx, sx, sy, 104, 8, '#e9dcc2'); R(ctx, sx, sy + 8, 104, 2, '#cdbb98'); R(ctx, sx, sy + 10, 104, 18, '#5f7fa6'); R(ctx, sx, sy + 10, 104, 1, '#7d9cc2');
  for (let i = 0; i < 6; i++) R(ctx, sx + 6 + i * 17, sy + 14, 10, 10, '#56769c');
  ptext(ctx, 'NURSES', sx + 52, sy + 16, '#dfe8f4', 1, 'center');
  R(ctx, sx + 30, sy + 1, 8, 5, '#f4f4ee'); R(ctx, sx + 70, sy - 1, 6, 6, '#c03c3c');
  // night
  const na = nightAlpha(hour);
  if (na > 0) { ctx.fillStyle = `rgba(14,18,52,${na})`; ctx.fillRect(0, 0, VW, VH); }
  // emissive
  R(ctx, 15, 25, 19, 7, '#1a3a24'); ptext(ctx, 'EXIT', 24, 26, '#5cf08a', 1, 'center');
  R(ctx, sx + 9, sy - 6, 12, 6, night ? '#5a9fd0' : '#3d6f8f');
  R(ctx, 272 + 1, 168 + 1, 14, 9, '#2a5a8a'); R(ctx, 292 + 1, 168 + 1, 14, 9, '#2a5a8a');
  for (let i = 0; i < 3; i++) R(ctx, 274, 170 + i * 2, 4 + ((Math.floor(t * 4) + i) % 3) * 3, 1, '#9fd0ff');
  for (let i = 0; i < 3; i++) R(ctx, 294, 170 + i * 2, 10 - i * 2, 1, '#ffe58a');
  R(ctx, 360, 154, 2, 2, (Math.floor(t * 2) % 2) ? '#ff5c6c' : '#802030');
  if (scene.coffeeSteam) { for (let i = 0; i < 4; i++) R(ctx, 352 + ((Math.floor(t * 6) + i) % 3), 158 - i * 4 - (Math.floor(t * 8) % 4), 1, 2, 'rgba(255,255,255,0.7)'); R(ctx, 349, 162, 6, 5, '#f4f4ee'); }
  if (night) for (const b of scene.beds) { ctx.globalAlpha = 0.25; R(ctx, b.x + 6, b.y + 4, b.w - 12, 20, '#fff6c8'); ctx.globalAlpha = 1; }
  for (const b of scene.beds) {
    const p = b.p; const alarm = p && p.inBed && !p.coding.pdx && p.dischargeT - gt < 0.5;
    drawMonitorGlow(ctx, b, p, t, alarm);
  }
  // UI overlays
  for (const b of scene.beds) {
    const p = b.p;
    if (scene.sel != null && p && p.id === scene.sel) drawSelection(ctx, b, t);
    if (scene.showTags !== false) drawFootTag(ctx, b, p, gt, p && p.id === scene.sel);
    if (!p || !p.inBed) continue;
    const bx = b.x + b.w / 2, by = b.y + 4;
    if (scene.sixth && p.clues.some(c => c.hidden && !c.shown)) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4); R(ctx, b.x - 3, b.y - 3, b.w + 6, 2, '#b48cff'); R(ctx, b.x - 3, b.y + 54, b.w + 6, 2, '#b48cff'); R(ctx, b.x - 3, b.y - 3, 2, 59, '#b48cff'); R(ctx, b.x + b.w + 1, b.y - 3, 2, 59, '#b48cff'); ctx.globalAlpha = 1; }
    if (!p.coding.pdx && p.dischargeT - gt < 0.5) drawBubble(ctx, bx, by, 'alarm', t);
    else if (p.ask) drawBubble(ctx, bx, by, 'ask', t);
    else if (p.newClues > 0) drawBubble(ctx, bx, by, 'clue', t);
    else if (p.clues.some(c => c.shown && c.vague && !c.clarified && c.chaseEnd == null)) drawBubble(ctx, bx, by, 'vague', t);
  }
}

// ============================================================================
// SHIFT LIFECYCLE
// ============================================================================
function startShift(cfg) {
  // cfg: {mode, ward, seed, count, window, tutorial, label, startPatients}
  Audio8.init();
  const ward = WARDS[cfg.ward];
  const perks = new Set(cfg.perks || []);
  const scene = makeScene(cfg.ward, ward.beds);
  const built = buildShift({ ward: cfg.ward, seed: cfg.seed, count: cfg.count, window: cfg.window || 6.4, losScale: perks.has('bedmgr') ? 1 : 1, startPatients: cfg.startPatients });
  if (perks.has('bedmgr')) built.arrivals.forEach(p => { p.dischargeT += 0.4; p.los += 0.4; });
  cfg.tips = cfg.tips && !cfg.hard; // tips pause the clock, so hard mode has none
  G = Object.assign(scene, {
    cfg, mode: cfg.mode, perks, queue: built.arrivals.slice(), waiting: [], patients: [], all: built.arrivals,
    speed: 1, paused: false, over: false, endTimer: null, sel: null,
    maxEnergy: 10 + (perks.has('stamina') ? 3 : 0), energy: 10 + (perks.has('stamina') ? 3 : 0),
    score: 0, combo: 0, results: [], coffeeUntil: 0, coffees: 0,
    filter: null, search: '', focusCode: null, armed: null, coach: null, coachQueue: [],
    sixth: perks.has('sixth'), lastBoard: 0, lastWarn: 0, log: [],
  });
  addNurses(G, cfg.ward === 'icu' ? 2 : 2);
  SCENE = G;
  renderGameShell();
  if (cfg.tutorial && cfg.tips) tip('welcome');
  if (cfg.hard) setTimeout(() => toast('<b>Hard mode:</b> no pausing, no tips. Case points +25%.', 'warn', 4000), 400);
  else if (cfg.intro) setTimeout(() => tip(cfg.intro), 300);
}

function admit(p, bed) {
  const delay = G.t - p.arriveT;
  p.admitT = G.t; p.dischargeT += Math.max(0, delay); p.bed = bed.n - 1; bed.p = p; p.inBed = false;
  const sf = hasPerk('speed') ? 0.75 : 1;
  for (const c of p.clues) {
    if (c.hidden) continue;
    c.revealT = p.admitT + c.f * p.los * sf;
    if (c.f === 0) { c.shown = true; c.revealT = p.admitT; }
  }
  G.patients.push(p);
  // porter brings the patient in
  const tgt = { x: bed.x + bed.w / 2 - 16, y: bed.y + 66 };
  const porter = { kind: 'porter', x: SPOTS.door.x, y: SPOTS.door.y, path: pathTo(SPOTS.door, tgt), speed: 46, top: '#4f9e5a', skin: '#c98e62', hair: '#1a1410', patient: p, dir: 1 };
  porter.onArrive = a => { p.inBed = true; a.dead = true; G.actors.push({ kind: 'porterBack', x: a.x, y: a.y, path: pathTo(a, SPOTS.door), speed: 50, top: '#4f9e5a', skin: '#c98e62', hair: '#1a1410', onArrive: b => { b.dead = true; } }); };
  G.actors.push(porter);
  Audio8.play('arrive');
  logEvent(`Admitted <b>${esc(p.name)}</b> to bed ${bed.n} (${esc(p.dxLabel.toLowerCase())})`);
  p.newClues = p.clues.filter(c => c.shown).length;
  if (G.sel == null) selectPatient(p.id);
  boardDirty();
}

function discharge(p) {
  const bed = G.beds[p.bed];
  p.locked = true;
  const r = evaluateCase(p);
  // combo
  if (r.status === 'clean') { G.combo++; const bonus = Math.round(150 * Math.min(1, 0.25 * (G.combo - 1))); if (bonus > 0) { r.pts.push({ label: 'Combo x' + G.combo, v: bonus, cls: 'good' }); r.total += bonus; } }
  else G.combo = 0;
  if (G.cfg.hard && r.total > 0) { const hb = Math.round(r.total * 0.25); r.pts.push({ label: 'Hard mode +25%', v: hb, cls: 'good' }); r.total += hb; }
  p.result = r; G.score += r.total;
  G.results.push(snapshotCase(p, r));
  SAVE.stats.cases++; if (r.status === 'clean') SAVE.stats.clean++;
  // visuals
  const fx = bed.x + bed.w / 2, fy = bed.y + 20;
  floater(fx, fy, (r.total >= 0 ? '+' : '') + r.total, r.status === 'lost' ? 'bad' : r.status === 'clean' ? 'good' : '');
  const label = { clean: 'CLEAN CASE!', drg: 'RIGHT DRG', under: 'UNDERCODED', risk: 'AUDIT RISK', lost: 'CASE LOST' }[r.status];
  setTimeout(() => floater(fx, fy - 12, label, r.status === 'lost' || r.status === 'risk' ? 'bad' : r.status === 'under' ? '' : 'good'), 250);
  Audio8.play('discharge');
  setTimeout(() => Audio8.play(r.status === 'lost' ? 'bad' : r.status === 'clean' ? 'good' : 'coin'), 300);
 logEvent(`<b>${esc(p.name)}</b> discharged: ${r.status === 'lost' ? 'not coded' : esc(r.gP.drg)} · ${r.total >= 0 ? '+' : ''}${r.total} pts`, r.status === 'clean' ? 'good' : (r.status === 'lost' || r.status === 'risk') ? 'bad' : r.status === 'under' ? 'warn' : '');
  toast(`<b>${esc(p.name)}</b> discharged · ${r.status === 'lost' ? 'not coded' : r.gP.drg + ' ' + euro(r.gP.value)} · <b>${r.total >= 0 ? '+' : ''}${r.total}</b>`, r.status === 'clean' ? 'good' : (r.status === 'lost' || r.status === 'risk') ? 'bad' : r.status === 'under' ? 'warn' : '');
  // walk out
  bed.p = null; bed.cleanUntil = G.t + 0.1;
  const look = p.look;
  G.actors.push({ kind: 'leaver', x: bed.x + bed.w / 2, y: bed.y + 64, path: pathTo({ x: bed.x + bed.w / 2, y: bed.y + 64 }, SPOTS.door), speed: 30, top: pickCoat(p.id), pants: '#3a3a4a', skin: look.skin, hair: look.hair, bald: look.bald, bag: true, onArrive: a => { a.wave = true; setTimeout(() => { a.dead = true; }, 900); } });
  if (G.sel === p.id) renderChart();
  boardDirty();
  if (!G.tipped) { G.tipped = true; setTimeout(() => tip('discharge'), 900); }
  if (r.status === 'risk') setTimeout(() => tip('risk'), 1500);
}
function pickCoat(id) { return ['#8a5a3a', '#4a6a8a', '#7a3a4a', '#5a7a4a', '#6a5a8a'][id % 5]; }

function snapshotCase(p, r) {
  return {
    id: p.id, name: p.name, age: p.age, sex: p.sex, tpl: p.tpl, dxLabel: p.dxLabel, ward: p.ward, look: p.look,
    clues: p.clues.filter(c => c.shown).map(c => ({ id: c.id, src: c.src, text: c.text, revealT: c.revealT, sup: c.sup, pdx: c.pdx, drop: c.drop, vague: c.vague, clarified: c.clarified, answer: !!c.answer, hint: c.hint, by: c.by || null })),
    hiddenLeft: p.clues.filter(c => c.hidden && !c.shown).length,
    r: { status: r.status, total: r.total, pts: r.pts, notes: r.notes, gI: r.gI, gP: r.gP, gA: r.gA, ideal: r.ideal, coding: r.coding, unsupported: r.unsupported, missed: r.missed, risk: r.risk, captured: r.captured, possible: r.possible },
  };
}

function floater(x, y, text, cls = '') {
  const lay = $('.floaters'); if (!lay) return;
  const el = document.createElement('div'); el.className = 'floater ' + cls; el.textContent = text;
  el.style.left = (x / VW * 100) + '%'; el.style.top = (y / VH * 100) + '%';
  lay.appendChild(el); setTimeout(() => el.remove(), 1700);
}

function simStep() {
  const t = G.t;
  // arrivals
  while (G.queue.length && G.queue[0].arriveT <= t) G.waiting.push(G.queue.shift());
  if (G.waiting.length) {
    for (const b of G.beds) { if (!b.p && b.cleanUntil <= t && G.waiting.length) admit(G.waiting.shift(), b); }
  }
  for (const p of G.patients) {
    if (p.locked) continue;
    // clue reveals
    for (const c of p.clues) {
      if (!c.shown && !c.hidden && c.revealT <= t) {
        c.shown = true; c.fresh = true; p.newClues++;
        Audio8.play('clue');
        if (G.sel === p.id) { renderDocs(); renderTray(); }
        logEvent(`New ${SRC_LABEL[c.src].toLowerCase()} for <b>${esc(p.name)}</b>${c.vague ? ' (vague)' : ''}`, c.pdx && c.drop.length ? 'warn' : '');
        boardDirty();
        if (c.vague) tipLater('vague'); else if (c.hint) tipLater('hint'); else if (c.pdx && c.drop.length) tipLater('replace');
        else tipLater('newclue');
      }
      if (c.chaseEnd != null && !c.clarified && c.chaseEnd <= t) {
        c.clarified = true; c.fresh = true; p.newClues++; Audio8.play('answer');
        logEvent(`Documentation clarified for <b>${esc(p.name)}</b>`, 'good');
        if (G.sel === p.id) { renderDocs(); renderTray(); }
        boardDirty();
      }
    }
    if (p.ask && p.ask.endT <= t) resolveAsk(p);
    // warning
    if (!p.warned && !p.coding.pdx && p.dischargeT - t < 0.5) { p.warned = true; Audio8.play('alarm'); logEvent(`<b>${esc(p.name)}</b> leaves soon, not coded!`, 'bad'); toast(`${icon('clock', 'sm')} <b>${esc(p.name)}</b> leaves soon and has no principal diagnosis!`, 'bad'); tipLater('alarm'); boardDirty(); }
    if (p.dischargeT <= t) discharge(p);
  }
  // end of shift
  const anyLeft = G.queue.length || G.waiting.length || G.beds.some(b => b.p);
  if (!anyLeft && !G.over) {
    if (G.endTimer == null) G.endTimer = G.real + 2.2;
    else if (G.real >= G.endTimer) endShift();
  }
}

function endShift() {
  G.over = true;
  SAVE.stats.shifts++; persist();
  Audio8.play('fanfare');
  showShiftResults();
}

// ---------------------------------------------------------------- actions
function askCost() { return hasPerk('whisper') ? 2 : 3; }
function chaseCost() { return hasPerk('chaser') ? 1 : 2; }
function spend(n) {
  if (G.energy < n) { Audio8.play('error'); toast(`${icon('bolt', 'sm')} Not enough energy. Grab a coffee!`, 'warn'); flashEnergy(); tipLater('energy'); return false; }
  G.energy -= n; renderHUD(); if (G.energy <= 3) tipLater('energy'); return true;
}
function flashEnergy() { const e = $('.energy'); if (e) { e.animate([{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }], { duration: 200, iterations: 2 }); } }
function locked() { return G.coffeeUntil > performance.now() || G.paused || G.over; }
// paused: everything can be read and browsed, but nothing can be changed
function pausedBlock() {
  if (!G || !G.paused) return false;
  Audio8.play('error'); toast('Paused. You can read and browse, but actions wait until you resume.', 'warn', 2200); return true;
}

function askDoctor(p) {
  if (pausedBlock()) return;
  if (locked() || p.locked || p.ask) return;
  if (!spend(askCost())) return;
  const doc = DOCTORS[p.doctor];
  let delay = doc.delay;
  if (doc.night) { const h = hourOf(G.t); delay = (h >= 20 || h < 6) ? 0.12 : 0.7; }
  if (hasPerk('whisper')) delay *= 0.7;
  p.ask = { endT: G.t + delay, doc: doc.id };
  Audio8.play('ask');
  const bed = G.beds[p.bed];
  const tgt = { x: bed.x - 10, y: bed.y + 50 };
  const a = { kind: 'doctor', x: SPOTS.door.x, y: SPOTS.door.y, path: pathTo(SPOTS.door, tgt), speed: 44, top: doc.color, skin: doc.skin, hair: doc.hair, glasses: doc.id === 'weiss', forP: p.id };
  G.actors.push(a);
  renderChart(); boardDirty();
}
function resolveAsk(p) {
  const doc = DOCTORS[p.ask.doc]; p.ask = null; p.asked++;
  G.actors.filter(a => a.kind === 'doctor' && a.forP === p.id).forEach(a => { a.path = pathTo(a, SPOTS.door); a.onArrive = b => { b.dead = true; }; a.forP = null; });
  const answer = (text, extra = {}) => {
    const c = Object.assign({ id: 100 + p.clues.length, f: 0, src: 'DOC', text, sup: [], pdx: null, drop: [], hidden: false, hint: false, shown: true, revealT: G.t, vague: null, clarified: false, answer: true, by: doc.id, fresh: true }, extra);
    p.clues.push(c); return c;
  };
  if (doc.refuse && !hasPerk('whisper') && Math.random() < doc.refuse) {
    answer(`${doc.name}: "I'm in the OR. Ask me later!"`); G.energy = Math.min(G.maxEnergy, G.energy + 1);
    logEvent(`${doc.name} is in the OR. 1 energy refunded.`, 'warn');
  } else {
    const hidden = p.clues.filter(c => c.hidden && !c.shown);
    const decoys = p.clues.filter(c => c.shown && c.decoy && !c.decoyAnswered);
    const reveal = doc.all ? hidden : hidden.slice(0, 1);
    if (reveal.length) {
      for (const c of reveal) {
        c.shown = true; c.revealT = G.t; c.fresh = true; c.by = doc.id; c.answer = true;
        if (doc.vague && Math.random() < doc.vague) {
          const kw = (parseMarkup(c.text).find(s => s.codes) || { t: 'that lab value' }).t;
          c.vague = { text: `${doc.name}: ` + c.text, sup: c.sup.slice(), pdx: c.pdx, drop: c.drop.slice() };
          c.text = `${doc.name}: "Uh, something about the ${stripMarkup(kw).toLowerCase()}? I'll write it up properly later."`;
        } else c.text = `${doc.name}: ` + c.text;
      }
      Audio8.play('answer');
      logEvent(`${doc.name} answered about <b>${esc(p.name)}</b>`, 'good');
    }
    if ((!reveal.length || doc.all) && decoys.length) {
      for (const d of (doc.all ? decoys : decoys.slice(0, 1))) { d.decoyAnswered = true; answer(`${doc.name}: ${d.decoy}`); }
      if (!reveal.length) { Audio8.play('answer'); logEvent(`${doc.name}: nothing codable for <b>${esc(p.name)}</b>`); }
    } else if (!reveal.length) {
      answer(`${doc.name}: "Everything is in the chart. Nothing to add."`); Audio8.play('click');
      logEvent(`${doc.name} had nothing new for <b>${esc(p.name)}</b>`);
    }
  }
  p.newClues++;
  if (G.sel === p.id) renderChart();
  boardDirty();
}
function chase(p, cid) {
  if (pausedBlock()) return;
  if (locked() || p.locked) return;
  const c = p.clues.find(x => x.id === cid); if (!c || !c.vague || c.clarified || c.chaseEnd != null) return;
  if (!spend(chaseCost())) return;
  c.chaseEnd = G.t + (hasPerk('chaser') ? 0.17 : 0.35);
  Audio8.play('ask');
  renderDocs(); boardDirty();
}
function coffee() {
  if (pausedBlock()) return;
  if (G.over || G.coffeeUntil > performance.now()) return;
  if (G.energy >= G.maxEnergy) { toast('Energy is already full.', ''); return; }
  const ms = hasPerk('espresso') ? 2000 : 5000;
  G.coffeeUntil = performance.now() + ms; G.coffees++;
  Audio8.play('coffee');
  G.coder.path = [{ x: G.coder.x, y: 206 }, { x: SPOTS.coffee.x - 2, y: 206 }, { x: SPOTS.coffee.x - 2, y: SPOTS.coffee.y }]; G.coder.at = 'coffee';
  G.coffeeSteam = true;
  const ov = document.createElement('div'); ov.className = 'overlay clear coffee-ov'; ov.id = 'coffee-ov';
  ov.innerHTML = `<div class="modal frame"><h2>${icon('cup', 'lg')} Coffee break</h2><p>The ward keeps running while the machine gurgles.</p><div class="coffee-bar"><i></i></div></div>`;
  document.body.appendChild(ov);
  const bar = ov.querySelector('.coffee-bar i'); const t0 = performance.now();
  const tick = () => {
    const f = Math.min(1, (performance.now() - t0) / ms); bar.style.width = (f * 100) + '%';
    if (f < 1 && G && !G.over) requestAnimationFrame(tick);
    else {
      ov.remove(); if (!G) return; G.coffeeSteam = false;
      const gain = hasPerk('espresso') ? G.maxEnergy : 5;
      G.energy = Math.min(G.maxEnergy, G.energy + gain); renderHUD(); Audio8.play('coin');
      G.coder.path = [{ x: G.coder.x, y: 206 }, { x: SPOTS.desk.x, y: 206 }, { x: SPOTS.desk.x, y: SPOTS.desk.y + 26 }]; G.coder.at = 'desk';
    }
  };
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- coding ops
function curP() { return G && G.sel != null ? G.patients.find(p => p.id === G.sel) : null; }
function place(code, zone) {
  const p = curP(); if (!p || p.locked || pausedBlock() || locked()) return;
  const c = CODES[code]; if (!c) return;
  const before = group(p.coding);
  const cd = p.coding;
  if (c.kind !== 'dx') zone = 'proc';
  else if (zone === 'proc') zone = cd.pdx ? 'sdx' : 'pdx';
  // remove from current position
  const was = cd.pdx === code ? 'pdx' : cd.sdx.includes(code) ? 'sdx' : cd.procs.includes(code) ? 'proc' : null;
  if (was === zone) return;
  if (was === 'pdx') cd.pdx = null; if (was === 'sdx') cd.sdx = cd.sdx.filter(x => x !== code);
  if (zone === 'pdx') {
    if (cd.pdx && cd.pdx !== code) { toast(`${cd.pdx} removed from principal`, ''); }
    cd.pdx = code;
  } else if (zone === 'sdx') { if (!cd.sdx.includes(code)) cd.sdx.push(code); }
  else if (zone === 'proc') { if (!cd.procs.includes(code)) cd.procs.push(code); }
  Audio8.play('drop');
  G.armed = null;
  afterCodingChange(p, before);
  if (zone === 'pdx') tipLater('drg'); else if (zone === 'sdx') tipLater('pccl');
}
function unplace(code) {
  const p = curP(); if (!p || p.locked || pausedBlock() || locked()) return;
  const before = group(p.coding); const cd = p.coding;
  if (cd.pdx === code) cd.pdx = null; cd.sdx = cd.sdx.filter(x => x !== code); cd.procs = cd.procs.filter(x => x !== code);
  Audio8.play('remove'); afterCodingChange(p, before);
}
function afterCodingChange(p, before) {
  const after = group(p.coding);
  renderCoding(); renderTray(); boardDirty();
  const d = after.value - before.value;
  if (d !== 0) {
    const box = $('.drgbox'); if (box) { const el = document.createElement('div'); el.className = 'delta'; el.style.color = d > 0 ? 'var(--mint)' : 'var(--red)'; el.textContent = (d > 0 ? '+' : '−') + euro(Math.abs(d)).replace('€', '€'); box.appendChild(el); setTimeout(() => el.remove(), 1400); }
    if (d > 0) Audio8.play('coin');
  }
}

// ============================================================================
// DOM: game shell, HUD, board, chart
// ============================================================================
function renderGameShell() {
  root.innerHTML = `
  <div class="game">
    <header class="hud">
      <div class="ward-badge"><i style="background:${G.ward.color}"></i><div><b>${esc(G.ward.name)}</b><div class="muted" style="font-size:12px">${esc(G.cfg.label || '')}</div></div></div>
      <div class="clock" id="hud-clock"></div>
      <div class="energy" title="Energy: asking doctors and chasing documentation costs energy"><img class="icon" src="${ICONS.bolt}" alt="Energy"><div class="pips" id="hud-pips"></div></div>
      <button class="btn small amber" id="btn-coffee" title="Coffee (C)">${icon('cup', 'sm')} Coffee</button>
      <div class="spacer"></div>
      <div class="combo" id="hud-combo"></div>
      <div class="score" id="hud-score"></div>
      <div class="tools">
        <button class="btn small ghost" id="btn-speed" title="Game speed">1x</button>
        ${G.cfg.hard ? '<span class="tag hard-tag" title="Hard mode: the clock never stops">Hard · no pause</span>' : '<button class="btn small ghost" id="btn-pause" title="Pause (Space)">Pause</button>'}
        <button class="btn small ghost" id="btn-snd" title="Sound effects">${SAVE.settings.sfx ? 'Sound on' : 'Sound off'}</button>
        <button class="btn small ghost" id="btn-mus" title="Music">${SAVE.settings.music ? 'Music on' : 'Music off'}</button>
        <button class="btn small ghost" id="btn-quit" title="Leave shift">Menu</button>
      </div>
  <div class="pause-banner" id="pause-banner" hidden><b>Paused</b><span>The clock is stopped. Read charts and browse codes freely; coding, asking, chasing and coffee wait until you resume.</span><button class="btn small" id="pb-resume">Resume</button><button class="btn small ghost" id="pb-help">How to play</button></div>

    </header>
    <div class="play">
      <div class="left">
        <div class="canvas-wrap"><canvas id="ward" width="${VW}" height="${VH}" aria-label="Ward map. Click a bed to open the patient's chart."></canvas><div class="floaters"></div><div class="waiting" id="waiting" hidden></div></div>
        <div class="board" id="board"></div>
        <div class="lower">
          <section class="frame"><div class="sec-title"><span>Discharge timeline</span><span>next 3 days</span></div><div class="timeline" id="timeline"></div></section>
          <section class="frame"><div class="sec-title"><span>Ward log</span></div><div class="log" id="log"></div></section>
        </div>
      </div>
      <aside class="chart" id="chart"></aside>
    </div>
  </div>`;
  const cv = $('#ward');
  cv.addEventListener('pointerdown', e => {
    const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * VW, y = (e.clientY - r.top) / r.height * VH;
    for (const b of G.beds) if (b.p && x >= b.x - 8 && x <= b.x + b.w + 8 && y >= b.y - 16 && y <= b.y + 76) { selectPatient(b.p.id); Audio8.play('click'); return; }
  });
  $('#btn-coffee').onclick = coffee;
  $('#pb-resume').onclick = () => togglePause(false);
  $('#pb-help').onclick = () => showHelpModal();
  $('#btn-speed').onclick = () => { G.speed = G.speed === 1 ? 2 : 1; $('#btn-speed').textContent = G.speed + 'x'; Audio8.play('click'); };
  if ($('#btn-pause')) $('#btn-pause').onclick = () => togglePause();
  $('#btn-mus').onclick = () => { SAVE.settings.music = !SAVE.settings.music; Audio8.setMusic(SAVE.settings.music); persist(); $('#btn-mus').textContent = SAVE.settings.music ? 'Music on' : 'Music off'; };
  $('#btn-snd').onclick = () => { SAVE.settings.sfx = !SAVE.settings.sfx; Audio8.setSfx(SAVE.settings.sfx); persist(); $('#btn-snd').textContent = SAVE.settings.sfx ? 'Sound on' : 'Sound off'; };
  $('#btn-quit').onclick = () => confirmQuit();
  $('#board').addEventListener('pointerdown', e => { const b = e.target.closest('[data-pid]'); if (b) { selectPatient(+b.dataset.pid); Audio8.play('click'); } });
  $('#timeline').addEventListener('pointerdown', e => { const b = e.target.closest('[data-pid]'); if (b) { selectPatient(+b.dataset.pid); Audio8.play('click'); } });
  renderHUD(); renderBoard(); renderChart(); renderLog();
}
function logEvent(html, cls = '') {
  if (!G) return; G.log.unshift({ t: G.t, html, cls }); if (G.log.length > 60) G.log.length = 60; renderLog();
}
function renderLog() {
  const el = $('#log'); if (!el || !G) return;
  el.innerHTML = G.log.length ? G.log.map(l => `<div class="${l.cls}"><time>${fmtClock(l.t)}</time><span>${l.html}</span></div>`).join('') : '<div><time></time><span>Shift started. Patients will arrive through the door on the left.</span></div>';
}
function renderTimeline() {
  const el = $('#timeline'); if (!el) return;
  const W = 3, t = G.t; const pos = x => ((x - t) / W * 100);
  let axis = '', bands = '';
  for (let d = Math.ceil(t); d <= t + W; d++) { axis += `<span style="left:${pos(d)}%">Day ${d + 1}</span>`; }
  for (let d = Math.floor(t); d <= t + W; d++) { const a = Math.max(0, pos(d + 0.375)), b = Math.min(100, pos(d + 0.5)); if (b > a) bands += `<i class="noon" style="left:${a}%;width:${b - a}%"></i>`; if (d > t) bands += `<i class="day" style="left:${pos(d)}%"></i>`; }
  const ps = G.beds.map(b => b.p).filter(Boolean).sort((a, b) => a.dischargeT - b.dischargeT);
  el.innerHTML = `<div class="tl-axis">${axis}</div>` + (ps.length ? ps.map(p => {
    const x = Math.min(100, Math.max(0, pos(p.dischargeT)));
    const col = !p.coding.pdx ? 'var(--red)' : 'var(--mint)';
    return `<button class="tl-row ${G.sel === p.id ? 'sel' : ''}" data-pid="${p.id}"><span class="nm">${p.bed + 1} · ${esc(p.name.split(' ')[1] || p.name)}</span><span class="tl-track">${bands}<i class="mk" style="left:0;width:${x}%;background:${col};opacity:.25"></i><i class="mk" style="left:calc(${x}% - 4px);width:8px;background:${col}"></i></span></button>`;
  }).join('') : '<span class="muted" style="font-size:13px">No patients on the ward.</span>') + `<span class="muted" style="font-size:11px">Shaded: late-morning discharge window. Red: no principal diagnosis yet.</span>`;
}

function togglePause(force) {
  if (!G || G.over) return;
  if (G.cfg.hard) { if (force !== false) toast('Hard mode: the clock never stops.', 'warn', 1800); return; }
  const want = force != null ? force : !G.paused;
  if (want && G.coffeeUntil > performance.now()) { toast('Finish your coffee first.', '', 1500); return; }
  G.paused = want;
  const game = $('.game'); if (game) game.classList.toggle('paused', G.paused);
  const pb = $('#pause-banner'); if (pb) pb.hidden = !G.paused;
  G.armed = null; DRAG = null;
  $('#btn-pause') && ($('#btn-pause').textContent = G.paused ? 'Resume' : 'Pause');
  renderCoding(); renderTray();
  Audio8.play('click');
}
function confirmQuit() {
  const was = G.paused; if (!G.cfg.hard) G.paused = true;
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="modal frame"><h2>Leave this shift?</h2><p>${G.mode === 'career' ? 'Your career progress stays where it was before this shift. This shift will not count.' : 'This shift will not be scored.'}</p><div class="row"><button class="btn red" id="q-yes">Leave shift</button><button class="btn ghost" id="q-no">Keep coding</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#q-yes').onclick = () => { ov.remove(); G = null; showTitle(); };
  ov.querySelector('#q-no').onclick = () => { ov.remove(); if (G) G.paused = was; };
}

function renderHUD() {
  if (!G) return;
  const pips = $('#hud-pips'); if (!pips) return;
  let s = ''; for (let i = 0; i < G.maxEnergy; i++) s += `<i class="${i < G.energy ? 'on' : ''}"></i>`;
  pips.innerHTML = s;
  $('#hud-score').innerHTML = `<small>SCORE</small>${G.score.toLocaleString('en-US')}`;
  $('#hud-combo').textContent = G.combo > 1 ? 'COMBO x' + G.combo : '';
}
function updateHUDTick() {
  const c = $('#hud-clock'); if (c) c.innerHTML = `<small>DAY ${Math.floor(G.t) + 1}</small>${fmtClock(G.t)}`;
  const w = $('#waiting'); if (w) { const n = G.waiting.length; w.hidden = !n; if (n) w.textContent = n + ' waiting for a bed'; }
  const p = curP();
  if (p && !p.locked) {
    const left = Math.max(0, p.dischargeT - G.t);
    const bar = $('#dis-track'); if (bar) { bar.style.width = Math.min(100, left / 4 * 100) + '%'; bar.style.background = left < 0.5 ? 'var(--red)' : left < 1.2 ? 'var(--amber)' : 'var(--mint)'; }
    const lbl = $('#dis-left'); if (lbl) lbl.textContent = left.toFixed(1) + ' days';
    const ask = $('#ask-status'); if (ask && p.ask) ask.textContent = 'answer in ~' + Math.max(0, p.ask.endT - G.t).toFixed(1) + ' d';
  }
}

let boardIsDirty = true;
function boardDirty() { boardIsDirty = true; }
function renderBoard() {
  const el = $('#board'); if (!el) return;
  const ps = G.beds.map(b => b.p).filter(Boolean);
  if (!ps.length) { el.innerHTML = `<div class="empty-board">${G.queue.length ? 'The ward is quiet. Next admission is on its way…' : 'All patients have left. Wrapping up the shift…'}</div>`; return; }
  el.innerHTML = ps.map(p => {
    const left = Math.max(0, p.dischargeT - G.t);
    const col = left < 0.5 ? 'var(--red)' : left < 1.2 ? 'var(--amber)' : 'var(--mint)';
    const chips = [];
    chips.push(p.coding.pdx ? `<span class="chip ok">${esc(p.coding.pdx)}${p.coding.sdx.length + p.coding.procs.length ? ' +' + (p.coding.sdx.length + p.coding.procs.length) : ''}</span>` : `<span class="chip no">Not coded</span>`);
    if (p.newClues > 0 && G.sel !== p.id) chips.push(`<span class="chip new">${p.newClues} new</span>`);
    if (p.ask) chips.push(`<span class="chip wait">Asking</span>`);
    if (p.clues.some(c => c.chaseEnd != null && !c.clarified)) chips.push(`<span class="chip wait">Chasing</span>`);
    else if (p.clues.some(c => c.shown && c.vague && !c.clarified)) chips.push(`<span class="chip">Vague note</span>`);
    return `<button class="pcard ${G.sel === p.id ? 'sel' : ''} ${(!p.coding.pdx && left < 0.5) ? 'urgent' : ''}" data-pid="${p.id}">
      <div class="top"><span class="muted">Bed ${p.bed + 1}</span><span class="num" style="color:${col}">${left.toFixed(1)} d</span></div>
      <div class="nm">${esc(p.name)}</div>
      <div class="bar"><i style="width:${Math.min(100, left / 4 * 100)}%;background:${col}"></i></div>
      <div class="chips">${chips.join('')}</div></button>`;
  }).join('');
}

function selectPatient(id) {
  if (!G) return;
  if (G.sel !== id) { G.filter = null; G.focusCode = null; G.armed = null; G.search = ''; }
  G.sel = id;
  const p = curP(); if (p) p.newClues = 0;
  renderChart(); boardDirty();
  tipLater('chart');
}

// ---------------------------------------------------------------- chart
function renderChart() {
  const el = $('#chart'); if (!el) return;
  const p = curP();
  if (!p) {
    el.classList.remove('locked');
    el.innerHTML = `<div class="chart-empty"><div>${icon('note', 'lg')}</div><h2>No chart open</h2><p>Click a bed on the ward or a patient card to open their chart.</p></div>`;
    return;
  }
  const doc = DOCTORS[p.doctor];
  el.classList.toggle('locked', !!p.locked);
  el.innerHTML = `
    <div class="chart-head">
      <canvas width="64" height="64" id="portrait"></canvas>
      <div>
        <h2>${esc(p.name)}</h2>
        <div class="meta"><span>${p.age} y, ${p.sex === 'F' ? 'female' : 'male'}</span><span>Bed ${p.bed + 1}</span><span>Admitted ${fmtWhen(p.admitT)}</span></div>
        ${p.locked ? `<div class="meta" style="margin-top:4px"><span class="tag">Discharged · case locked</span></div>` : `<div class="dis-bar"><span class="muted">Discharge</span><div class="track"><i id="dis-track"></i></div><b id="dis-left"></b></div>`}
        <div class="doc-row">
          <canvas width="32" height="32" id="docport"></canvas>
          <div class="who">${esc(doc.name)}<small>${esc(doc.trait)}: ${esc(doc.desc)}</small></div>
          ${p.locked ? '' : p.ask ? `<span class="tag">${icon('steth', 'sm')} Asked · <span id="ask-status"></span></span>` : `<button class="btn small mint" id="btn-ask">${icon('steth', 'sm')} Ask doctor · ${askCost()}${icon('bolt', 'sm')}</button>`}
        </div>
      </div>
    </div>
    ${p.locked ? `<div class="chart-docs" id="c-result"></div>` : `<div class="chart-docs"><div class="sec-title"><span>Patient record</span><span id="doc-count"></span></div><div class="docs" id="c-docs"></div></div>
    <div class="chart-work"><div class="coding" id="c-coding"></div>
      <div class="finder"><div class="sec-title"><span>Code finder</span>${G.filter ? '<button class="btn small ghost" id="clr-filter">Show all</button>' : ''}</div>
      <input id="code-search" placeholder="Search codes or terms, e.g. 'sepsis' or 'J18'" value="${esc(G.search)}" autocomplete="off" aria-label="Search the code catalogue">
      <div id="c-tray"></div></div></div>`}`;
  drawPortrait($('#portrait'), p.look, p.sex);
  drawDocPortrait($('#docport'), doc);
  if (p.locked) { renderCaseResult($('#c-result'), p.result, p); return; }
  const ask = $('#btn-ask'); if (ask) ask.onclick = () => askDoctor(p);
  const si = $('#code-search');
  si.oninput = () => { G.search = si.value; renderTray(); };
  renderDocs(); renderCoding(); renderTray(); updateHUDTick();
}

function renderDocs() {
  const p = curP(); const el = $('#c-docs'); if (!p || !el) return;
  const list = shownClues(p).slice().reverse();
  $('#doc-count').textContent = list.length + (list.length === 1 ? ' document' : ' documents');
  el.innerHTML = list.map(c => {
    const e = effClue(c);
    const isV = c.vague && !c.clarified;
    const by = c.by ? DOCTORS[c.by] : null;
    let body;
    if (c.vague && c.clarified) body = `<p style="opacity:.7;font-style:italic">${markupHTML(c.text, c.id)}</p><div class="clar">${markupHTML(c.vague.text, c.id)}</div>`;
    else body = `<p>${markupHTML(c.text, c.id)}</p>`;
    let flag = '';
    if (isV) flag = `<div class="flag"><span class="lbl">Vague · not codable</span>${c.chaseEnd != null ? `<span>Chasing… back in ~${Math.max(0, c.chaseEnd - G.t).toFixed(1)} d</span>` : `<button class="btn small amber" data-chase="${c.id}">${icon('paper', 'sm')} Chase documentation · ${chaseCost()}${icon('bolt', 'sm')}</button>`}</div>`;
    else if (c.vague && c.clarified) flag = `<div class="flag"><span class="lbl ok">Clarified</span></div>`;
    else if (c.hint && !c.decoyAnswered) flag = `<div class="flag"><span class="lbl hint">Lab value</span><span>A number alone is not codable. Was it treated? Ask the doctor.</span></div>`;
    const cls = ['doc', isV ? 'vague' : '', c.answer ? 'answer' : '', c.fresh ? 'fresh' : ''].join(' ');
    c.fresh = false;
    return `<article class="${cls}"><div class="dh"><span class="stamp ${c.src}">${esc(by ? by.name.toUpperCase() : SRC_LABEL[c.src].toUpperCase())}</span><span>${fmtWhen(c.revealT)}</span></div>${body}${flag}</article>`;
  }).join('');
  el.querySelectorAll('[data-chase]').forEach(b => b.onclick = () => chase(p, +b.dataset.chase));
  el.querySelectorAll('.term').forEach(b => b.onclick = () => {
    G.filter = { term: b.textContent, codes: b.dataset.codes.split(',') }; G.search = ''; const si = $('#code-search'); if (si) si.value = '';
    Audio8.play('click'); renderTray(); renderChartFilterBtn();
    const tray = $('#c-tray'); if (tray) tray.scrollIntoView({ block: window.innerWidth <= 980 ? 'center' : 'nearest', behavior: 'smooth' });
    tipLater('cards');
  });
}
function renderChartFilterBtn() {
  const t = $('.finder .sec-title'); if (!t) return;
  t.innerHTML = `<span>Code finder</span>${G.filter ? '<button class="btn small ghost" id="clr-filter">Show all</button>' : ''}`;
  const b = $('#clr-filter'); if (b) b.onclick = () => { G.filter = null; renderTray(); renderChartFilterBtn(); };
}
function markupHTML(text, cid) {
  return parseMarkup(text).map(s => s.codes ? `<button class="term" data-codes="${esc(s.codes.join(','))}" title="Show matching codes">${esc(s.t)}</button>` : esc(s.t)).join('');
}

function cardHTML(code, opts = {}) {
  const c = CODES[code]; if (!c) return '';
  const kindCls = c.kind === 'proc' ? 'proc' : c.kind === 'vent' ? 'vent' : c.sec ? 'sec-only' : '';
  let ccl = '';
  if (c.kind === 'dx') { ccl = '<span class="ccl" title="CCL ' + c.ccl + ' (complication level as a secondary diagnosis)">'; for (let i = 0; i < 4; i++) ccl += `<i class="${i < c.ccl ? 'on' : ''}"></i>`; ccl += '</span>'; }
  const placedIn = opts.placed;
  let acts = '';
  if (!placedIn && !opts.noActs) {
    if (c.kind === 'dx') acts = `<span class="acts">${c.sec ? '' : `<button data-act="pdx" data-code="${code}">Principal</button>`}<button data-act="sdx" data-code="${code}">Secondary</button></span>`;
    else acts = `<span class="acts"><button data-act="proc" data-code="${code}">Add procedure</button></span>`;
  }
  return `<div class="card ${kindCls} ${opts.cls || ''}" data-code="${code}" ${placedIn ? `data-from="${placedIn}"` : ''} tabindex="0" title="${esc(c.name)}">
    <span class="cd">${esc(code)}</span>${placedIn ? `<button class="x" data-rm="${code}" aria-label="Remove ${esc(code)}">×</button>` : ccl}
    <span class="cn">${esc(c.name)}</span>${acts}</div>`;
}

function renderCoding() {
  const p = curP(); const el = $('#c-coding'); if (!p || !el) return;
  const cd = p.coding; const g = group(cd);
  let segs = ''; for (let i = 0; i < 6; i++) segs += `<i class="${i < g.pccl ? 'on' : ''}"></i>`;
  el.innerHTML = `
    <div class="sec-title"><span>Coding</span><span>Grouper live</span></div>
    <div class="drgbox">
      <div class="drg ${g.error ? 'err' : ''}">${esc(g.drg)}</div>
      <div class="nm">${esc(g.name)}<br><span style="color:var(--dim)">RW ${fmtRW(g.rw)} × ${euro(BASE_RATE)}</span></div>
      <div class="val">${euro(g.value)}<small>case value</small></div>
      <div class="pccl"><span>PCCL</span><span class="segs">${segs}</span><b>${g.pccl}</b><span class="why">${esc(g.reason)}${g.split ? ' · split ' + esc(g.drg.slice(-1)) + ': ' + esc(g.split) : ''}</span></div>
    </div>
    <div class="zone-label"><span>Principal diagnosis</span><span class="muted">main reason for the stay</span></div>
    <div class="zone principal ${G.armed && CODES[G.armed].kind === 'dx' && !CODES[G.armed].sec ? 'armed' : ''}" data-zone="pdx">${cd.pdx ? cardHTML(cd.pdx, { placed: 'pdx', cls: (CODES[cd.pdx] && CODES[cd.pdx].sec) ? 'bad-pdx' : '' }) : '<span class="ph">Drag a diagnosis here</span>'}</div>
    <div class="zone-label"><span>Secondary diagnoses</span><span class="muted">only if they caused extra effort</span></div>
    <div class="zone ${G.armed && CODES[G.armed].kind === 'dx' ? 'armed' : ''}" data-zone="sdx">${cd.sdx.map(c => cardHTML(c, { placed: 'sdx' })).join('') || '<span class="ph">Drop secondary diagnoses here</span>'}</div>
    <div class="zone-label"><span>Procedures & ventilation</span><span class="muted">OPS codes</span></div>
    <div class="zone ${G.armed && CODES[G.armed].kind !== 'dx' ? 'armed' : ''}" data-zone="proc">${cd.procs.map(c => cardHTML(c, { placed: 'proc' })).join('') || '<span class="ph">Drop procedures here</span>'}</div>`;
  el.querySelectorAll('[data-rm]').forEach(b => b.onclick = e => { e.stopPropagation(); unplace(b.dataset.rm); });
  el.querySelectorAll('.zone').forEach(z => z.onclick = e => { if (G.armed && !e.target.closest('.card')) place(G.armed, z.dataset.zone); });
}

function renderTray() {
  const p = curP(); const el = $('#c-tray'); if (!p || !el) return;
  const placed = codingSet(p.coding);
  const groups = [];
  const q = G.search.trim().toLowerCase();
  if (q) {
    const hits = Object.values(CODES).filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || (c.note || '').toLowerCase().includes(q)).slice(0, 18).map(c => c.code);
    groups.push({ label: `Search results for <b>${esc(G.search)}</b>`, codes: hits, empty: 'Nothing found. Try a word from the notes.' });
  } else if (G.filter) {
    groups.push({ label: `Codes for <b>“${esc(G.filter.term)}”</b>`, codes: G.filter.codes });
  }
  if (!q) {
    const sugg = []; const seen = new Set(G.filter ? G.filter.codes : []);
    for (const c of shownClues(p).slice().reverse()) {
      const txt = c.text + ' ' + (c.vague && c.clarified ? c.vague.text : '');
      for (const s of parseMarkup(txt)) if (s.codes) for (const k of s.codes) if (!seen.has(k)) { seen.add(k); sugg.push(k); }
    }
    groups.push({ label: G.filter ? 'Other terms in this chart' : 'Terms found in this chart', codes: sugg, empty: 'No codable terms yet. Wait for more documents.' });
  }
  const focus = G.focusCode && CODES[G.focusCode];
  el.innerHTML = (focus ? `<div class="notebox"><b>${esc(focus.code)}</b> ${esc(focus.name)}${focus.kind === 'dx' ? ` · CCL ${focus.ccl}${focus.sec ? ' · secondary only' : ''}${focus.drg ? ' · as principal → ' + focus.drg : ''}` : ''}<br>${esc(focus.note || '')}</div>` : '') +
    groups.map(gr => `<div class="tray-group"><div class="lbl">${gr.label}</div><div class="tray">${gr.codes.length ? gr.codes.map(c => cardHTML(c, { cls: placed.has(c) ? 'in-chart' : '' })).join('') : `<span class="muted" style="font-size:13px">${gr.empty || ''}</span>`}</div></div>`).join('');
  el.querySelectorAll('[data-act]').forEach(b => b.onclick = e => { e.stopPropagation(); place(b.dataset.code, b.dataset.act); });
}

// ---------------------------------------------------------------- drag & drop
let DRAG = null;
document.addEventListener('pointerdown', e => {
  const card = e.target.closest('.card[data-code]');
  if (!card || e.target.closest('button') || !G || G.over) return;
  DRAG = { code: card.dataset.code, from: card.dataset.from || null, x0: e.clientX, y0: e.clientY, el: card, ghost: null, id: e.pointerId };
});
document.addEventListener('pointermove', e => {
  if (!DRAG) return;
  if (!DRAG.ghost) {
    if (Math.hypot(e.clientX - DRAG.x0, e.clientY - DRAG.y0) < 6) return;
    if (locked()) { DRAG = null; return; }
    const r = DRAG.el.getBoundingClientRect();
    const g = DRAG.el.cloneNode(true); g.classList.add('dragging'); g.style.width = r.width + 'px'; g.style.left = r.left + 'px'; g.style.top = r.top + 'px';
    DRAG.dx = e.clientX - r.left; DRAG.dy = e.clientY - r.top;
    document.body.appendChild(g); DRAG.ghost = g; Audio8.play('pick');
  }
  DRAG.ghost.style.left = (e.clientX - DRAG.dx) + 'px'; DRAG.ghost.style.top = (e.clientY - DRAG.dy) + 'px';
  document.querySelectorAll('.zone.over').forEach(z => z.classList.remove('over'));
  const under = document.elementFromPoint(e.clientX, e.clientY); const z = under && under.closest('.zone'); if (z) z.classList.add('over');
  e.preventDefault();
}, { passive: false });
document.addEventListener('pointerup', e => {
  if (!DRAG) return;
  const d = DRAG; DRAG = null;
  document.querySelectorAll('.zone.over').forEach(z => z.classList.remove('over'));
  if (!d.ghost) {
    // click: focus the card's explanation and arm it for tap-to-place
    if (!G) return;
    G.focusCode = d.code;
    if (!d.from && !G.paused) G.armed = G.armed === d.code ? null : d.code;
    renderTray(); renderCoding(); return;
  }
  d.ghost.remove();
  const under = document.elementFromPoint(e.clientX, e.clientY); const z = under && under.closest('.zone');
  if (z) place(d.code, z.dataset.zone);
  else if (d.from) unplace(d.code);
});
document.addEventListener('pointercancel', () => { if (DRAG && DRAG.ghost) DRAG.ghost.remove(); DRAG = null; });

// ---------------------------------------------------------------- keyboard
document.addEventListener('keydown', e => {
  if (!G || G.over || e.target.matches('input, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); if (!G.coach) togglePause(); }
  else if (G.coach) return;
  else if (/^Digit[1-9]$/.test(e.code)) { const b = G.beds[+e.code.slice(5) - 1]; if (b && b.p) selectPatient(b.p.id); }
  else if (e.key === 'c' || e.key === 'C') coffee();
  else if (e.key === 'a' || e.key === 'A') { const p = curP(); if (p) askDoctor(p); }
  else if (e.key === 'Escape') { G.filter = null; G.armed = null; renderTray(); renderCoding(); renderChartFilterBtn(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && G && !G.over && !G.paused && !G.coach && !G.cfg.hard) togglePause(true); });

// ============================================================================
// CASE RESULT VIEW
// ============================================================================
function codeList(codes, ref, cls) {
  return codes.length ? codes.map(c => `<div class="c ${ref && !ref.has(c) ? cls : ''}">${esc(c)} <span class="muted">${esc(CODES[c] ? CODES[c].name : '')}</span></div>`).join('') : '<div class="c muted">none</div>';
}
function renderCaseResult(el, r, p) {
  const title = { clean: 'Clean case', drg: 'Right DRG, details off', under: 'Undercoded', risk: 'Unsupported codes: audit risk', lost: 'Case lost' }[r.status];
  const idealSet = new Set([r.ideal.pdx, ...r.ideal.sdx, ...r.ideal.procs]);
  const mineSet = new Set([r.coding.pdx, ...r.coding.sdx, ...r.coding.procs].filter(Boolean));
  el.innerHTML = `<div class="case-result">
    <div class="res-banner ${r.status}">${title} · ${r.total >= 0 ? '+' : ''}${r.total} pts</div>
    <div class="pts">${r.pts.map(x => `<div class="${x.cls}"><span>${esc(x.label)}</span><b class="num">${x.v >= 0 ? '+' : ''}${x.v}</b></div>`).join('')}</div>
    <div class="cmp">
      <div><h4>You billed</h4><b>${esc(r.gP.drg)} · ${euro(r.gP.value)}</b>${codeList([r.coding.pdx].filter(Boolean), idealSet, 'extra')}${codeList(r.coding.sdx.concat(r.coding.procs), idealSet, 'extra')}</div>
      <div><h4>The record supports</h4><b>${esc(r.gI.drg)} · ${euro(r.gI.value)}</b>${codeList([r.ideal.pdx].filter(Boolean), mineSet, 'miss')}${codeList(r.ideal.sdx.concat(r.ideal.procs), mineSet, 'miss')}</div>
    </div>
    ${r.risk > 0 ? `<p class="muted" style="margin:0">If the MD audits this case, ${euro(r.risk)} would be clawed back, plus a surcharge.</p>` : ''}
    ${r.notes.length ? `<ul class="notes">${r.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
    ${p && p.clues ? `<details><summary class="muted" style="cursor:pointer">Final record (${shownClues(p).length} documents)</summary><div class="docs" style="margin-top:8px">${shownClues(p).map(c => `<article class="doc ${c.vague && !c.clarified ? 'vague' : ''}"><div class="dh"><span class="stamp ${c.src}">${SRC_LABEL[c.src].toUpperCase()}</span><span>${fmtWhen(c.revealT)}</span></div><p>${esc(stripMarkup(effClue(c).text))}</p></article>`).join('')}</div></details>` : ''}
  </div>`;
}

// ============================================================================
// COACH TIPS
// ============================================================================
const TIPS = {
  welcome: ['Welcome to the ward!', 'I\'m <em>Nurse Bea</em>. Patients arrive, stay a few days and go home. Your job: <em>code every case before discharge</em>. Each case becomes a DRG, and the DRG decides what the hospital gets paid.'],
  chart: ['This is the chart', 'Documents trickle in during the stay. <em>Yellow words</em> are codable terms: click one and the matching code cards appear in the code finder below.'],
  cards: ['Pick the right card', 'Several cards can match a term. Read the note carefully and drag the right card into <em>Principal diagnosis</em>, or use its buttons. Click a card to read what it means.'],
  drg: ['The grouper reacts', 'The DRG box updates live. The <em>principal diagnosis</em> picks the base DRG. Secondary diagnoses and procedures can push it into a better-paid split.'],
  pccl: ['Secondary diagnoses', 'Each secondary has a CCL weight (purple pips). Together they form the <em>PCCL 0–6</em>, which picks split A, B, C… Only code what the record supports: a treated, documented condition.'],
  newclue: ['New clue!', 'A bed with a <em>yellow “!”</em> has a new document. Code early, but check back: a later report can change the DRG.'],
  replace: ['The diagnosis changed', 'A new finding replaced an earlier one (for example a symptom became a diagnosis). <em>Update the principal</em>, or your coding no longer matches the record.'],
  hint: ['A lab value is not a diagnosis', 'A low potassium on paper is not codable. Only if it was <em>treated</em>. The doctor knows: <em>Ask the doctor</em> costs energy and takes a while.'],
  vague: ['Vague note', '“Seems confused” cannot be coded. <em>Chase documentation</em> to get a proper diagnosis written down. Coding it without documentation is upcoding.'],
  energy: ['Running low', 'Asking and chasing cost energy. <em>Coffee</em> refills it, but the ward keeps moving while you are away.'],
  alarm: ['Discharge imminent!', 'A patient leaves in under half a day with no principal diagnosis. If they leave uncoded, the case is lost.'],
  discharge: ['Case closed', 'When a patient leaves, the case locks and is scored against the final record. Click the patient card in the results to learn what you missed.'],
  risk: ['Careful: audit risk', 'You billed codes the record does not support. That pays now, but at the end of the week the <em>MD audit</em> reviews cases, and unsupported codes cost heavily.'],
};
function tipLater(id) { if (!G || !G.cfg.tips) return; if (!SAVE.settings.tips || SAVE.tipsSeen[id]) return; if (G.coach) { if (!G.coachQueue.includes(id) && G.coach !== id) G.coachQueue.push(id); return; } setTimeout(() => tip(id), 250); }
function tip(id) {
  if (!G || G.over || !G.cfg.tips || !SAVE.settings.tips || SAVE.tipsSeen[id] || !TIPS[id]) return;
  if (G.coach) { if (!G.coachQueue.includes(id)) G.coachQueue.push(id); return; }
  SAVE.tipsSeen[id] = true; persist();
  G.coach = id;
  const [title, body] = TIPS[id];
  const ov = document.createElement('div'); ov.className = 'overlay clear'; ov.id = 'coach-ov';
  ov.innerHTML = `<div class="coach frame" role="dialog" aria-label="Tip"><canvas width="64" height="64"></canvas><div><h3>${title}</h3><p>${body}</p><div class="row"><button class="btn ghost small" id="tip-off">Turn tips off</button><button class="btn" id="tip-ok">Got it</button></div></div></div>`;
  document.body.appendChild(ov);
  drawNursePortrait(ov.querySelector('canvas'));
  const close = () => { ov.remove(); if (!G) return; G.coach = null; const n = G.coachQueue.shift(); if (n) setTimeout(() => tip(n), 200); };
  ov.querySelector('#tip-ok').onclick = close; ov.querySelector('#tip-ok').focus();
  ov.querySelector('#tip-off').onclick = () => { SAVE.settings.tips = false; persist(); G.coachQueue = []; close(); };
  Audio8.play('click');
}
function drawNursePortrait(cv) {
  drawPortrait(cv, { skin: '#c98e62', hair: '#1a1410', bald: false }, 'F');
  const ctx = cv.getContext('2d'); const s = cv.width / 16;
  R(ctx, 0, 11 * s, 16 * s, 5 * s, '#6fc3b0'); R(ctx, 6 * s, 11 * s, 4 * s, 2 * s, '#4fa390');
  R(ctx, 3 * s, 0, 10 * s, 2 * s, '#ffffff'); R(ctx, 7 * s, 0, 2 * s, 2 * s, '#e65c5c');
}

// ============================================================================
// MAIN LOOP
// ============================================================================
let lastTS = performance.now();
function frame(ts) {
  const dt = Math.min(0.1, (ts - lastTS) / 1000); lastTS = ts;
  const cv = document.getElementById('ward') || document.getElementById('title-cv');
  if (G && !G.over) {
    const running = !G.paused && !G.coach;
    if (running) {
      G.t += dt * G.speed / DAY_SEC * (G.cfg.tutorial ? 0.8 : 1);
      G.real += dt;
      simStep();
      if (!G) { requestAnimationFrame(frame); return; }
      stepActors(G, dt * G.speed);
    }
    if (cv) {
      const ctx = cv.getContext('2d'); renderScene(ctx, G);
      if (G.paused) { ctx.fillStyle = 'rgba(12,16,32,0.35)'; ctx.fillRect(0, 0, VW, VH); ptextOutlined(ctx, 'PAUSED', VW / 2, 92, '#ffd84a', '#0c1020', 3, 'center'); }
    }
    if (G && !G.over) {
      updateHUDTick();
      if (boardIsDirty || G.real - G.lastBoard > 0.5) { G.lastBoard = G.real; boardIsDirty = false; renderBoard(); renderTimeline(); }
      const btn = $('#btn-coffee'); if (btn) btn.disabled = G.coffeeUntil > performance.now();
    }
  } else if (AUDIT) { bossTick();
  } else if (SCENE && cv) {
    SCENE.real += dt; SCENE.t += dt / 90; stepActors(SCENE, dt);
    renderScene(cv.getContext('2d'), SCENE);
  }
  requestAnimationFrame(frame);
}
