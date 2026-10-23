// ============================================================================
// TUTORIAL: a scripted two-patient shift. Nurse Bea spotlights one part of the
// screen at a time and waits for the player to do each thing. The clock only
// runs when a step needs time to pass.
// ============================================================================
const TUT_TPL = {
  schulz: {
    id: 'tut1', dx: 'Pneumonia', age: [78, 78], los: [3, 3], flags: {},
    clues: [
      { f: 0, src: 'ADM', text: 'Fever and cough for 3 days. Chest X-ray shows an infiltrate in the right lung: {pneumonia|J18.9,J15.9,J13}. Antibiotics started.', sup: ['J18.9'], pdx: 'J18.9' },
      { f: 1, script: 'sodium', src: 'NURSE', text: 'Sodium 126 mmol/l. Doctor ordered fluid restriction and sodium checks twice a day: {hyponatraemia|E87.1,E86}.', sup: ['E87.1'] },
      { f: 1, script: 'potassium', src: 'LAB', text: 'Potassium 3.0 mmol/l (low).', hint: true },
      { f: 0, hidden: true, src: 'DOC', text: '"The potassium? Yes, we gave him IV potassium for two days. That\'s a treated {hypokalaemia|E87.6}."', sup: ['E87.6'] },
    ],
  },
  kowalski: {
    id: 'tut2', dx: 'Urinary tract infection', age: [86, 86], los: [3, 3], flags: {},
    clues: [
      { f: 0, src: 'ADM', text: 'Fever and burning when passing urine. Urine test positive: {urinary tract infection|N39.0,N30.0,N10}. Antibiotics started.', sup: ['N39.0'], pdx: 'N39.0' },
      { f: 1, script: 'vague', src: 'NURSE', text: 'She seems a bit confused at night.', vague: { text: 'Physician addendum: {delirium|F05.0,F05.1,R41.0}, no known dementia. Low-dose haloperidol at night.', sup: ['F05.0'] } },
      { f: 1, script: 'kidney', src: 'RAD', text: 'Kidney ultrasound: swollen right kidney. The infection has reached the kidney: {acute pyelonephritis|N10,N39.0}.', pdx: 'N10', drop: ['N39.0'] },
    ],
  },
};

function tutPatient(key, name, sex, look) {
  const p = makePatient(makeRng('tut-' + key), TUT_TPL[key], 'med', Infinity);
  p.clues = p.clues.filter(c => !c.decoy);
  TUT_TPL[key].clues.forEach((src, i) => { if (src.script) { p.clues[i].script = src.script; p.clues[i].f = 1; } });
  Object.assign(p, { name, sex, doctor: 'okafor', dischargeT: 99, los: 3, tutKeep: true, look: Object.assign(p.look, look) });
  return p;
}

function startTutorial() {
  PID = 1;
  const p1 = tutPatient('schulz', 'Werner Schulz', 'M', { hair: '#d8d4cc', skin: '#f2c9a0', blanket: '#7fb8d8', bald: true });
  const p2 = tutPatient('kowalski', 'Agnes Kowalski', 'F', { hair: '#e8e4dc', skin: '#e8b48a', blanket: '#d8a8c8', bald: false });
  p1.age = 78; p2.age = 86;
  startShift({ mode: 'tutorial', ward: 'med', seed: 'tutorial', arrivals: [p1, p2], tips: false, hard: false, perks: [], label: 'Tutorial' });
  G.tut = { i: -1, hold: true, p1, p2, shownAt: 0 };
  const spot = document.createElement('div'); spot.id = 'tut-spot'; spot.className = 'tut-spot'; spot.hidden = true;
  const bub = document.createElement('div'); bub.id = 'tut-bubble'; bub.className = 'tut-bubble frame'; bub.setAttribute('role', 'dialog'); bub.setAttribute('aria-live', 'polite');
  document.body.appendChild(spot); document.body.appendChild(bub);
  tutGo(0);
}

// ---- helpers used by the steps
const tp1 = () => G.tut.p1, tp2 = () => G.tut.p2;
function tutClue(p, script) { return p.clues.find(c => c.script === script); }
function tutReveal(p, script) {
  const c = tutClue(p, script); if (!c || c.shown) return;
  c.shown = true; c.revealT = G.t; c.fresh = true; p.newClues++;
  Audio8.play('clue'); logEvent(`New ${SRC_LABEL[c.src].toLowerCase()} for <b>${esc(p.name)}</b>`);
  if (G.sel === p.id) { p.newClues = 0; renderDocs(); renderTray(); }
  boardDirty();
}
function tutArrive(p) { p.arriveT = G.t; p.dischargeT = G.t + 2.6; G.queue.sort((a, b) => a.arriveT - b.arriveT); }
const hasSdx = (p, c) => p.coding.sdx.includes(c);
const docsTarget = () => $('#c-docs .doc') ? $('.chart-docs') : null;

// ---- the script. target: selector or function; wait: condition to advance;
// run: the clock runs during this step; nudge: shown while waiting if it returns text.
const TUT_STEPS = [
  { title: 'Welcome to Ward 3B!', text: 'I\'m <em>Nurse Bea</em>. Let\'s walk through a calm practice shift with two patients. The clock is <em>stopped</em> while I explain, so take your time.' },
  { target: '.canvas-wrap', title: 'Your ward', text: 'This is the ward. Patients are wheeled in through the <em>door on the left</em> and get a bed. Here comes your first patient now.', enter: () => tutArrive(tp1()), run: true, minReal: 2.5 },
  { target: '#board', title: 'Patient cards', text: 'Every patient also gets a card down here: bed, name, days until discharge, and whether the case is coded. <em>Click Mr. Schulz\'s card</em> (or his bed) to open his chart.', wait: () => G.sel === tp1().id },
  { target: '.chart-head', title: 'The chart', text: 'This is his chart. The bar shows how long until he goes home. When a patient leaves, the case <em>locks and is scored</em>, so always code before discharge.' },
  { target: () => docsTarget(), title: 'Documents', text: 'Documents land here, newest on top. <em>Yellow words</em> are codable terms. <em>Click “pneumonia”</em> in the admission note.', wait: () => G.filter && G.filter.codes.includes('J18.9') },
  { target: '#c-tray', title: 'Picking a code card', text: 'The code finder shows every card that could match. Read carefully: <em>J15.9</em> needs proof the pneumonia is bacterial, <em>J13</em> needs a culture naming the germ. The note says neither, so the plain one fits. Click a card to read its note, then put <em>J18.9</em> into <em>Principal diagnosis</em>: drag it there or press its <em>Principal</em> button.',
    wait: () => tp1().coding.pdx === 'J18.9', nudge: () => tp1().coding.pdx && tp1().coding.pdx !== 'J18.9' ? `${tp1().coding.pdx} isn't supported by the note. Remove it with × and use J18.9.` : '' },
  { target: '.drgbox', title: 'The grouper', text: () => { const g = group(tp1().coding); return `Your codes just became a <em>DRG</em>: ${g.drg}, ${esc(g.name.toLowerCase())}. The DRG sets the payment: relative weight × base rate = <em>${euro(g.value)}</em>. The purple <em>PCCL</em> bar is severity; secondary diagnoses can raise it.`; } },
  { target: '#hud-clock', title: 'Time is running', text: 'Now I\'ll start the clock. One day on the ward takes 30 seconds. New documents arrive as the days pass, so keep an eye out for the yellow <em>!</em> above a bed.' },
  { target: () => docsTarget(), title: 'Waiting for news…', text: 'The clock is running. A new document for Mr. Schulz is on its way.', run: true, enter: () => { const c = tutClue(tp1(), 'sodium'); c.revealT = G.t + 0.2; }, wait: () => tutClue(tp1(), 'sodium').shown },
  { target: () => docsTarget(), title: 'A secondary diagnosis', text: 'The nursing note says his low sodium was <em>treated</em> (fluid restriction, checks). Conditions that cause extra work count as <em>secondary diagnoses</em>. Click <em>“hyponatraemia”</em> and add <em>E87.1</em> as <em>Secondary</em>. Watch the DRG box.',
    wait: () => hasSdx(tp1(), 'E87.1'), nudge: () => tp1().coding.pdx === 'E87.1' ? 'That went into Principal. Pneumonia is still the main reason for the stay: put J18.9 back as principal and E87.1 as secondary.' : '' },
  { target: '.drgbox', title: 'More complex, better paid', text: () => { const g = group(tp1().coding); return `PCCL rose to ${g.pccl} and the case is now <em>${g.drg}</em> at <em>${euro(g.value)}</em>. Sicker patients cost more, so correctly coded secondary diagnoses matter. But only code what the record supports!`; } },
  { target: '#btn-ask', title: 'A lab value is not a diagnosis', text: 'A new lab result: potassium 3.0 is low. But a number on its own is <em>not codable</em>, only if it was treated. Dr. Okafor knows. Press <em>Ask doctor</em>.', enter: () => tutReveal(tp1(), 'potassium'), wait: () => tp1().ask || tp1().asked > 0 },
  { target: '.energy', title: 'Energy', text: 'Asking cost <em>3 energy</em> (the yellow bars). Chasing paperwork costs energy too. The clock runs while Dr. Okafor walks over to answer.', run: true, wait: () => tp1().asked > 0 },
  { target: () => docsTarget(), title: 'Now it\'s documented', text: 'Dr. Okafor confirms potassium was given. Now it\'s codable: add <em>E87.6</em> (hypokalaemia) as <em>Secondary</em>.', wait: () => hasSdx(tp1(), 'E87.6') },
  { target: '#btn-coffee', title: 'Coffee', text: 'Energy comes back with <em>coffee</em>. It takes a few seconds and the ward keeps moving while you\'re at the machine. Try it now.', wait: () => G.coffees > 0 && G.coffeeUntil < performance.now() },
  { target: '.canvas-wrap', title: 'A new admission', text: 'Mrs. Kowalski is being wheeled in. When she\'s in bed, <em>open her chart</em> (click her card or her bed).', enter: () => tutArrive(tp2()), run: true, wait: () => G.sel === tp2().id },
  { target: () => docsTarget(), title: 'Your turn', text: 'Code her <em>principal diagnosis</em> yourself. The admission note has a yellow term.', wait: () => tp2().coding.pdx === 'N39.0',
    nudge: () => tp2().coding.pdx && tp2().coding.pdx !== 'N39.0' ? `The note says “urinary tract infection”, without saying where. That's N39.0.` : '' },
  { target: () => $('[data-chase]') || docsTarget(), title: 'A vague note', text: '“Seems confused” is not a diagnosis. Coding delirium now would be <em>upcoding</em>, and auditors punish that. Press <em>Chase documentation</em> to get it written down properly.', enter: () => tutReveal(tp2(), 'vague'), wait: () => tutClue(tp2(), 'vague').chaseEnd != null },
  { target: () => docsTarget(), title: 'Chasing…', text: 'The doctor is writing a proper note. The clock runs meanwhile.', run: true, wait: () => tutClue(tp2(), 'vague').clarified },
  { target: () => docsTarget(), title: 'Clarified', text: 'Now it says <em>delirium</em>, with treatment. Add <em>F05.0</em> as <em>Secondary</em> (she has no dementia, so not F05.1).', wait: () => hasSdx(tp2(), 'F05.0'),
    nudge: () => hasSdx(tp2(), 'F05.1') ? 'F05.1 is delirium on top of dementia, and she has no dementia. Use F05.0.' : '' },
  { target: () => docsTarget(), title: 'The diagnosis changed', text: 'New finding: the infection reached her kidney. A more specific diagnosis <em>replaces</em> the old one. Put <em>N10</em> into <em>Principal</em>. It will replace N39.0.', enter: () => tutReveal(tp2(), 'kidney'), wait: () => tp2().coding.pdx === 'N10' },
  { target: '.lower section', title: 'Discharge timeline', text: 'This timeline shows who leaves when. Patients usually go home in the <em>late morning</em> (shaded), and often several at once. Red marks a case with no principal diagnosis yet.' },
  { target: () => $('#btn-pause') || $('.hud .tools'), title: 'Pause', text: 'Need a breather? <em>Pause</em> (or Space) stops the clock. You can still read every chart, but you can\'t code or act until you resume. <em>Hard mode</em> has no pause at all.' },
  { target: '.canvas-wrap', title: 'Discharge', text: 'Let\'s send Mr. Schulz home and watch his case get scored.', run: true, enter: () => { tp1().tutKeep = false; tp1().dischargeT = G.t + 0.3; G.speed = 2; }, wait: () => tp1().locked, minReal: 1 },
  { target: () => $('#c-result') || $('#chart'), title: 'Case closed', text: 'Every case is scored when the patient leaves: billed value, a bonus for a <em>clean case</em>, and a bonus for each secondary diagnosis that changed the DRG. You can always review what the record supported.', enter: () => { G.speed = 1; selectPatient(tp1().id); } },
  { title: 'One last thing: the MD audit', text: 'At the end of every week, the <em>MD auditor</em> reviews some of your cases. For every challenged code you must show the document that proves it. Codes without evidence are clawed back with a surcharge. So: <em>only code what\'s written down</em>.' },
  { title: 'You\'re ready!', text: 'Mrs. Kowalski goes home now, and that ends the practice shift. Good luck on the ward!', run: true, enter: () => { tp2().tutKeep = false; tp2().dischargeT = G.t + 0.25; G.speed = 2; }, wait: () => G.over, last: true },
];

function tutGo(i) {
  const T = G.tut; T.i = i; T.enteredReal = G.real; T.nudged = '';
  const s = TUT_STEPS[i]; if (!s) return;
  T.hold = !s.run;
  if (s.enter) s.enter();
  renderTutBubble();
  Audio8.play('click');
  setTimeout(() => { const el = tutTarget(s); if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 60);
}
function tutTarget(s) { if (!s.target) return null; return typeof s.target === 'function' ? s.target() : $(s.target); }
function renderTutBubble() {
  const T = G.tut; const s = TUT_STEPS[T.i]; const bub = $('#tut-bubble'); if (!bub) return;
  const text = typeof s.text === 'function' ? s.text() : s.text;
  bub.innerHTML = `<canvas width="64" height="64" aria-hidden="true"></canvas><div>
    <div class="tut-count">Tutorial · ${T.i + 1} / ${TUT_STEPS.length}</div><h3>${s.title}</h3><p>${text}</p><p class="tut-nudge" hidden></p>
    <div class="row">${s.wait ? `<span class="tut-turn">${s.run ? 'Time is passing…' : 'Your turn'}</span>` : `<button class="btn" id="tut-next">${T.i === TUT_STEPS.length - 1 ? 'Finish' : 'Next'}</button>`}<button class="btn ghost small" id="tut-skip">Skip tutorial</button></div></div>`;
  drawNursePortrait(bub.querySelector('canvas'));
  const nx = bub.querySelector('#tut-next'); if (nx) { nx.onclick = () => tutGo(T.i + 1); nx.focus({ preventScroll: true }); }
  bub.querySelector('#tut-skip').onclick = () => endTutorial(false);
}
function tutTick() {
  const T = G && G.tut; if (!T || G.over) return;
  const s = TUT_STEPS[T.i]; if (!s) return;
  // nobody leaves before the script says so, however long the player takes
  for (const p of [T.p1, T.p2]) if (p.tutKeep && p.admitT != null && p.dischargeT - G.t < 1.2) p.dischargeT += 1;
  // advance when the player has done the thing
  if (s.wait && (G.real - T.enteredReal) >= (s.minReal || 0.3) && s.wait()) {
    if (s.last) return;
    Audio8.play('good'); tutGo(T.i + 1); return;
  }
  if (!s.wait && s.minReal == null) { /* info step */ }
  if (s.nudge) { const n = s.nudge(); if (n !== T.nudged) { T.nudged = n; const el = $('#tut-bubble .tut-nudge'); if (el) { el.hidden = !n; el.textContent = n; } } }
  // spotlight + bubble placement
  const spot = $('#tut-spot'), bub = $('#tut-bubble'); if (!spot || !bub) return;
  const el = tutTarget(s); const vw = innerWidth, vh = innerHeight; const br = bub.getBoundingClientRect();
  let bx, by;
  if (el) {
    const r = el.getBoundingClientRect(); const pad = 6;
    spot.hidden = false;
    Object.assign(spot.style, { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
    const gap = 16;
    if (vw < 700) { bx = 8; by = r.top > vh / 2 ? 8 : vh - br.height - 8; }
    else if (r.bottom + gap + br.height < vh) { bx = r.left; by = r.bottom + gap; }
    else if (r.top - gap - br.height > 0) { bx = r.left; by = r.top - gap - br.height; }
    else if (r.left - gap - br.width > 0) { bx = r.left - gap - br.width; by = r.top; }
    else if (r.right + gap + br.width < vw) { bx = r.right + gap; by = r.top; }
    else { bx = vw - br.width - 16; by = vh - br.height - 16; }
  } else {
    spot.hidden = false; Object.assign(spot.style, { left: '50%', top: '50%', width: '0px', height: '0px' }); bx = (vw - br.width) / 2; by = Math.max(16, (vh - br.height) / 2);
  }
  bx = Math.max(8, Math.min(vw - br.width - 8, bx)); by = Math.max(8, Math.min(vh - br.height - 8, by));
  bub.style.left = bx + 'px'; bub.style.top = by + 'px';
  spot.classList.toggle('dim', !el);
}
function endTutorial(done) {
  const spot = $('#tut-spot'), bub = $('#tut-bubble'); spot && spot.remove(); bub && bub.remove();
  SAVE.tutorialDone = true; persist();
  if (!done) { G = null; showTutorialDone(false); }
}
function showTutorialDone(completed) {
  SCENE = null; AUDIT = null;
  const c = SAVE.career;
  root.innerHTML = `<div class="screen"><div class="results">
    <div class="res-head"><div><div class="eyebrow">Tutorial</div><h1>${completed ? 'Practice shift complete' : 'Tutorial skipped'}</h1></div></div>
    <div class="panel frame"><h2>What you learned</h2><ul class="notes" style="font-size:15px">
      <li>Open a chart, click <b>yellow terms</b>, and drag the right card into <b>Principal</b> or <b>Secondary</b>.</li>
      <li>Only code what the record supports: <b>treated</b> conditions, <b>clarified</b> notes, confirmed findings.</li>
      <li><b>Ask the doctor</b> about lab values, <b>chase</b> vague notes, refill energy with <b>coffee</b>.</li>
      <li>Update the principal when a <b>more specific diagnosis</b> arrives, and code before <b>discharge</b>.</li>
      <li>The weekly <b>MD audit</b> checks your evidence.</li></ul></div>
    <div class="row">${c ? `<button class="btn big" id="td-go">Continue career</button>` : `<button class="btn big" id="td-go">Start your career</button>`}<button class="btn ghost" id="td-again">Replay tutorial</button><button class="btn ghost" id="td-menu">Main menu</button></div>
  </div></div>`;
  $('#td-go').onclick = () => { Audio8.play('click'); if (!SAVE.career) newCareer(); showHub(); };
  $('#td-again').onclick = () => { Audio8.play('click'); startTutorial(); };
  $('#td-menu').onclick = () => { Audio8.play('click'); showTitle(); };
}
