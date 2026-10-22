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
      musicGain = ac.createGain(); musicGain.gain.value = 0.18; musicGain.connect(master);
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
  // music: lo-fi elevator chiptune, I–vi–IV–V in C with a walking bass
  const BASS = [48, 48, 55, 52, 45, 45, 52, 48, 41, 41, 48, 45, 43, 43, 47, 50];
  const CH = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]];
  const MEL = [76, -1, 74, 72, 74, -1, 76, -1, 72, -1, 69, -1, 67, -1, -1, -1, 69, -1, 72, 74, 72, -1, 69, -1, 67, -1, 64, 67, 62, -1, -1, -1];
  const mf = n => 440 * Math.pow(2, (n - 69) / 12);
  function sched() {
    if (!ac || !musicOn) return;
    const spb = 60 / 104 / 2;
    while (nextT < ac.currentTime + 0.3) {
      const when = nextT - ac.currentTime; const bar = Math.floor(step / 8) % 4;
      if (step % 2 === 0) tone(mf(BASS[(step / 2) % 16] - 12), spb * 1.6, 'triangle', 0.5, 0, when, musicGain);
      const ch = CH[bar]; tone(mf(ch[step % 4]), spb * 0.9, 'square', 0.08, 0, when, musicGain);
      const m = MEL[step % 32]; if (m > 0 && Math.floor(step / 32) % 2 === 1) tone(mf(m), spb * 1.8, 'square', 0.12, 0, when, musicGain);
      if (step % 4 === 2) { /* hat */ }
      step++; nextT += spb;
    }
  }
  return {
    init,
    play(name) { if (!sfxOn) return; init(); if (ac && ac.state === 'suspended') ac.resume(); try { SFX[name] && SFX[name](); } catch (e) { } },
    setSfx(v) { sfxOn = v; },
    setMusic(v) {
      musicOn = v; init(); if (!ac) return;
      if (ac.state === 'suspended') ac.resume();
      if (v && !timer) { nextT = ac.currentTime + 0.1; timer = setInterval(sched, 100); }
      if (!v && timer) { clearInterval(timer); timer = null; }
    },
    get sfx() { return sfxOn; }, get music() { return musicOn; },
  };
})();
