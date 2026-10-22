// ============================================================================
// ENGINE: RNG, case generation, documentation record, grouper, scoring
// ============================================================================

// ---- seeded RNG
function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function makeRng(seed) { return mulberry32(xmur3(String(seed))()); }
const rr = (rng, a, b) => a + (b - a) * rng();
const ri = (rng, a, b) => Math.floor(rr(rng, a, b + 1));
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// ---- markup helpers
// "{text|A,B}" -> segments
function parseMarkup(text) {
  const out = []; const re = /\{([^|}]+)\|([^}]+)\}/g; let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index) });
    out.push({ t: m[1], codes: m[2].split(',').map(s => s.trim()) });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}
const stripMarkup = text => text.replace(/\{([^|}]+)\|[^}]+\}/g, '$1');

const DECOY_HINTS = [
  { text: 'Haemoglobin 11.4 g/dl (slightly low).', answer: '"The Hb? Slightly low, but we did nothing about it. Not relevant."' },
  { text: 'Potassium 3.4 mmol/l (borderline low).', answer: '"Borderline potassium, no treatment. Don\'t code that."' },
  { text: 'CRP 18 mg/l (mildly raised).', answer: '"Mild CRP rise, no infection found. Nothing to add."' },
  { text: 'TSH 4.6 mU/l (borderline high).', answer: '"Thyroid is fine. No treatment, no diagnosis."' },
];

// ============================================================================
// CASE GENERATION
// ============================================================================
let PID = 1;
function makePatient(rng, tpl, ward, arriveT, opts = {}) {
  const sex = rng() < 0.5 ? 'F' : 'M';
  const used = opts.usedNames || new Set();
  let name, tries = 0;
  do { name = pick(rng, sex === 'F' ? NAMES_F : NAMES_M); tries++; } while (used.has(name) && tries < 30);
  used.add(name);
  const flags = {};
  for (const [k, p] of Object.entries(tpl.flags || {})) flags[k] = rng() < p;
  if (tpl.derive) tpl.derive(flags, ward, rng);
  const wardDef = WARDS[ward];
  const doctor = pick(rng, wardDef.doctors);
  let los = rr(rng, tpl.los[0], tpl.los[1]) * (opts.losScale || 1);
  // discharges cluster in the late morning, like real wards
  let target = arriveT + los;
  let day = Math.floor(target);
  let dis = day + rr(rng, 0.38, 0.5);
  if (dis < arriveT + los * 0.8) dis += 1;
  los = dis - arriveT;
  const clues = [];
  let cid = 0;
  for (const c of tpl.clues) {
    if (c.if && !flags[c.if]) continue;
    if (c.ifnot && flags[c.ifnot]) continue;
    if (c.and && !flags[c.and]) continue;
    const cl = {
      id: cid++, f: c.f, src: c.src, text: c.text,
      sup: (c.sup || []).slice(), pdx: c.pdx || null, drop: (c.drop || []).slice(),
      hidden: !!c.hidden, hint: !!c.hint, shown: false, revealT: Infinity,
      vague: null, clarified: false, chaseEnd: null, by: null,
    };
    if (c.vague) {
      let v = c.vague;
      const altFlag = v.altFlag || 'days14';
      if (v.alt && !flags[altFlag]) v = Object.assign({}, v, v.alt);
      let sup = (v.sup || []).slice();
      if (v.dyn === 'delir') sup = flags.dementia ? ['F05.1'] : ['F05.0'];
      cl.vague = { text: v.text, sup, pdx: v.pdx || null, drop: (v.drop || []).slice() };
    }
    clues.push(cl);
  }
  if (rng() < 0.3) {
    const d = pick(rng, DECOY_HINTS);
    clues.push({ id: cid++, f: rr(rng, 0.15, 0.5), src: 'LAB', text: d.text, sup: [], pdx: null, drop: [], hidden: false, hint: true, decoy: d.answer, shown: false, revealT: Infinity, vague: null, clarified: false });
  }
  const p = {
    id: PID++, name, sex, age: ri(rng, tpl.age[0], tpl.age[1]), tpl: tpl.id, dxLabel: tpl.dx, ward,
    doctor, flags, arriveT, los, dischargeT: arriveT + los, admitT: null, bed: -1,
    clues, coding: { pdx: null, sdx: [], procs: [] },
    locked: false, result: null, ask: null, asked: 0, newClues: 0, warned: false,
    look: { hair: pick(rng, sex === 'F' ? ['#d8d4cc', '#b8b0a4', '#7a5230', '#2a1c14', '#c89a5a', '#e8e4dc'] : ['#d8d4cc', '#9a948a', '#3a2a1e', '#1a1410', '#e8e4dc', '#6a5a4a']), skin: pick(rng, ['#f2c9a0', '#e8b48a', '#c98e62', '#a8714a', '#7a4a2e', '#f6d5b5']), blanket: pick(rng, ['#7fb8d8', '#8fc7a8', '#d8a8c8', '#e8d088', '#a8b8e8']), bald: sex === 'M' && rng() < 0.35 },
  };
  return p;
}

// ============================================================================
// RECORD: what the documentation supports at a point in time
// ============================================================================
function effClue(cl) {
  // the clue as it currently counts for coding
  if (cl.vague && !cl.clarified) return { sup: [], pdx: null, drop: [], text: cl.text, vague: true };
  if (cl.vague && cl.clarified) return { sup: cl.vague.sup, pdx: cl.vague.pdx, drop: cl.vague.drop, text: cl.vague.text };
  return { sup: cl.sup, pdx: cl.pdx, drop: cl.drop, text: cl.text };
}
function shownClues(p) { return p.clues.filter(c => c.shown).sort((a, b) => a.revealT - b.revealT || a.id - b.id); }

function computeRecord(p) {
  const S = new Set(); let pdx = null; const evidence = {};
  for (const cl of shownClues(p)) {
    const e = effClue(cl);
    for (const d of e.drop) { S.delete(d); delete evidence[d]; }
    for (const s of e.sup) { S.add(s); (evidence[s] = evidence[s] || []).push(cl.id); }
    if (e.pdx) { pdx = e.pdx; S.add(e.pdx); (evidence[e.pdx] = evidence[e.pdx] || []).push(cl.id); }
  }
  if (pdx && !S.has(pdx)) pdx = null;
  if (!pdx) {
    // fall back to the first supported diagnosis that can be principal
    for (const s of S) { const c = CODES[s]; if (c && c.kind === 'dx' && !c.sec) { pdx = s; break; } }
  }
  const sdx = [...S].filter(c => CODES[c] && CODES[c].kind === 'dx' && c !== pdx);
  const procs = [...S].filter(c => CODES[c] && CODES[c].kind !== 'dx');
  return { S, ideal: { pdx, sdx, procs }, evidence };
}

// ============================================================================
// GROUPER
// ============================================================================
function calcPCCL(sdx, pdx) {
  const ccls = sdx.filter(c => c !== pdx).map(c => (CODES[c] ? CODES[c].ccl : 0)).filter(x => x > 0).sort((a, b) => b - a);
  let sum = 0; ccls.forEach((c, i) => { sum += c * Math.exp(-0.4 * i); });
  const v = Math.round(Math.log(1 + sum) / (Math.log(3 / 0.4) / 4));
  return Math.max(0, Math.min(6, v));
}

function group(coding) {
  const pdx = coding.pdx; const sdx = coding.sdx || []; const procs = new Set(coding.procs || []);
  const res = { drg: '960Z', base: '960', name: DRGS['960'].name, rw: 0, value: 0, pccl: 0, reason: 'No principal diagnosis coded.', error: true };
  if (!pdx) return res;
  const pc = CODES[pdx];
  if (!pc || pc.kind !== 'dx' || pc.sec || !pc.drg) {
    return Object.assign(res, { drg: '961Z', base: '961', name: DRGS['961'].name, reason: (pc ? pc.code : pdx) + ' may not be used as a principal diagnosis.' });
  }
  const pccl = calcPCCL(sdx, pdx);
  const mdc = pc.drg[0];
  const procList = [...procs].map(c => CODES[c]).filter(Boolean);
  const geri = Math.max(0, ...procList.map(c => c.geri || 0));
  const complex = procList.some(c => c.complex);
  const icu = procs.has('8-980.1');
  const big = procList.some(c => c.surg && c.surg.big);
  const sdxSet = new Set(sdx);
  let base = pc.drg; let why = 'Principal diagnosis ' + pdx + ' → ' + pc.drg;
  const surg = procList.filter(c => c.surg);
  const invasive = procList.filter(c => c.invasive);
  if (procs.has('VENT96')) { base = 'A13'; why = 'Ventilation ≥ 96 h → pre-MDC A13'; }
  else if (geri && surg.some(c => c.surg.mdc === 'I') && mdc === 'I') { base = 'I34'; why = 'Geriatric early rehab + hip surgery → I34'; }
  else if (surg.length) {
    const s = surg.find(c => c.surg.mdc === mdc);
    if (s) { base = s.surg.drg; why = s.code + ' with matching principal → ' + base; }
    else { base = '901'; why = 'OR procedure ' + surg[0].code + ' does not fit principal ' + pdx + ' → error DRG 901'; }
  } else if (geri) { base = GERI_DRG[mdc] || 'B44'; why = 'Geriatric early rehab (8-550) → ' + base; }
  else if (invasive.length && mdc === 'F') {
    const isMI = pdx.startsWith('I21'); const pci = invasive.some(c => c.invasive === 'pci');
    if (pci) base = isMI ? 'F24' : 'F58'; else base = isMI ? 'F41' : 'F49';
    why = (pci ? 'PCI' : 'Angiography') + (isMI ? ' with acute MI' : '') + ' → ' + base;
  } else if (procs.has('VENT24') && VENT24_DRG[mdc]) { base = VENT24_DRG[mdc]; why = 'Ventilation > 24 h → ' + base; }
  const def = DRGS[base];
  const ctx = { pccl, pdx, sdx: sdxSet, procs, complex, geri, icu, big };
  let split = def.splits[def.splits.length - 1];
  for (const s of def.splits) { if (s[2](ctx)) { split = s; break; } }
  let rw = split[1];
  if (procs.has('VENT24') && !VENT24_DRG[mdc] && base !== 'A13') rw += 0.45; // ventilation surcharge outside respiratory/circulatory
  rw = Math.round(rw * 1000) / 1000;
  return { drg: (base === '901' ? '901' : base) + split[0], base, name: def.name, rw, value: Math.round(rw * BASE_RATE), pccl, reason: why, split: split[3], error: base === '901' };
}

// ============================================================================
// SCORING
// ============================================================================
function codingSet(c) { return new Set([c.pdx, ...c.sdx, ...c.procs].filter(Boolean)); }
function sameCoding(a, b) {
  if (a.pdx !== b.pdx) return false;
  const A = new Set([...a.sdx, ...a.procs]), B = new Set([...b.sdx, ...b.procs]);
  if (A.size !== B.size) return false; for (const x of A) if (!B.has(x)) return false; return true;
}
// What an auditor would accept: unsupported codes struck, principal re-sequenced
function auditedCoding(coding, rec) {
  const S = rec.S;
  const sdx = coding.sdx.filter(c => S.has(c));
  let pdx = coding.pdx;
  if (pdx && (!S.has(pdx) || pdx !== rec.ideal.pdx)) pdx = rec.ideal.pdx;
  if (!coding.pdx) pdx = null;
  return { pdx, sdx: sdx.filter(c => c !== pdx), procs: coding.procs.filter(c => S.has(c)) };
}

function evaluateCase(p) {
  const rec = computeRecord(p);
  const coding = p.coding;
  const ideal = rec.ideal;
  const gI = group(ideal);
  const gP = group(coding);
  const aud = auditedCoding(coding, rec);
  const gA = coding.pdx ? group(aud) : gP;
  const all = codingSet(coding);
  const unsupported = [...all].filter(c => !rec.S.has(c));
  const missed = [...ideal.sdx, ...ideal.procs].filter(c => !all.has(c));
  const notes = [];
  const pts = []; let total = 0;
  const add = (label, v, cls) => { pts.push({ label, v, cls }); total += v; };
  let status;
  if (!coding.pdx) {
    status = 'lost';
    add('Case not coded at discharge', -150, 'bad');
    notes.push('No principal diagnosis when the patient left. The case went to the backlog and billing is delayed.');
  } else {
    add('Billed ' + gP.drg + ' (' + euro(gP.value) + ')', Math.round(gP.value / 10), '');
    const clean = sameCoding(coding, ideal);
    if (clean) { status = 'clean'; }
    else if (unsupported.length) status = 'risk';
    else if (gP.drg === gI.drg) status = 'drg';
    else status = 'under';
    if (clean) add('Clean case', 150, 'good');
    else if (gP.drg === gI.drg && !unsupported.length) add('Correct DRG', 60, 'good');
    // sharp eye: DRG-relevant secondaries the player caught
    for (const s of ideal.sdx) {
      if (!coding.sdx.includes(s)) continue;
      const without = group({ pdx: ideal.pdx, sdx: ideal.sdx.filter(x => x !== s), procs: ideal.procs });
      if (without.value < gI.value) add('Sharp eye: ' + s, 40, 'good');
    }
    if (coding.pdx !== ideal.pdx) {
      const pc = CODES[coding.pdx];
      if (!rec.S.has(coding.pdx)) notes.push('Principal ' + coding.pdx + ' is not supported by the final record' + (pc && /^R/.test(coding.pdx) ? ' (a symptom code once the diagnosis was known)' : '') + '. Correct principal: ' + ideal.pdx + '.');
      else notes.push('Wrong principal diagnosis: ' + coding.pdx + ' was documented, but ' + ideal.pdx + ' was the main reason for the stay.');
    }
    for (const u of unsupported) {
      if (u === coding.pdx) continue;
      notes.push(u + ' is not supported by the documentation.' + whyUnsupported(p, u));
    }
    for (const m of missed) {
      const c = CODES[m];
      notes.push('Missed ' + m + ' (' + (c ? c.name : m) + ').');
    }
  }
  const risk = Math.max(0, gP.value - gA.value);
  const captured = Math.min(gA.value, gI.value);
  return { status, gI, gP, gA, ideal, coding: JSON.parse(JSON.stringify(coding)), unsupported, missed, notes, pts, total, risk, captured, possible: gI.value };
}

function whyUnsupported(p, code) {
  const cl = p.clues.filter(c => c.shown);
  const mention = cl.find(c => c.text.includes('|') && parseMarkup(c.text).some(s => s.codes && s.codes.includes(code)));
  const vagueOpen = p.clues.find(c => c.vague && !c.clarified && c.vague.sup.includes(code));
  const hiddenOpen = p.clues.find(c => c.hidden && !c.shown && c.sup.includes(code));
  const dropped = p.clues.find(c => c.shown && effClue(c).drop.includes(code));
  if (vagueOpen) return ' The note was vague and never clarified: chase the documentation first.';
  if (hiddenOpen) return ' Only the doctor knew. Ask before coding it.';
  if (dropped) return ' It was replaced or excluded by a later finding.';
  if (mention) return ' It was mentioned, but not as a current, treated condition.';
  return ' Nothing in the record mentions it.';
}

function euro(v) { return '€' + Math.round(v).toLocaleString('en-US'); }
function fmtRW(rw) { return rw.toFixed(3); }

// ============================================================================
// SHIFT GENERATION
// ============================================================================
function buildShift(cfg) {
  // cfg: {ward, seed, count, window, losScale, tutorial}
  const rng = makeRng(cfg.seed);
  PID = 1;
  const ward = WARDS[cfg.ward];
  let pool = TEMPLATES.filter(t => cfg.ward === 'mix' || t.wards.includes(cfg.ward));
  const count = cfg.count;
  const used = new Set();
  const arrivals = [];
  // arrival times: spread over the window, a few already present at start
  const start = 7 / 24; // 07:00 day 0
  const present = Math.min(cfg.startPatients != null ? cfg.startPatients : 2, count);
  let order = [];
  while (order.length < count) order = order.concat(shuffle(rng, pool));
  order = order.slice(0, count);
  const times = [];
  for (let i = 0; i < count; i++) {
    if (i < present) times.push(start + i * 0.04);
    else {
      let t = start + rr(rng, 0.25, cfg.window);
      // arrivals mostly during the day
      const frac = t - Math.floor(t);
      if (frac < 0.3 || frac > 0.9) t = Math.floor(t) + rr(rng, 0.35, 0.85);
      times.push(t);
    }
  }
  times.sort((a, b) => a - b);
  for (let i = 0; i < count; i++) {
    const tpl = order[i];
    const pw = cfg.ward === 'mix' ? pick(rng, tpl.wards) : cfg.ward;
    const p = makePatient(rng, tpl, pw === 'mix' ? 'med' : pw, times[i], { usedNames: used, losScale: cfg.losScale });
    if (cfg.ward === 'mix') p.doctor = pick(rng, ward.doctors);
    arrivals.push(p);
  }
  return { arrivals, rng };
}
