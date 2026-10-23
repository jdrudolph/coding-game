// ============================================================================
// AUDIO: tiny WebAudio chiptune synth (sfx + optional music loop)
// ============================================================================
const Audio8 = (() => {
  let ac = null, master = null, musicGain = null, sfxGain = null, musicOn = false, sfxOn = true, timer = null, step = 0, nextT = 0;
  function init() {
    if (ac) return;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.6; master.connect(ac.destination);
      sfxGain = ac.createGain(); sfxGain.gain.value = 0.5; sfxGain.connect(master);
      musicGain = ac.createGain(); musicGain.gain.value = 0.7; musicGain.connect(master);
    } catch (e) { ac = null; }
  }
  function tone(f, dur, type = 'square', vol = 0.3, slide = 0, when = 0, dest) {
    if (!ac) return;
    const t = ac.currentTime + when;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || sfxGain); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.2, when = 0, hp = 800) {
    if (!ac) return;
    const t = ac.currentTime + when; const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate); const d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ac.createBufferSource(); s.buffer = buf; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ac.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t);
  }
  const SFX = {
    click: () => tone(660, 0.05, 'square', 0.12),
    pick: () => tone(520, 0.06, 'square', 0.14, 200),
    drop: () => { tone(330, 0.07, 'square', 0.18, -80); tone(660, 0.05, 'triangle', 0.1, 0, 0.04); },
    remove: () => tone(300, 0.08, 'square', 0.12, -150),
    clue: () => { tone(880, 0.08, 'triangle', 0.2); tone(1320, 0.12, 'triangle', 0.16, 0, 0.07); },
    arrive: () => { tone(392, 0.1, 'triangle', 0.15); tone(523, 0.14, 'triangle', 0.15, 0, 0.1); },
    discharge: () => { tone(784, 0.1, 'square', 0.12); tone(659, 0.1, 'square', 0.12, 0, 0.1); tone(523, 0.18, 'square', 0.12, 0, 0.2); },
    coin: () => { tone(988, 0.06, 'square', 0.15); tone(1319, 0.2, 'square', 0.15, 0, 0.06); },
    good: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.13, 0, i * 0.07)); },
    bad: () => { tone(220, 0.25, 'sawtooth', 0.15, -100); },
    error: () => { tone(140, 0.15, 'square', 0.15); tone(110, 0.2, 'square', 0.15, 0, 0.12); },
    tick: () => tone(1600, 0.03, 'square', 0.08),
    alarm: () => { tone(988, 0.12, 'square', 0.12); tone(784, 0.12, 'square', 0.12, 0, 0.14); },
    coffee: () => { noise(1.2, 0.08, 0, 1500); tone(200, 0.4, 'sine', 0.05, 80, 0.1); },
    ask: () => { tone(600, 0.05, 'sine', 0.15); tone(900, 0.08, 'sine', 0.15, 0, 0.06); },
    answer: () => { tone(700, 0.06, 'triangle', 0.18); tone(1050, 0.1, 'triangle', 0.16, 0, 0.06); tone(1400, 0.12, 'triangle', 0.12, 0, 0.12); },
    hit: () => { noise(0.15, 0.25, 0, 400); tone(160, 0.15, 'square', 0.2, -80); },
    hurt: () => { tone(330, 0.1, 'sawtooth', 0.18, -200); tone(220, 0.2, 'sawtooth', 0.15, -100, 0.1); },
    fanfare: () => { [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'square', 0.14, 0, i * 0.11)); },
    boss: () => { [196, 185, 175, 165].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.12, 0, i * 0.22)); },
  };
  // ---------------------------------------------------------------- music
  // "Night Shift": a warm lo-fi chiptune in F major, 84 bpm, swung eighths.
  // Pads (detuned saws, filtered) + round bass + vibrato lead + echoing arp + bells + soft drums,
  // all through a small generated reverb room.
  const BPM = 84, SPB = 60 / BPM / 2; // seconds per eighth
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  const CH = {
    Fmaj7: [41, [53, 57, 60, 64]], Em7: [40, [52, 55, 59, 62]], Dm7: [38, [50, 53, 57, 60]], Cmaj7: [36, [52, 55, 59, 60]],
    Bbmaj7: [34, [53, 57, 58, 62]], Am7: [45, [52, 55, 57, 60]], Gm7: [43, [50, 53, 55, 58]], C7sus: [36, [53, 55, 58, 60]],
    Dm9: [38, [53, 57, 60, 64]], FA: [45, [53, 57, 60, 65]], CE: [40, [52, 55, 60, 64]],
  };
  const PROG_A = ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Bbmaj7', 'Am7', 'Gm7', 'C7sus'];
  const PROG_B = ['Dm9', 'Bbmaj7', 'FA', 'CE', 'Dm7', 'Gm7', 'Bbmaj7', 'C7sus'];
  // melody: 8 eighths per bar, 0 = hold, -1 = rest
  const MEL_A = [[69, 0, 72, 0, 76, 0, 0, 74], [71, 0, 67, 0, 64, 0, 0, -1], [65, 0, 69, 0, 72, 0, 74, 72], [71, 0, 0, 0, 67, 0, -1, -1],
    [69, 0, 70, 0, 74, 0, 77, 0], [76, 0, 0, 74, 72, 0, -1, -1], [70, 0, 69, 0, 67, 0, 65, 0], [67, 0, 0, 0, -1, -1, 72, 0]];
  const MEL_B = [[74, 0, 0, 76, 77, 0, 76, 74], [72, 0, 0, 0, 69, 0, 70, 0], [72, 0, 0, 69, 65, 0, 0, 0], [67, 0, 64, 0, 67, 0, 72, 0],
    [74, 0, 0, 72, 69, 0, 72, 0], [74, 0, 77, 0, 74, 0, 70, 0], [69, 0, 0, 0, 65, 0, 67, 69], [67, 0, 0, 0, 0, 0, -1, -1]];
  // arrangement: [progression, melody, lead voice, drums]
  const SONG = [[PROG_A, null, null, 0], [PROG_A, MEL_A, 'lead', 1], [PROG_B, MEL_B, 'lead', 1], [PROG_A, MEL_A, 'bell', 2], [PROG_B, MEL_B, 'lead', 1], [PROG_A, MEL_A, 'both', 1]];
  let fx = null, bar = 0;
  function buildFx() {
    if (fx) return fx;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(musicGain);
    const rev = ac.createConvolver(); const len = Math.floor(ac.sampleRate * 2.6); const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
    rev.buffer = ir; const revOut = ac.createGain(); revOut.gain.value = 0.32; rev.connect(revOut); revOut.connect(comp);
    const dly = ac.createDelay(1.5); dly.delayTime.value = SPB * 3; const fb = ac.createGain(); fb.gain.value = 0.38; const dlp = ac.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1800;
    dly.connect(dlp); dlp.connect(fb); fb.connect(dly); const dOut = ac.createGain(); dOut.gain.value = 0.5; dlp.connect(dOut); dOut.connect(comp); dOut.connect(rev);
    const bus = ac.createGain(); bus.connect(comp); bus.connect(rev);
    const pw = n => { const re = new Float32Array(32), im = new Float32Array(32); for (let k = 1; k < 32; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * n); return ac.createPeriodicWave(re, im); };
    fx = { bus, delay: dly, rev, pulse25: pw(0.25), pulse12: pw(0.125) };
    return fx;
  }
  function env(g, t, a, peak, d, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * sus, t + a, d); g.gain.setValueAtTime(peak * sus, end); g.gain.setTargetAtTime(0.0001, end, rel);
  }
  function osc(type, f, t, stop, dest, detune = 0) {
    const o = ac.createOscillator(); if (typeof type === 'string') o.type = type; else o.setPeriodicWave(type);
    o.frequency.setValueAtTime(f, t); o.detune.value = detune; o.connect(dest); o.start(t); o.stop(stop); return o;
  }
  function pad(notes, t, dur) {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1300, t + dur * 0.5); f.frequency.linearRampToValueAtTime(800, t + dur); f.Q.value = 0.7;
    const g = ac.createGain(); env(g, t, 0.6, 0.05, 0.8, 0.8, 0.5, t + dur); g.connect(f); f.connect(fx.bus);
    for (const n of notes) { osc('sawtooth', mf(n), t, t + dur + 2.5, g, -7); osc('sawtooth', mf(n), t, t + dur + 2.5, g, 7); }
  }
  function bass(n, t, dur, v = 0.32) {
    const g = ac.createGain(); env(g, t, 0.01, v, 0.25, 0.55, 0.08, t + dur); g.connect(fx.bus);
    osc('triangle', mf(n), t, t + dur + 0.6, g); const g2 = ac.createGain(); g2.gain.value = 0.25; g2.connect(g); osc('sine', mf(n - 12), t, t + dur + 0.6, g2);
  }
  function lead(n, t, dur, v = 0.07) {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; f.Q.value = 1;
    const g = ac.createGain(); env(g, t, 0.02, v, 0.2, 0.7, 0.12, t + dur); g.connect(f); f.connect(fx.bus);
    const send = ac.createGain(); send.gain.value = 0.25; g.connect(send); send.connect(fx.delay);
    const o = osc(fx.pulse25, mf(n), t, t + dur + 0.8, g);
    const lfo = ac.createOscillator(); lfo.frequency.value = 5.2; const lg = ac.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(mf(n) * 0.006, t + Math.min(0.5, dur)); lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.8);
  }
  function bell(n, t, v = 0.06) {
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8); g.connect(fx.bus);
    osc('sine', mf(n), t, t + 2, g); const g2 = ac.createGain(); g2.gain.setValueAtTime(0.35, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5); g2.connect(g); osc('sine', mf(n) * 3.01, t, t + 2, g2);
    const s = ac.createGain(); s.gain.value = 0.4; g.connect(s); s.connect(fx.delay);
  }
  function arp(n, t, v = 0.022) {
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + SPB * 1.6); g.connect(fx.delay); g.connect(fx.bus);
    osc(fx.pulse12, mf(n), t, t + SPB * 2, g);
  }
  function kick(t, v = 0.5) {
    const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3); g.connect(fx.bus);
    const o = ac.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18); o.connect(g); o.start(t); o.stop(t + 0.32);
  }
  function hiss(t, dur, v, freq, type = 'highpass') {
    const len = Math.floor(ac.sampleRate * dur); const buf = ac.createBuffer(1, len, ac.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    const s = ac.createBufferSource(); s.buffer = buf; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ac.createGain(); g.gain.value = v;
    s.connect(f); f.connect(g); g.connect(fx.bus); s.start(t);
  }
  function scheduleBar(t0) {
    const sec = SONG[Math.floor(bar / 8) % SONG.length]; const bi = bar % 8;
    const [root, notes] = CH[sec[0][bi]];
    const at = i => t0 + i * SPB + (i % 2 ? SPB * 0.16 : 0); // swing
    pad(notes, t0, SPB * 8);
    const r = root < 36 ? root + 12 : root;
    bass(r, at(0), SPB * 2.6); bass(r + 7, at(3), SPB * 0.9, 0.22); bass(r + 12, at(4), SPB * 1.6, 0.24); bass(r + 7, at(6), SPB * 1.6, 0.22);
    const up = notes.map(n => n + 12); const seq = [0, 1, 2, 3, 2, 1, 3, 2];
    for (let i = 0; i < 8; i++) arp(up[seq[i]] + (i === 3 && bi % 2 ? 12 : 0), at(i));
    if (sec[3]) {
      kick(at(0), 0.45); if (bi % 4 === 3) kick(at(5), 0.25); kick(at(4), 0.32);
      hiss(at(2), 0.12, 0.05, 1800, 'bandpass'); hiss(at(6), 0.12, 0.05, 1800, 'bandpass');
      for (let i = 0; i < 8; i++) hiss(at(i), 0.04, i % 2 ? 0.012 : 0.02, 7000);
    } else if (bi === 0) bell(notes[3] + 24, t0, 0.03);
    if (sec[1]) {
      const m = sec[1][bi];
      for (let i = 0; i < 8; i++) {
        const n = m[i]; if (n <= 0) continue;
        let len = 1; while (i + len < 8 && m[i + len] === 0) len++;
        const dur = len * SPB * 0.95;
        if (sec[2] === 'lead' || sec[2] === 'both') lead(n, at(i), dur, sec[2] === 'both' ? 0.055 : 0.07);
        if (sec[2] === 'bell' || sec[2] === 'both') bell(n + 12, at(i), sec[2] === 'both' ? 0.035 : 0.06);
      }
    }
    if (bi === 7 && sec[3]) hiss(at(7), 0.6, 0.03, 5000); // little cymbal into the next phrase
    bar++;
  }
  function sched() {
    if (!ac || !musicOn) return;
    buildFx();
    while (nextT < ac.currentTime + 0.4) { scheduleBar(nextT); nextT += SPB * 8; }
  }
  return {
    init,
    play(name) { if (!sfxOn) return; init(); if (ac && ac.state === 'suspended') ac.resume(); try { SFX[name] && SFX[name](); } catch (e) { } },
    setSfx(v) { sfxOn = v; },
    setMusic(v) {
      musicOn = v; init(); if (!ac) return;
      if (ac.state === 'suspended') ac.resume();
      if (v && !timer) { nextT = ac.currentTime + 0.15; bar = 0; musicGain.gain.cancelScheduledValues(ac.currentTime); musicGain.gain.setValueAtTime(0.7, ac.currentTime); timer = setInterval(sched, 120); sched(); }
      if (!v && timer) { clearInterval(timer); timer = null; musicGain.gain.setTargetAtTime(0.0001, ac.currentTime, 0.15); }
    },
    get sfx() { return sfxOn; }, get music() { return musicOn; },
  };
})();
