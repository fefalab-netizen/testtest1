let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function unlockAudio() {
  const c = ac();
  if (c && c.state === "suspended") void c.resume();
}

function beep(freq: number, dur: number, type: OscillatorType, gain = 0.04) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t);
  osc.stop(t + dur);
}

export const sfx = {
  roll() {
    beep(180, 0.07, "square", 0.03);
    beep(240, 0.09, "triangle", 0.03);
  },
  dice() {
    beep(210, 0.05, "square", 0.025);
    beep(320, 0.08, "triangle", 0.03);
    beep(140, 0.11, "sawtooth", 0.028);
  },
  land() {
    beep(90, 0.1, "square", 0.035);
  },
  step() {
    const f = 250 + Math.random() * 90;
    beep(f, 0.045, "square", 0.018);
  },
  move() {
    beep(320, 0.06, "sine", 0.03);
  },
  bump() {
    beep(90, 0.12, "sawtooth", 0.035);
  },
  hit() {
    beep(70, 0.14, "square", 0.04);
  },
  loot() {
    beep(520, 0.09, "triangle", 0.035);
    beep(780, 0.12, "sine", 0.025);
  },
  complete() {
    beep(420, 0.08, "triangle", 0.04);
    beep(620, 0.14, "sine", 0.03);
  },
  win() {
    beep(480, 0.12, "triangle", 0.04);
    beep(720, 0.2, "sine", 0.03);
  },
};
