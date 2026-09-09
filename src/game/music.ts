import type * as ToneNS from "tone";
import { unlockAudio } from "@/sfx";

type ToneMod = typeof ToneNS;

const BPM = 130;
const G_MINOR = [43, 45, 46, 48, 50, 51, 53];
const FLOORS: Record<number, Array<number | null>> = {
  1: [0, 4, 0, 9, 7],
  2: [0, 4, 7, 4, 0, 2, 4, 7],
  3: [0, null, 3, 4, null, 7, 4, null],
  4: [0, 7, 4, 11, 7, 4, 2, 9],
  5: [0, 2, 3, 4, 7, 4, 3, 2],
  6: [0, 2, 4, 7, 9, 7, 4, 2],
  7: [7, 9, 11, 12, 11, 9, 7, 4],
};

const MUTE_KEY = "xpress-crawl-music";

function degreeToMidi(deg: number, octaveShift: number) {
  const oct = Math.floor(deg / 7);
  const i = ((deg % 7) + 7) % 7;
  return G_MINOR[i] + oct * 12 + octaveShift;
}

function midiHz(T: ToneMod, midi: number) {
  return T.Frequency(midi, "midi").toFrequency();
}

let Tone: ToneMod | null = null;
let loading: Promise<ToneMod> | null = null;
let floor = 1;
let started = false;
let muted = false;
let kick: ToneNS.MembraneSynth | null = null;
let bass: ToneNS.MonoSynth | null = null;
let lead: ToneNS.Synth | null = null;
let delay: ToneNS.FeedbackDelay | null = null;
let master: ToneNS.Volume | null = null;
let kickLoop: ToneNS.Loop | null = null;
let bassLoop: ToneNS.Loop | null = null;
let leadLoop: ToneNS.Loop | null = null;
let bassStep = 0;
let leadStep = 0;
let armed = false;

function preload(): Promise<ToneMod> | null {
  if (typeof window === "undefined") return null;
  if (!loading) {
    loading = import("tone").then((mod) => {
      Tone = mod;
      return mod;
    });
  }
  return loading;
}

function build(T: ToneMod) {
  master = new T.Volume(-6).toDestination();
  kick = new T.MembraneSynth({ pitchDecay: 0.03, octaves: 3 }).connect(master);
  bass = new T.MonoSynth({
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.1, release: 0.08 },
    filterEnvelope: { attack: 0.01, decay: 0.08, sustain: 0.1, baseFrequency: 420 },
  }).connect(master);
  delay = new T.FeedbackDelay("8n.", 0.35).connect(master);
  lead = new T.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.02, decay: 0.2, sustain: 0.2, release: 0.3 },
  }).connect(delay);

  kickLoop = new T.Loop((time) => {
    kick?.triggerAttackRelease("C1", "8n", time);
  }, "4n");

  bassLoop = new T.Loop((time) => {
    const deg = bassStep % 2 === 0 ? 0 : 4;
    bass?.triggerAttackRelease(midiHz(T, degreeToMidi(deg, 0)), "16n", time);
    bassStep += 1;
  }, "8t");

  leadLoop = new T.Loop((time) => {
    const seq = FLOORS[floor] || FLOORS[1];
    const deg = seq[leadStep % seq.length];
    leadStep += 1;
    if (deg == null || !lead) return;
    lead.triggerAttackRelease(midiHz(T, degreeToMidi(deg, 24)), "8n", time);
  }, "8n");

  kickLoop.start(0);
  bassLoop.start(0);
  leadLoop.start(0);
}

function applyMute() {
  if (master) master.mute = muted;
}

async function boot(T: ToneMod) {
  await T.start();
  T.getTransport().bpm.value = BPM;
  if (!kick) build(T);
  applyMute();
  if (T.getTransport().state !== "started") T.getTransport().start();
  started = true;
}

export const crawlMusic = {
  preload() {
    void preload();
  },
  arm() {
    if (typeof window === "undefined" || armed) return;
    armed = true;
    const wake = () => {
      unlockAudio();
      void crawlMusic.start();
    };
    window.addEventListener("pointerdown", wake, { capture: true });
    window.addEventListener("keydown", wake, { capture: true });
  },
  async start() {
    if (typeof window === "undefined") return;
    try {
      const pending = preload();
      if (Tone) {
        void Tone.start();
        await boot(Tone);
        return;
      }
      const T = pending ? await pending : await import("tone");
      Tone = T;
      await boot(T);
    } catch (err) {
      console.warn("crawl music failed to start", err);
    }
  },
  setFloor(n: number) {
    floor = n >= 1 && n <= 8 ? n : 1;
  },
  stop() {
    if (!Tone) return;
    Tone.getTransport().pause();
    started = false;
  },
  setMuted(on: boolean) {
    muted = on;
    try {
      localStorage.setItem(MUTE_KEY, on ? "1" : "0");
    } catch {
      /* ignore */
    }
    applyMute();
    if (!on) void crawlMusic.start();
  },
  loadMuted(): boolean {
    try {
      muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      muted = false;
    }
    applyMute();
    return muted;
  },
  isMuted() {
    return muted;
  },
  isStarted() {
    return started;
  },
};
