let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let muted = false;
let musicOn = false;
let musicStep = 0;
let musicHandle = 0;
let rainNode: AudioBufferSourceNode | null = null;
let rainGain: GainNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    master.gain.value = 0.32;
    sfxBus.gain.value = 1;
    musicBus.gain.value = 0.55;
    sfxBus.connect(master);
    musicBus.connect(master);
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
}

export function setMuted(v: boolean) {
  muted = v;
  if (master && ctx) {
    master.gain.setTargetAtTime(v ? 0 : 0.32, ctx.currentTime, 0.04);
  }
}

export function isMuted() {
  return muted;
}

function tone(freq: number, dur: number, type: OscillatorType, gain = 0.2, slide?: number) {
  const c = ac();
  if (!c || !sfxBus || muted) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

const MELODY = [196, 247, 220, 294, 262, 196, 220, 165];

function scheduleMusic() {
  const c = ac();
  if (!c || !musicBus || !musicOn || muted) return;
  const t = c.currentTime;
  const freq = MELODY[musicStep % MELODY.length];
  musicStep += 1;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.045, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
  o.connect(g);
  g.connect(musicBus);
  o.start(t);
  o.stop(t + 1.2);
}

export function startMusic() {
  unlockAudio();
  if (musicOn) return;
  musicOn = true;
  scheduleMusic();
  const tick = () => {
    if (!musicOn) return;
    scheduleMusic();
    musicHandle = window.setTimeout(tick, 900);
  };
  musicHandle = window.setTimeout(tick, 900);
}

export function stopMusic() {
  musicOn = false;
  if (musicHandle) window.clearTimeout(musicHandle);
  musicHandle = 0;
}

export function setRainAmbience(on: boolean) {
  const c = ac();
  if (!c || !sfxBus) return;
  if (!on) {
    if (rainGain) rainGain.gain.setTargetAtTime(0, c.currentTime, 0.2);
    return;
  }
  if (!rainNode) {
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 800;
    rainGain = c.createGain();
    rainGain.gain.value = 0;
    src.connect(filter);
    filter.connect(rainGain);
    rainGain.connect(sfxBus);
    src.start();
    rainNode = src;
  }
  rainGain?.gain.setTargetAtTime(muted ? 0 : 0.045, c.currentTime, 0.25);
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    const c = ac();
    if (!c) return;
    if (document.hidden) void c.suspend();
    else if (c.state === "suspended") void c.resume();
  });
}

export const sfx = {
  plant: () => tone(320, 0.12, "triangle", 0.18, 180),
  water: () => tone(520, 0.16, "sine", 0.12, 280),
  harvest: () => {
    tone(440, 0.1, "square", 0.08);
    tone(660, 0.14, "triangle", 0.1, 880);
  },
  coin: () => {
    tone(880, 0.08, "square", 0.07);
    tone(1320, 0.12, "square", 0.05);
  },
  error: () => tone(140, 0.18, "sawtooth", 0.08, 90),
  feed: () => tone(240, 0.14, "triangle", 0.14, 160),
  sleep: () => tone(220, 0.4, "sine", 0.1, 110),
  step: () => tone(90 + Math.random() * 30, 0.05, "sine", 0.028),
  ui: () => tone(640, 0.06, "triangle", 0.06),
  splash: () => tone(400, 0.2, "sine", 0.1, 180),
  eat: () => {
    tone(300, 0.1, "triangle", 0.1, 420);
    tone(520, 0.12, "sine", 0.08);
  },
  quest: () => {
    tone(523, 0.1, "triangle", 0.1);
    tone(784, 0.18, "sine", 0.09, 1046);
  },
};
