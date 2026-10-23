// ============================================================================
// SCREENS: title, career hub, results, MD audit, perks, daily, help
// ============================================================================
function stars(n, max = 3) { let s = ''; for (let i = 0; i < max; i++) s += icon(i < n ? 'star' : 'starEmpty'); return `<span class="stars">${s}</span>`; }
function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dailyWard(date) { const [y, m, d] = date.split('-').map(Number); const idx = Math.floor(Date.UTC(y, m - 1, d) / 864e5); return ['med', 'surg', 'cardio', 'geri', 'icu', 'mix'][idx % 6]; }
function weekWard(w) { return WARD_ORDER[Math.min(w - 1, WARD_ORDER.length - 1)]; }
const SHIFT_COUNTS = { med: [7, 9, 11], surg: [8, 10, 11], cardio: [8, 10, 12], geri: [6, 7, 8], icu: [6, 7, 9], mix: [10, 11, 12] };
function maxUnlockedWeek() { return Math.max(1, SAVE.career ? SAVE.career.week : 1, SAVE.bestWeek || 1); }

function titleScene(wid = 'med') {
  const sc = makeScene(wid, WARDS[wid].beds);
  const rng = makeRng('title' + Math.random());
  sc.beds.forEach((b, i) => { if (i === 2) return; const tpl = TEMPLATES[i % TEMPLATES.length]; const p = makePatient(rng, tpl, 'med', 0); p.id = 500 + i; p.inBed = true; p.coding.pdx = 'J18.9'; p.dischargeT = 99; b.p = p; });
  sc.showTags = false; sc.t = 7.6 / 24 + Math.random() * 0.4;
  addNurses(sc, 2);
  return sc;
}

// ---------------------------------------------------------------- title
function showTitle() {
  G = null; AUDIT = null;
  SCENE = titleScene();
  const c = SAVE.career;
  root.innerHTML = `<div class="screen title-screen">
    <canvas id="title-cv" class="title-bg" width="${VW}" height="${VH}" aria-hidden="true"></canvas>
    <div class="title-card frame">
      <h1 class="logo">CODE BLUE<small>THE WARD ROUND</small></h1>
      <canvas class="ecg" id="ecg" width="240" height="20" aria-hidden="true"></canvas>
      <p class="muted" style="margin:0">You are the coding specialist on a busy hospital ward. Read the clues, code each case before the patient goes home, and survive the weekly MD audit.</p>
      <div class="menu">
        ${c ? `<button class="btn big" id="m-cont"><span>Continue career</span><span class="sub">Week ${c.week} · ${WARDS[weekWard(c.week)].name}${c.hard ? ' · Hard' : ''}</span></button>` : ''}
        <button class="btn ${c ? 'ghost' : 'big'}" id="m-new"><span>${c ? 'New career' : 'Start career'}</span><span class="sub" id="new-sub">${SAVE.settings.hard ? 'Hard mode · no pause, no tutorial' : 'Tutorial on your first shift'}</span></button>
        <button class="btn violet" id="m-daily"><span>Daily challenge</span><span class="sub">${todayStr()} · ${WARDS[dailyWard(todayStr())].name}</span></button>
        <button class="btn ghost" id="m-quick"><span>Quick shift</span><span class="sub">Any ward you have unlocked</span></button>
        <button class="btn ghost" id="m-help"><span>How to play & codebook</span><span class="sub">The coding rules in 2 minutes</span></button>
      </div>
      <div class="row center">
        <button class="toggle" id="t-sfx" aria-pressed="${SAVE.settings.sfx}"><span class="dot"></span>Sound</button>
        <button class="toggle" id="t-music" aria-pressed="${SAVE.settings.music}"><span class="dot"></span>Music</button>
        <button class="toggle" id="t-tips" aria-pressed="${SAVE.settings.tips}"><span class="dot"></span>Tips</button>
        <button class="toggle" id="t-hard" aria-pressed="${SAVE.settings.hard}" title="No pausing and no tips. Case points +25%."><span class="dot"></span>Hard mode</button>
      </div>
      <div class="title-foot">Codes follow ICD-10-GM and OPS; DRG names, splits and weights are simplified for play. Not a coding reference.</div>
    </div></div>`;
  const ecg = $('#ecg'); const ectx = ecg.getContext('2d'); let ex = 0; const pts = [];
  const ecgTick = () => {
    if (!document.body.contains(ecg)) return;
    ex = (ex + 1) % 240; const ph = ex % 60; let y = 12;
    if (ph === 20) y = 8; else if (ph === 24) y = 2; else if (ph === 26) y = 18; else if (ph === 28) y = 10; else if (ph > 36 && ph < 42) y = 10;
    pts[ex] = y; ectx.fillStyle = '#0c1020'; ectx.fillRect(0, 0, 240, 20);
    for (let i = 0; i < 240; i++) { if (pts[i] == null) continue; const age = (ex - i + 240) % 240; if (age > 200) continue; ectx.fillStyle = age < 3 ? '#ffffff' : `rgba(79,209,165,${1 - age / 200})`; ectx.fillRect(i, pts[i], 1, 1); if (i > 0 && pts[i - 1] != null && Math.abs(pts[i] - pts[i - 1]) > 1) { const a = Math.min(pts[i], pts[i - 1]), b = Math.max(pts[i], pts[i - 1]); ectx.fillRect(i, a, 1, b - a); } }
    setTimeout(ecgTick, 16);
  };
  ecgTick();
  const go = fn => () => { Audio8.init(); Audio8.play('click'); fn(); };
  if (c) $('#m-cont').onclick = go(showHub);
  $('#m-new').onclick = go(() => { if (SAVE.career) confirmNewCareer(); else { newCareer(); showHub(); } });
  $('#m-daily').onclick = go(showDaily);
  $('#m-quick').onclick = go(showQuick);
  $('#m-help').onclick = go(showHelp);
  const tg = (id, key, fn) => { $(id).onclick = () => { SAVE.settings[key] = !SAVE.settings[key]; persist(); $(id).setAttribute('aria-pressed', SAVE.settings[key]); fn && fn(SAVE.settings[key]); Audio8.play('click'); }; };
  tg('#t-sfx', 'sfx', v => Audio8.setSfx(v)); tg('#t-music', 'music', v => Audio8.setMusic(v)); tg('#t-tips', 'tips', v => { if (v) SAVE.tipsSeen = {}; persist(); });
  tg('#t-hard', 'hard', v => { $('#new-sub').textContent = v ? 'Hard mode · no pause, no tutorial' : 'Tutorial on your first shift'; });
}
function confirmNewCareer() {
  const ov = document.createElement('div'); ov.className = 'overlay';
  ov.innerHTML = `<div class="modal frame"><h2>Start a new career?</h2><p>Your current career (week ${SAVE.career.week}, ${SAVE.career.total.toLocaleString('en-US')} points) will be replaced.</p><div class="row"><button class="btn red" id="y">Start over</button><button class="btn ghost" id="n">Keep my career</button></div></div>`;
  document.body.appendChild(ov);
  ov.querySelector('#y').onclick = () => { ov.remove(); newCareer(); SAVE.tipsSeen = {}; persist(); showHub(); };
  ov.querySelector('#n').onclick = () => ov.remove();
}
function newCareer() {
  SAVE.career = { week: 1, shift: 0, phase: 'shifts', weekCases: [], weekScore: 0, total: 0, perks: [], history: [], quota: 3, seed: Math.random().toString(36).slice(2, 8), stars: {}, lastAudit: null, hard: !!SAVE.settings.hard };
  persist();
}

// ---------------------------------------------------------------- hub
function showHub() {
  G = null; AUDIT = null;
  const c = SAVE.career; if (!c) { showTitle(); return; }
  const wid = weekWard(c.week); const w = WARDS[wid];
  SCENE = titleScene(wid);
  const flagged = c.weekCases.filter(x => x.r.unsupported.length && x.r.risk > 0).length;
  const slots = [0, 1, 2].map(i => {
    const st = c.stars[c.week + '-' + i];
    const cur = c.phase === 'shifts' && c.shift === i;
    return `<div class="slot frame ${cur ? 'current' : ''}"><span class="eyebrow">Shift ${i + 1}</span><h3>${['Monday', 'Wednesday', 'Friday'][i]}</h3>${st != null ? stars(st.stars) + `<span class="muted num">${st.score.toLocaleString('en-US')} pts</span>` : `<span class="muted">${cur ? 'Up next · ' + SHIFT_COUNTS[wid][i] + ' patients' : 'Locked'}</span>`}</div>`;
  }).join('') + `<div class="slot frame slot-boss ${c.phase === 'audit' ? 'current' : ''}"><span class="eyebrow" style="color:var(--red)">Weekend</span><h3>MD audit</h3><span class="muted">${c.quota} cases reviewed</span><div class="risk-meter" title="Flagged cases this week">${Array.from({ length: Math.max(5, flagged) }, (_, i) => `<i class="${i < flagged ? 'on' : ''}"></i>`).join('')}</div><span class="muted" style="font-size:12px">${flagged} case${flagged === 1 ? '' : 's'} with unsupported codes</span></div>`;
  const wards = WARD_ORDER.map(id => { const W = WARDS[id]; const open = c.week >= W.week; return `<div class="ward-item ${open ? '' : 'locked'}"><i class="sw" style="background:${W.color}"></i><div><b>${W.name}</b><p>${open ? esc(W.theme) : 'Unlocks in week ' + W.week}</p></div><span class="muted">${id === wid ? 'This week' : open ? 'Open' : ''}</span></div>`; }).join('');
  const perks = c.perks.length ? c.perks.map(k => `<div class="perk"><img class="icon lg" src="${ICONS[PERKS[k].icon]}" alt=""><div><b>${PERKS[k].name}</b><span>${PERKS[k].desc}</span></div></div>`).join('') : '<p class="muted" style="margin:0">Survive your first MD audit to choose a perk.</p>';
  root.innerHTML = `<div class="screen"><div class="hub">
    <div class="hub-head"><div><div class="eyebrow">Career · Week ${c.week}${c.hard ? ' · <span style="color:var(--red)">Hard mode</span>' : ''}</div><h1>${esc(w.name)} <span class="muted" style="font-size:20px">${esc(w.station)}</span></h1><p class="muted" style="margin:4px 0 0">${esc(w.theme)}</p></div>
      <div class="big-score"><small>CAREER SCORE</small>${c.total.toLocaleString('en-US')}</div></div>
    <div class="week-track">${slots}</div>
    <div class="row">${c.phase === 'audit' ? `<button class="btn big red" id="h-go">Face the MD audit</button>` : `<button class="btn big" id="h-go">Start shift ${c.shift + 1}</button>`}<button class="btn ghost" id="h-menu">Main menu</button><span class="muted">This week: <b class="num" style="color:var(--text)">${c.weekScore.toLocaleString('en-US')}</b> pts</span></div>
    <div class="hub-grid">
      <div class="panel frame"><h2>Wards</h2><div class="ward-list">${wards}</div></div>
      <div class="panel frame"><div class="canvas-wrap hub-ward"><canvas id="title-cv" width="${VW}" height="${VH}" aria-label="${esc(w.name)} ward"></canvas></div><h2>Perks</h2><div class="perk-list">${perks}</div>${c.lastAudit ? `<p class="muted" style="margin:0;font-size:13px">Last audit: ${esc(c.lastAudit)}</p>` : ''}</div>
    </div></div></div>`;
  $('#h-menu').onclick = () => { Audio8.play('click'); showTitle(); };
  $('#h-go').onclick = () => { Audio8.play('click'); if (c.phase === 'audit') startCareerAudit(); else startCareerShift(); };
}
function startCareerShift() {
  const c = SAVE.career; const wid = weekWard(c.week);
  const extra = Math.max(0, c.week - 6);
  startShift({
    mode: 'career', ward: wid, seed: c.seed + '-w' + c.week + '-s' + c.shift, count: SHIFT_COUNTS[wid][c.shift] + extra,
    tutorial: c.week === 1 && c.shift === 0, tips: true, hard: !!c.hard, perks: c.perks, label: 'Week ' + c.week + ' · Shift ' + (c.shift + 1) + (c.hard ? ' · Hard' : ''),
    startPatients: c.week === 1 && c.shift === 0 ? 1 : 2,
  });
}

// ---------------------------------------------------------------- shift results
function summarize(results, score) {
  const n = results.length; const clean = results.filter(x => x.r.status === 'clean').length; const lost = results.filter(x => x.r.status === 'lost').length;
  const risk = results.filter(x => x.r.unsupported.length).length;
  const cap = results.reduce((a, x) => a + (x.r.status === 'lost' ? 0 : x.r.captured), 0), pos = results.reduce((a, x) => a + x.r.possible, 0);
  const acc = pos ? cap / pos : 0;
  let st = 0; if (acc >= 0.6) st = 1; if (acc >= 0.8) st = 2; if (acc >= 0.95 && !lost && !risk) st = 3;
  const billed = results.reduce((a, x) => a + (x.r.status === 'lost' ? 0 : x.r.gP.value), 0);
  return { n, clean, lost, risk, acc, stars: st, score, billed, possible: pos };
}
function showShiftResults() {
  const res = G.results.slice(); const sum = summarize(res, G.score); const mode = G.mode; const cfg = G.cfg; const wardName = G.ward.name;
  const pv = $('#pause-ov'); pv && pv.remove(); const co = $('#coach-ov'); co && co.remove();
  SCENE = null; const finishedG = G; G = null;
  let primary = '', secondary = '';
  if (mode === 'career') {
    const c = SAVE.career;
    c.weekCases.push(...res); c.weekScore += sum.score; c.total += sum.score;
    c.stars[c.week + '-' + c.shift] = { stars: sum.stars, score: sum.score };
    c.history.push({ week: c.week, ward: cfg.ward, score: sum.score, stars: sum.stars });
    c.shift++; if (c.shift >= 3) c.phase = 'audit';
    persist();
    primary = c.phase === 'audit' ? `<button class="btn big red" id="r-next">On to the MD audit</button>` : `<button class="btn big" id="r-next">Back to the week</button>`;
  } else if (mode === 'quick') {
    const best = SAVE.quick[cfg.ward] || 0; if (sum.score > best) { SAVE.quick[cfg.ward] = sum.score; persist(); }
    primary = `<button class="btn big red" id="r-audit">Face a mini audit</button><button class="btn" id="r-again">Play again</button>`;
  } else if (mode === 'daily') {
    primary = `<button class="btn big red" id="r-audit">Face the auditor to finish</button>`;
  }
  secondary = mode === 'daily' ? '' : `<button class="btn ghost" id="r-menu">Main menu</button>`;
  root.innerHTML = `<div class="screen"><div class="results">
    <div class="res-head"><div><div class="eyebrow">${esc(cfg.label || '')} · ${esc(wardName)}</div><h1>Shift complete</h1>${stars(sum.stars)}</div><div class="big-score"><small>SHIFT SCORE</small>${sum.score.toLocaleString('en-US')}</div></div>
    <div class="kpis">
      <div class="kpi frame"><b>${Math.round(sum.acc * 100)}%</b><span>Revenue captured</span></div>
      <div class="kpi frame"><b>${sum.clean}/${sum.n}</b><span>Clean cases</span></div>
      <div class="kpi frame"><b>${euro(sum.billed)}</b><span>Billed</span></div>
      <div class="kpi frame"><b style="color:${sum.risk ? 'var(--red)' : 'var(--mint)'}">${sum.risk}</b><span>Cases at audit risk</span></div>
    </div>
    <div class="row">${primary}${secondary}</div>
    <div class="panel frame"><h2>Cases</h2><p class="muted" style="margin:0;font-size:13px">Click a case to see what the record supported.</p>${caseTable(res)}</div>
  </div></div>`;
  CASE_TABLE_DATA = res; wireCaseTable();
  const nx = $('#r-next'); if (nx) nx.onclick = () => { Audio8.play('click'); if (SAVE.career.phase === 'audit') startCareerAudit(); else showHub(); };
  const mn = $('#r-menu'); if (mn) mn.onclick = () => { Audio8.play('click'); showTitle(); };
  const ag = $('#r-again'); if (ag) ag.onclick = () => { Audio8.play('click'); startQuick(cfg.ward); };
  const au = $('#r-audit'); if (au) au.onclick = () => {
    Audio8.play('click');
    startAudit({
      cases: res, n: 2, hearts: 3, title: mode === 'daily' ? 'Daily audit' : 'Mini audit', perks: cfg.perks || [],
      onDone: a => { if (mode === 'daily') finishDaily(cfg, sum, res, a); else showAuditDone(a, () => showTitle(), 'Main menu', () => startQuick(cfg.ward), 'Play again', sum.score); },
    });
  };
}
function caseTable(res) {
  return `<div class="scroll-x"><table class="case-table"><thead><tr><th>Patient</th><th>Result</th><th>You billed</th><th>Record supports</th><th style="text-align:right">Points</th></tr></thead><tbody>${res.map((x, i) => `
    <tr class="clickable" data-i="${i}"><td>${esc(x.name)}<div class="muted" style="font-size:12px">${esc(x.dxLabel)}</div></td>
    <td><span class="st ${x.r.status}">${{ clean: 'Clean', drg: 'Right DRG', under: 'Undercoded', risk: 'Audit risk', lost: 'Lost' }[x.r.status]}</span></td>
    <td class="num">${x.r.status === 'lost' ? '—' : esc(x.r.gP.drg) + ' · ' + euro(x.r.gP.value)}</td><td class="num">${esc(x.r.gI.drg)} · ${euro(x.r.gI.value)}</td><td class="num">${x.r.total >= 0 ? '+' : ''}${x.r.total}</td></tr>
    <tr class="detail-row" data-d="${i}" hidden><td colspan="5"><div id="det-${i}"></div></td></tr>`).join('')}</tbody></table></div>`;
}
let CASE_TABLE_DATA = null;
function wireCaseTable() {
  document.querySelectorAll('.case-table tr.clickable').forEach(tr => tr.onclick = () => {
    const i = tr.dataset.i; const d = document.querySelector(`[data-d="${i}"]`); d.hidden = !d.hidden;
    if (!d.hidden && !d.dataset.done) {
      d.dataset.done = 1; const x = (CASE_TABLE_DATA || [])[i];
      if (x) renderCaseResult($('#det-' + i), x.r, pseudoP(x));
    }
    Audio8.play('click');
  });
}
function pseudoP(snap) { return { clues: snap.clues.map(c => Object.assign({}, c, { shown: true, hidden: false })) }; }

// ============================================================================
// MD AUDIT (boss fight)
// ============================================================================
let AUDIT = null;
const AUD_LINES = {
  intro: ['I have selected {n} cases. Every code that changes the bill needs evidence.', 'Medical Service. I\'ve picked {n} of your cases. Let\'s see your paperwork.', 'Good morning. {n} cases. Show me the documentation and we\'ll get along fine.'],
  ask: ['Code {code}. Where does the record say that?', 'You billed {code}. Show me the document.', '{code}? I\'d like to see the evidence for that one.', 'Explain {code} to me. Which document?'],
  askPdx: ['Principal diagnosis {code}. Was that really the main reason for the stay?', 'You chose {code} as principal. Prove it.'],
  good: ['Hm. Fine. That one stands.', 'Documented. I\'ll allow it.', 'Correct. Moving on.'],
  bad: ['That document says nothing of the sort.', 'Nice try. Struck, with surcharge.', 'No evidence, no money.'],
  vague: ['"Seems confused" is not a diagnosis. Struck.', 'A vague note is not evidence. Struck.'],
  withdrawOk: ['Correction accepted.', 'Thank you for your honesty.'],
  withdrawBad: ['You\'re withdrawing a valid code? Your loss.', 'That was documented, you know. Struck as requested.'],
  timeout: ['Time\'s up. Struck.', 'I don\'t have all day. Struck.'],
};
const say = (k, vars = {}) => pick(Math.random, AUD_LINES[k]).replace(/\{(\w+)\}/g, (_, v) => vars[v]);

function pickAuditCases(cases, n) {
  const pool = cases.filter(x => x.r.status !== 'lost');
  const out = []; const w = x => (x.r.unsupported.length && x.r.risk > 0 ? 5 : 0) + (x.r.gP.error ? 3 : 0) + 1;
  const left = pool.slice();
  while (out.length < n && left.length) {
    const tot = left.reduce((a, x) => a + w(x), 0); let r = Math.random() * tot;
    let i = 0; for (; i < left.length; i++) { r -= w(left[i]); if (r <= 0) break; }
    out.push(left.splice(Math.min(i, left.length - 1), 1)[0]);
  }
  return out;
}
function buildChallenges(snap) {
  const P = pseudoP(snap); const rec = computeRecord(P); const coding = snap.r.coding; const value = group(coding).value;
  const list = [];
  const rel = alt => value - group(alt).value;
  for (const s of coding.sdx) { const r = rel(Object.assign({}, coding, { sdx: coding.sdx.filter(x => x !== s) })); if (r > 0) list.push({ code: s, role: 'sdx', sup: rec.S.has(s), rel: r }); }
  for (const s of coding.procs) { const r = rel(Object.assign({}, coding, { procs: coding.procs.filter(x => x !== s) })); if (r > 0) list.push({ code: s, role: 'proc', sup: rec.S.has(s), rel: r }); }
  if (coding.pdx !== rec.ideal.pdx || !rec.S.has(coding.pdx)) {
    const r = rel({ pdx: rec.ideal.pdx, sdx: coding.sdx.filter(x => x !== rec.ideal.pdx), procs: coding.procs });
    if (r > 0) list.push({ code: coding.pdx, role: 'pdx', sup: false, rel: r, correctPdx: rec.ideal.pdx, documented: rec.S.has(coding.pdx) });
  }
  const uns = list.filter(x => !x.sup); const sup = shuffle(Math.random, list.filter(x => x.sup));
  let chosen = uns.slice(0, 3); while (chosen.length < 3 && sup.length && (chosen.length < 1 || Math.random() < 0.6)) chosen.push(sup.shift());
  if (!chosen.length) chosen.push({ code: coding.pdx, role: 'pdx', sup: true, rel: Math.round(value * 0.3) });
  chosen.forEach(ch => { ch.docs = ch.sup ? (rec.evidence[ch.code] || []) : []; });
  return shuffle(Math.random, chosen);
}

function startAudit(opts) {
  // opts: {cases, n, hearts, title, perks, onDone}
  G = null; SCENE = null;
  const perks = new Set(opts.perks || []);
  const picked = pickAuditCases(opts.cases, opts.n);
  const rounds = [];
  picked.forEach(snap => buildChallenges(snap).forEach(ch => rounds.push(Object.assign(ch, { snap }))));
  AUDIT = { opts, perks, picked, rounds, idx: -1, hearts: opts.hearts + (perks.has('armor') ? 2 : 0), maxHearts: opts.hearts + (perks.has('armor') ? 2 : 0), delta: 0, log: [], mood: 'idle', moodUntil: 0, phase: 'intro', timer: null, defended: 0, struck: 0, surcharges: 0 };
  Audio8.play('boss');
  renderAudit();
}
function auditTimeLimit() { return 16 + (AUDIT.perks.has('binder') ? 8 : 0); }
function renderAudit() {
  const A = AUDIT; if (!A) return;
  const total = A.rounds.length; const done = A.log.length;
  const hearts = Array.from({ length: A.maxHearts }, (_, i) => icon(i < A.hearts ? 'heart' : 'heartEmpty', 'lg')).join('');
  let panel = '';
  if (A.phase === 'intro') {
    panel = `<div class="speech">${esc(say('intro', { n: A.picked.length }))}</div>
      <p class="muted" style="margin:0">For each challenged code, pick the document that proves it, or withdraw the code. Wrong evidence costs a heart and adds a surcharge on unsupported codes. Lose all hearts and the rest of the audit goes against you.</p>
      <div class="cmp">${A.picked.map(s => `<div><h4>${esc(s.name)}</h4><b>${esc(s.r.gP.drg)} · ${euro(s.r.gP.value)}</b><span class="muted">${esc(s.dxLabel)}</span></div>`).join('')}</div>
      <div class="row"><button class="btn big red" id="a-start">Bring it on</button></div>`;
  } else if (A.phase === 'challenge' || A.phase === 'verdict') {
    const ch = A.rounds[A.idx]; const s = ch.snap; const c = CODES[ch.code];
    const P = pseudoP(s); const docs = shownClues(P);
    const v = A.phase === 'verdict' ? A.log[A.log.length - 1] : null;
    panel = `<div class="ch-head"><div><div class="eyebrow">Challenge ${A.idx + 1} of ${total}</div><h2>${esc(s.name)} <span class="muted" style="font-size:15px">· billed ${esc(s.r.gP.drg)} ${euro(s.r.gP.value)}</span></h2></div><span class="tag">At stake ${euro(ch.rel)}</span></div>
      <div class="speech">${esc(say(ch.role === 'pdx' ? 'askPdx' : 'ask', { code: ch.code }))}<br><span style="font-size:14px;color:#5a4a6a"><b>${esc(ch.code)}</b> ${esc(c ? c.name : '')} · ${ch.role === 'pdx' ? 'principal' : ch.role === 'sdx' ? 'secondary' : 'procedure'}</span></div>
      ${A.phase === 'challenge' ? `<div class="timer"><i id="a-timer" style="width:100%"></i></div>` : `<div class="verdict ${v.cls}">${esc(v.line)}<div style="font-size:14px;margin-top:4px">${esc(v.detail)}</div><div class="num" style="font-size:16px;margin-top:4px">${v.pts >= 0 ? '+' : ''}${v.pts} pts</div></div>`}
      <div class="evidence">${docs.map(d => { const e = effClue(d); const vg = d.vague && !d.clarified; const cls = v ? (v.docId === d.id ? (v.right ? 'right' : 'wrong') : (ch.docs.includes(d.id) ? 'right' : '')) : ''; return `<button class="ev ${vg ? 'vague' : ''} ${cls}" data-doc="${d.id}" ${v ? 'disabled' : ''}><span class="dh"><span class="stamp ${d.src}">${esc(d.by ? DOCTORS[d.by].name.toUpperCase() : SRC_LABEL[d.src].toUpperCase())}</span>${vg ? '<span>vague</span>' : ''}</span>${esc(stripMarkup(e.text))}</button>`; }).join('')}</div>
      <div class="row">${A.phase === 'challenge' ? `<button class="btn amber" id="a-withdraw">Withdraw ${esc(ch.code)}</button>` : `<button class="btn big" id="a-next">${A.idx + 1 < total ? 'Next challenge' : 'Finish audit'}</button>`}</div>`;
  }
  root.innerHTML = `<div class="screen"><div class="audit">
    <div class="hub-head"><div><div class="eyebrow" style="color:var(--red)">${esc(A.opts.title || 'MD audit')}</div><h1>The Medical Service is here</h1></div><div class="big-score"><small>AUDIT RESULT</small><span style="color:${A.delta >= 0 ? 'var(--mint)' : 'var(--red)'}">${A.delta >= 0 ? '+' : ''}${A.delta}</span></div></div>
    <div class="arena">
      <div class="boss frame"><canvas id="boss-cv" width="192" height="240"></canvas><h3>Dr. Gisela Strenge</h3><span class="muted" style="font-size:13px">MD reviewer · never smiles</span><div class="hp" title="Challenges left"><i style="width:${total ? (1 - done / total) * 100 : 0}%"></i></div><div class="hearts" title="Your credibility">${hearts}</div></div>
      <div class="challenge frame panel">${panel}</div>
    </div></div></div>`;
  const st = $('#a-start'); if (st) st.onclick = () => { Audio8.play('click'); nextChallenge(); };
  const wd = $('#a-withdraw'); if (wd) wd.onclick = () => resolveChallenge(null, true);
  const nx = $('#a-next'); if (nx) nx.onclick = () => { Audio8.play('click'); nextChallenge(); };
  document.querySelectorAll('.ev[data-doc]').forEach(b => b.onclick = () => resolveChallenge(+b.dataset.doc, false));
  if (A.phase === 'challenge') {
    const lim = auditTimeLimit() * 1000; const t0 = performance.now(); const myIdx = A.idx;
    const tick = () => {
      if (!AUDIT || AUDIT.idx !== myIdx || AUDIT.phase !== 'challenge') return;
      const f = 1 - (performance.now() - t0) / lim; const bar = $('#a-timer'); if (bar) { bar.style.width = Math.max(0, f * 100) + '%'; bar.style.background = f < 0.3 ? 'var(--red)' : 'var(--amber)'; }
      if (f <= 0) { resolveChallenge(null, false, true); return; }
      if (f < 0.3 && Math.floor(f * 100) % 5 === 0) Audio8.play('tick');
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
function bossTick() {
  const cv = document.getElementById('boss-cv'); if (!cv || !AUDIT) return;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const t = performance.now() / 1000;
  ctx.fillStyle = '#241630'; ctx.fillRect(0, 0, cv.width, cv.height);
  // spotlight floor
  ctx.fillStyle = '#2e1c3c'; ctx.fillRect(16, 200, 160, 40); ctx.fillStyle = '#3a2448'; ctx.fillRect(40, 210, 112, 30);
  const bob = Math.round(Math.sin(t * 2) * 2);
  drawAuditor(ctx, 0, 0 + bob, 6, t, AUDIT.mood);
}
function nextChallenge() {
  const A = AUDIT; A.idx++;
  if (A.idx >= A.rounds.length || (A.hearts <= 0)) { finishAudit(); return; }
  A.phase = 'challenge'; A.mood = 'angry'; renderAudit();
}
function resolveChallenge(docId, withdraw, timeout) {
  const A = AUDIT; if (!A || A.phase !== 'challenge') return;
  const ch = A.rounds[A.idx];
  const loss = Math.round(ch.rel / 10); const sur = Math.max(30, Math.round(loss * 0.5));
  let v;
  const right = docId != null && ch.sup && ch.docs.includes(docId);
  const doc = docId != null ? ch.snap.clues.find(c => c.id === docId) : null;
  const vagueDoc = doc && doc.vague && !doc.clarified;
  if (withdraw) {
    if (ch.sup) v = { cls: 'meh', line: say('withdrawBad'), detail: `${ch.code} was documented. You gave up ${euro(ch.rel)}.`, pts: -loss };
    else v = { cls: 'meh', line: say('withdrawOk'), detail: `${ch.code} is struck. You pay back ${euro(ch.rel)}, no surcharge.`, pts: -loss };
    A.struck++;
  } else if (right) {
    v = { cls: 'good', line: say('good'), detail: `${ch.code} stands. The document proves it.`, pts: 40, right: true }; A.defended++;
  } else {
    A.hearts--; A.struck++;
    const why = timeout ? 'You ran out of time.' : vagueDoc ? 'A vague note is not evidence until it is clarified.' : ch.role === 'pdx' && ch.documented ? `${ch.code} was documented, but ${ch.correctPdx} was the main reason for the stay.` : ch.sup ? 'Wrong document: the evidence was elsewhere in the record.' : `Nothing in the record supports ${ch.code}.`;
    if (ch.sup) v = { cls: 'bad', line: timeout ? say('timeout') : 'That document does not prove it. Struck.', detail: why + ` You lose ${euro(ch.rel)}.`, pts: -loss };
    else { v = { cls: 'bad', line: timeout ? say('timeout') : vagueDoc ? say('vague') : say('bad'), detail: why + ` Clawback ${euro(ch.rel)} plus surcharge.`, pts: -loss - sur }; A.surcharges++; }
  }
  v.docId = docId; A.delta += v.pts; A.log.push(Object.assign({ code: ch.code, name: ch.snap.name }, v));
  A.mood = v.cls === 'good' ? 'hit' : v.cls === 'bad' ? 'win' : 'idle';
  Audio8.play(v.cls === 'good' ? 'hit' : v.cls === 'bad' ? 'hurt' : 'click');
  A.phase = 'verdict'; renderAudit();
  if (A.hearts <= 0) {
    // the rest goes against you
    for (let i = A.idx + 1; i < A.rounds.length; i++) { const r = A.rounds[i]; const l = Math.round(r.rel / 10); const p = -l - (r.sup ? 0 : Math.max(30, Math.round(l * 0.5))); A.delta += p; A.log.push({ code: r.code, name: r.snap.name, cls: 'bad', line: 'Decided against you', detail: '', pts: p }); A.struck++; }
    A.idx = A.rounds.length - 1;
  }
}
function finishAudit() {
  const A = AUDIT; A.phase = 'done';
  const flawless = A.hearts === A.maxHearts && A.log.length > 0;
  if (flawless) A.delta += 100;
  const res = { delta: A.delta, defended: A.defended, struck: A.struck, surcharges: A.surcharges, hearts: A.hearts, maxHearts: A.maxHearts, flawless, failed: A.hearts <= 0, rounds: A.log.length, log: A.log };
  Audio8.play(res.failed ? 'bad' : 'fanfare');
  A.opts.onDone(res);
}
function showAuditDone(a, onPrimary, primaryLabel, onSecondary, secondaryLabel, baseScore) {
  AUDIT = null;
  const verdict = a.failed ? 'Audit lost' : a.flawless ? 'Flawless defence!' : 'Audit survived';
  root.innerHTML = `<div class="screen"><div class="audit">
    <div class="res-head"><div><div class="eyebrow" style="color:var(--red)">MD audit</div><h1>${verdict}</h1><p class="muted" style="margin:4px 0 0">${a.defended} defended · ${a.struck} struck · ${a.surcharges} surcharge${a.surcharges === 1 ? '' : 's'}${a.flawless ? ' · +100 flawless bonus' : ''}</p></div><div class="big-score"><small>AUDIT RESULT</small><span style="color:${a.delta >= 0 ? 'var(--mint)' : 'var(--red)'}">${a.delta >= 0 ? '+' : ''}${a.delta}</span>${baseScore != null ? `<small>FINAL ${(baseScore + a.delta).toLocaleString('en-US')}</small>` : ''}</div></div>
    <div class="panel frame"><h2>Challenges</h2><div class="scroll-x"><table class="case-table"><tbody>${a.log.map(l => `<tr><td>${esc(l.name)}</td><td class="mono">${esc(l.code)}</td><td>${esc(l.line)}<div class="muted" style="font-size:12px">${esc(l.detail || '')}</div></td><td class="num" style="color:${l.pts >= 0 ? 'var(--mint)' : 'var(--red)'}">${l.pts >= 0 ? '+' : ''}${l.pts}</td></tr>`).join('') || '<tr><td>No codes were challenged.</td></tr>'}</tbody></table></div></div>
    <div class="row"><button class="btn big" id="ad-1">${primaryLabel}</button>${onSecondary ? `<button class="btn ghost" id="ad-2">${secondaryLabel}</button>` : ''}</div>
  </div></div>`;
  $('#ad-1').onclick = () => { Audio8.play('click'); onPrimary(); };
  if (onSecondary) $('#ad-2').onclick = () => { Audio8.play('click'); onSecondary(); };
}

function startCareerAudit() {
  const c = SAVE.career;
  startAudit({
    cases: c.weekCases, n: c.quota, hearts: 3, title: 'MD audit · Week ' + c.week, perks: c.perks,
    onDone: a => {
      c.weekScore += a.delta; c.total += a.delta;
      const oldQ = c.quota;
      if (a.surcharges >= 2 || a.failed) c.quota = Math.min(6, c.quota + 1); else if (a.flawless) c.quota = Math.max(3, c.quota - 1);
      c.lastAudit = `week ${c.week}: ${a.delta >= 0 ? '+' : ''}${a.delta} pts, ${a.defended} defended, ${a.struck} struck.` + (c.quota !== oldQ ? ` Audit quota now ${c.quota} cases.` : '');
      c.history.push({ week: c.week, audit: a.delta });
      persist();
      const qNote = c.quota > oldQ ? `Too many unsupported codes: next week the MD reviews ${c.quota} cases.` : c.quota < oldQ ? `Clean record: next week only ${c.quota} cases get reviewed.` : '';
      showAuditDone(a, () => showPerkPick(qNote), 'Choose a perk', null, null, null);
    },
  });
}
function showPerkPick(note) {
  const c = SAVE.career;
  const avail = shuffle(Math.random, Object.keys(PERKS).filter(k => !c.perks.includes(k))).slice(0, 3);
  const advance = () => { c.week++; c.shift = 0; c.phase = 'shifts'; c.weekCases = []; c.weekScore = 0; SAVE.bestWeek = Math.max(SAVE.bestWeek || 1, c.week); persist(); showHub(); };
  if (!avail.length) { advance(); return; }
  root.innerHTML = `<div class="screen"><div class="hub">
    <div><div class="eyebrow">Week ${c.week} complete</div><h1>Pick a perk</h1>${note ? `<p class="muted">${esc(note)}</p>` : ''}<p class="muted" style="margin:4px 0 0">Next week: <b style="color:var(--text)">${WARDS[weekWard(c.week + 1)].name}</b>${c.week + 1 <= 5 ? ' (new ward unlocked!)' : ''}</p></div>
    <div class="perk-pick">${avail.map(k => `<button class="btn" data-perk="${k}"><img class="icon lg" src="${ICONS[PERKS[k].icon]}" alt=""><b>${PERKS[k].name}</b><span>${PERKS[k].desc}</span></button>`).join('')}</div>
  </div></div>`;
  document.querySelectorAll('[data-perk]').forEach(b => b.onclick = () => { c.perks.push(b.dataset.perk); Audio8.play('good'); advance(); });
}

// ---------------------------------------------------------------- quick play
function hardToggleHTML() { return `<button class="toggle" id="t-hard" aria-pressed="${SAVE.settings.hard}" title="No pausing and no tips. Case points +25%."><span class="dot"></span>Hard mode</button>`; }
function wireHardToggle() {
  const b = $('#t-hard'); if (!b) return;
  b.onclick = () => { SAVE.settings.hard = !SAVE.settings.hard; persist(); b.setAttribute('aria-pressed', SAVE.settings.hard); Audio8.play('click'); };
}
function showQuick() {
  const mw = maxUnlockedWeek();
  root.innerHTML = `<div class="screen"><div class="hub">
    <div class="hub-head"><div><div class="eyebrow">Quick shift</div><h1>Pick a ward</h1><p class="muted" style="margin:4px 0 0">One shift and an optional mini audit. Wards unlock as your career progresses.</p></div><div class="row">${hardToggleHTML()}<button class="btn ghost" id="q-back">Back</button></div></div>
    <div class="ward-list">${WARD_ORDER.map(id => { const W = WARDS[id]; const open = mw >= W.week; return `<div class="ward-item ${open ? '' : 'locked'}"><i class="sw" style="background:${W.color}"></i><div><b>${W.name}</b><p>${open ? esc(W.theme) : 'Reach week ' + W.week + ' in your career'}</p></div>${open ? `<button class="btn small" data-w="${id}">Play${SAVE.quick[id] ? ' · best ' + SAVE.quick[id].toLocaleString('en-US') : ''}</button>` : ''}</div>`; }).join('')}</div>
  </div></div>`;
  $('#q-back').onclick = () => showTitle();
  wireHardToggle();
  document.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { Audio8.play('click'); startQuick(b.dataset.w); });
}
function startQuick(wid) {
  startShift({ mode: 'quick', ward: wid, seed: 'quick-' + Math.random().toString(36).slice(2), count: SHIFT_COUNTS[wid][1], tips: true, hard: !!SAVE.settings.hard, perks: [], label: 'Quick shift' + (SAVE.settings.hard ? ' · Hard' : '') });
}

// ---------------------------------------------------------------- daily
function shareCode(o) { const raw = JSON.stringify(o); const b = btoa(unescape(encodeURIComponent(raw))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); const chk = (xmur3(raw + 'cb')() % 1679616).toString(36); return 'CB1.' + b + '.' + chk; }
function parseShare(text) {
  const out = []; const re = /CB1\.([A-Za-z0-9_-]+)\.([a-z0-9]+)/g; let m;
  while ((m = re.exec(text))) {
    try { const raw = decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/')))); if ((xmur3(raw + 'cb')() % 1679616).toString(36) !== m[2]) continue; const o = JSON.parse(raw); if (o && o.d && typeof o.s === 'number') out.push(o); } catch (e) { }
  }
  return out;
}
const SQ = { clean: '🟩', drg: '🟦', under: '🟨', risk: '🟥', lost: '⬛' };
function showDaily() {
  const date = todayStr(); const wid = dailyWard(date); const mine = SAVE.daily[date];
  root.innerHTML = `<div class="screen"><div class="daily">
    <div class="hub-head"><div><div class="eyebrow" style="color:var(--violet)">Daily challenge · ${date}</div><h1>${WARDS[wid].name}</h1><p class="muted" style="margin:4px 0 0">Same patients, same clues, same timing for everyone today. One shift plus a 2-case audit. No perks.</p></div><div class="row">${hardToggleHTML()}<button class="btn ghost" id="d-back">Back</button></div></div>
    <div class="panel frame"><h2>Your name on the board</h2><div class="row"><input class="name" id="d-name" maxlength="16" placeholder="Nickname" value="${esc(SAVE.settings.name || '')}" aria-label="Nickname"><button class="btn big violet" id="d-go">${mine ? 'Play again' : 'Start today\'s shift'}</button></div>${mine ? `<p class="muted" style="margin:0">Your best today: <b style="color:var(--text)">${mine.s.toLocaleString('en-US')}</b>. Replays count if you beat it.</p>` : ''}</div>
    ${leaderboardHTML(date)}
  </div></div>`;
  $('#d-back').onclick = () => showTitle();
  wireHardToggle();
  $('#d-go').onclick = () => {
    SAVE.settings.name = ($('#d-name').value || '').trim().slice(0, 16); persist(); Audio8.play('click');
    startShift({ mode: 'daily', ward: wid, seed: 'daily-' + date, count: wid === 'geri' || wid === 'icu' ? 8 : 10, tips: true, hard: !!SAVE.settings.hard, perks: [], label: 'Daily ' + date + (SAVE.settings.hard ? ' · Hard' : ''), date });
  };
  wireLeaderboard(date);
}
function leaderboardHTML(date) {
  const me = SAVE.daily[date]; const rows = [];
  if (me) rows.push(Object.assign({ me: true }, me));
  for (const f of SAVE.friends) if (f.d === date) rows.push(f);
  rows.sort((a, b) => b.s - a.s);
  return `<div class="panel frame"><h2>Friends leaderboard · ${date}</h2>
    <p class="muted" style="margin:0;font-size:13px">No accounts, no server: friends paste their result text (with the CB1 code) here and their score appears on your board.</p>
    ${rows.length ? `<table class="lb"><tbody>${rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td class="num">${i + 1}</td><td>${esc(r.n || 'Anonymous')}${r.me ? ' (you)' : ''}${r.h ? ' <span class="tag hard-tag">Hard</span>' : ''}</td><td>${esc(r.q || '')}</td><td>${'★'.repeat(r.st || 0)}${'☆'.repeat(3 - (r.st || 0))}</td><td class="num">${r.s.toLocaleString('en-US')}</td></tr>`).join('')}</tbody></table>` : '<p class="muted" style="margin:0">No scores yet today.</p>'}
    <textarea class="paste" id="lb-paste" placeholder="Paste a friend's result here" aria-label="Paste a friend's result"></textarea>
    <div class="row"><button class="btn small" id="lb-add">Add to board</button><span class="muted" id="lb-msg" style="font-size:13px"></span></div></div>`;
}
function wireLeaderboard(date) {
  const b = $('#lb-add'); if (!b) return;
  b.onclick = () => {
    const found = parseShare($('#lb-paste').value);
    if (!found.length) { $('#lb-msg').textContent = 'No valid result code found. It starts with CB1.'; Audio8.play('error'); return; }
    let added = 0; const me = SAVE.daily[date]; for (const f of found) { if (me && f.d === me.d && f.n === me.n && f.s === me.s) continue; const i = SAVE.friends.findIndex(x => x.d === f.d && x.n === f.n); if (i >= 0) { if (f.s > SAVE.friends[i].s) SAVE.friends[i] = f; } else { SAVE.friends.push(f); added++; } }
    SAVE.friends = SAVE.friends.slice(-200); persist(); Audio8.play('good');
    const other = found.filter(f => f.d !== date).length;
    showDaily(); setTimeout(() => { const m = $('#lb-msg'); if (m) m.textContent = `Added ${found.length} result${found.length === 1 ? '' : 's'}${other ? ` (${other} from another day)` : ''}.`; }, 0);
  };
}
function finishDaily(cfg, sum, res, a) {
  AUDIT = null;
  const date = cfg.date; const final = sum.score + a.delta;
  const squares = res.map(x => SQ[x.r.status]).join('');
  const entry = { d: date, n: SAVE.settings.name || 'Anonymous', s: final, st: sum.stars, q: squares, w: cfg.ward, h: cfg.hard ? 1 : 0 };
  const prev = SAVE.daily[date]; if (!prev || final > prev.s) SAVE.daily[date] = entry; persist();
  const code = shareCode(entry);
  const text = `CODE BLUE · Daily ${date} (${WARDS[cfg.ward].name})${cfg.hard ? ' · HARD MODE' : ''}\n${entry.n}: ${final.toLocaleString('en-US')} pts ${'★'.repeat(sum.stars)}${'☆'.repeat(3 - sum.stars)}\n${squares}\nAudit: ${a.defended}/${a.rounds} defended${a.flawless ? ' · flawless' : ''}\n${code}`;
  CASE_TABLE_DATA = res;
  root.innerHTML = `<div class="screen"><div class="daily">
    <div class="res-head"><div><div class="eyebrow" style="color:var(--violet)">Daily challenge · ${date}</div><h1>${a.failed ? 'The auditor won today' : 'Shift and audit done'}</h1>${stars(sum.stars)}</div><div class="big-score"><small>FINAL SCORE</small>${final.toLocaleString('en-US')}<small>shift ${sum.score.toLocaleString('en-US')} · audit ${a.delta >= 0 ? '+' : ''}${a.delta}</small></div></div>
    <div class="panel frame"><h2>Share your result</h2><div class="share" id="share-text">${esc(text)}</div><div class="row"><button class="btn violet" id="d-copy">Copy result</button><span class="muted" id="copy-msg" style="font-size:13px"></span></div></div>
    ${leaderboardHTML(date)}
    <div class="panel frame"><h2>Cases</h2>${caseTable(res)}</div>
    <div class="row"><button class="btn" id="d-menu">Main menu</button></div>
  </div></div>`;
  wireCaseTable(); wireLeaderboard(date);
  $('#d-menu').onclick = () => showTitle();
  $('#d-copy').onclick = () => {
    const done = ok => { $('#copy-msg').textContent = ok ? 'Copied. Paste it in your group chat.' : 'Select the text above and copy it.'; };
    try { navigator.clipboard.writeText(text).then(() => done(true), () => { selectText($('#share-text')); done(false); }); } catch (e) { selectText($('#share-text')); done(false); }
  };
}
function selectText(el) { try { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) { } }

// ---------------------------------------------------------------- help
const LESSONS = [
  ['Principal diagnosis', 'The condition that, <b>after study</b>, was chiefly responsible for the admission. It picks the base DRG. A symptom (chest pain, fainting) is only principal until the cause is found. Then the cause replaces it.'],
  ['Secondary diagnoses', 'Only code a condition if it caused <b>extra effort</b>: treatment, diagnostics or nursing. A lab value on its own, a healed illness from years ago or a suspicion that was ruled out does not count.'],
  ['CCL and PCCL', 'Every secondary diagnosis has a complication level, <b>CCL 0–4</b>. The grouper combines them into the patient\'s overall severity, <b>PCCL 0–6</b>, with diminishing returns. PCCL picks the DRG split: A is the most severe and best paid.'],
  ['Procedures', 'OPS procedure codes can move a case into a surgical or invasive DRG (appendectomy, stent, pacemaker). Ventilation of 96 hours or more jumps to the very expensive pre-MDC DRG A13, so count the hours. An operation that does not fit the principal diagnosis lands in error DRG 901.'],
  ['Documentation is king', 'If it isn\'t written down, it didn\'t happen. <b>Vague notes</b> ("seems confused") must be clarified first: chase the documentation. <b>Lab values</b> need a doctor\'s word that they were treated: ask the doctor. Both cost energy, and coffee refills it while the clock keeps running.'],
  ['Code early or wait?', 'You can change the coding until discharge. Code early so nothing is lost, but watch for new documents: a culture, a pathology report or a complication can change the DRG. When a patient leaves, the case locks.'],
  ['The MD audit', 'At the end of every week the Medical Service (MD) reviews some of your cases. For every challenged code you must show the document that proves it. Unsupported codes are clawed back with a surcharge, and the more you get caught, the more cases they review next week.'],
];
function helpHTML() {
  return `<div class="panel frame"><h2>The coding rules</h2>${LESSONS.map((l, i) => `<div class="lesson"><span class="n">${i + 1}</span><div><b>${l[0]}</b><p>${l[1]}</p></div></div>`).join('')}</div>
    <div class="panel frame"><h2>Controls</h2><p>Click a <b>bed</b> or patient card to open the chart. Click <b>yellow terms</b> in documents to find matching codes. <b>Drag</b> a card into a slot, or use its buttons. Drag a placed card out of its slot (or press ×) to remove it. Keys: <span class="kbd">Space</span> pause, <span class="kbd">1</span>–<span class="kbd">7</span> select bed, <span class="kbd">A</span> ask doctor, <span class="kbd">C</span> coffee.</p><p>While paused you can read every chart and browse the code finder, but you cannot code, ask, chase or drink coffee until the clock runs again. <b>Hard mode</b> has no pause and no tips, and pays 25% more points per case.</p></div>
    <div class="panel frame"><h2>Scoring</h2><p>Billed case value ÷ 10 in points. <b>+150</b> for a clean case (exactly what the record supports), <b>+60</b> for the right DRG, <b>+40</b> for every DRG-relevant secondary diagnosis you catch, and a combo bonus for clean streaks. A patient who leaves without a principal diagnosis costs <b>−150</b>. Unsupported codes pay now and cost later.</p></div>`;
}
function codebookHTML() {
  const rows = Object.values(CODES).map(c => `<tr><td>${esc(c.code)}</td><td>${esc(c.name)}<div class="muted">${esc(c.note || '')}</div></td><td class="k">${c.kind === 'dx' ? (c.sec ? 'secondary only' : 'dx → ' + c.drg) : c.kind === 'vent' ? 'ventilation' : 'procedure'}</td><td class="k">${c.kind === 'dx' ? 'CCL ' + c.ccl : ''}</td></tr>`).join('');
  const drgs = Object.values(DRGS).filter(d => d.splits[0][1] > 0).map(d => `<tr><td>${esc(d.base)}</td><td>${esc(d.name)}<div class="muted">${d.splits.map(s => d.base + s[0] + ' RW ' + s[1].toFixed(2) + ' (' + s[3] + ')').join(' · ')}</div></td></tr>`).join('');
  return `<details class="panel frame"><summary style="cursor:pointer"><b>Codebook</b> <span class="muted">· ${Object.keys(CODES).length} codes</span></summary><div class="scroll-x"><table class="codebook"><tbody>${rows}</tbody></table></div></details>
    <details class="panel frame"><summary style="cursor:pointer"><b>DRG catalogue</b> <span class="muted">· base rate ${euro(BASE_RATE)} per relative weight</span></summary><div class="scroll-x"><table class="codebook"><tbody>${drgs}</tbody></table></div></details>`;
}
function showHelp() {
  root.innerHTML = `<div class="screen"><div class="help"><div class="hub-head"><div><div class="eyebrow">How to play</div><h1>Concurrent coding in two minutes</h1></div><button class="btn ghost" id="hp-back">Back</button></div>${helpHTML()}${codebookHTML()}</div></div>`;
  $('#hp-back').onclick = () => showTitle();
}
function showHelpModal() {
  const ov = document.createElement('div'); ov.className = 'overlay'; ov.style.zIndex = 70;
  ov.innerHTML = `<div class="modal frame" style="width:min(760px,100%)"><div class="row" style="justify-content:space-between"><h2>How to play</h2><button class="btn ghost small" id="hm-x">Close</button></div>${helpHTML()}</div>`;
  document.body.appendChild(ov); ov.querySelector('#hm-x').onclick = () => ov.remove();
}

// ---------------------------------------------------------------- boot
function boot() {
  buildIcons();
  Audio8.setSfx(SAVE.settings.sfx);
  if (SAVE.settings.music) { const once = () => { Audio8.setMusic(true); document.removeEventListener('pointerdown', once); }; document.addEventListener('pointerdown', once); }
  showTitle();
  requestAnimationFrame(frame);
}
