"use client";

/**
 * All music and sound effects are synthesised live with the Web Audio API:
 * no audio files to download and no copyright issues. The music is an original
 * loop written below as notes.
 *
 * Browsers only allow audio after the visitor interacts with the page, so call
 * `sound.unlock()` from a click/tap handler (AudioBoot does this automatically).
 */

export type Sfx =
  | "click"
  | "dice"
  | "step"
  | "card"
  | "correct"
  | "wrong"
  | "coin"
  | "power"
  | "drum"
  | "fanfare"
  | "eliminated"
  | "join";

const MUSIC_KEY = "cv:music";
const SFX_KEY = "cv:sfx";

type Listener = () => void;

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

// ---- the music: A minor, 92 bpm, 4 chords x 1 bar, looping -----------------
const BPM = 92;
const BEAT = 60 / BPM;
/** chord tones (MIDI) per bar: Am, F, C, G, then Am, F, G, E */
const CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
  [57, 60, 64],
  [53, 57, 60],
  [55, 59, 62],
  [52, 56, 59],
];
/** 8th-note arpeggio pattern: indexes into the chord (3 = root an octave up) */
const ARP = [0, 1, 2, 3, 2, 1, 2, 1];
const SPARKLE = [76, 79, 81, 84, 88]; // pentatonic bells

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private delay!: DelayNode;
  private noise!: AudioBuffer;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private listeners = new Set<Listener>();

  musicOn = true;
  sfxOn = true;

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.musicOn = localStorage.getItem(MUSIC_KEY) !== "off";
      this.sfxOn = localStorage.getItem(SFX_KEY) !== "off";
    } catch {}
  }

  get unlocked() {
    return !!this.ctx && this.ctx.state === "running";
  }

  /** Create / resume the audio context. Must be called from a user gesture. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.build();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (this.musicOn) this.startMusic();
    this.emit();
  }

  private build() {
    const ctx = this.ctx!;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.55;
    this.sfxBus.connect(this.master);

    // spacey echo for the music
    this.delay = ctx.createDelay(1);
    this.delay.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    this.delay.connect(fb).connect(this.delay);
    this.delay.connect(wet).connect(this.musicBus);

    // white noise for dice, drums and whooshes
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // ---------------------------------------------------------------- settings

  setMusic(on: boolean) {
    this.musicOn = on;
    try {
      localStorage.setItem(MUSIC_KEY, on ? "on" : "off");
    } catch {}
    if (on) {
      this.unlock();
      this.startMusic();
    } else this.stopMusic();
    this.emit();
  }

  setSfx(on: boolean) {
    this.sfxOn = on;
    try {
      localStorage.setItem(SFX_KEY, on ? "on" : "off");
    } catch {}
    if (on) this.unlock();
    this.emit();
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private emit() {
    this.listeners.forEach((f) => f());
  }

  // ---------------------------------------------------------------- music

  private startMusic() {
    const ctx = this.ctx;
    if (!ctx || this.timer) return;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setTargetAtTime(0.32, ctx.currentTime, 1.2); // fade in
    this.nextNoteTime = ctx.currentTime + 0.1;
    this.step = 0;
    // Look-ahead scheduler: every 50 ms, queue the notes for the next 200 ms.
    this.timer = setInterval(() => this.schedule(), 50);
  }

  private stopMusic() {
    const ctx = this.ctx;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (ctx) this.musicBus.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
  }

  private schedule() {
    const ctx = this.ctx!;
    const eighth = BEAT / 2;
    while (this.nextNoteTime < ctx.currentTime + 0.2) {
      const t = this.nextNoteTime;
      const bar = Math.floor(this.step / 8) % CHORDS.length;
      const pos = this.step % 8;
      const chord = CHORDS[bar];

      if (pos === 0) {
        // pad: whole bar, slow swell
        for (const n of chord) this.tone(n + 12, t, BEAT * 4, { type: "sine", gain: 0.05, attack: 0.6, release: 1.2, bus: "music" });
        this.tone(chord[0] - 12, t, BEAT * 1.6, { type: "triangle", gain: 0.12, attack: 0.02, release: 0.4, bus: "music" });
      }
      if (pos === 4) this.tone(chord[0] - 12, t, BEAT * 1.6, { type: "triangle", gain: 0.1, attack: 0.02, release: 0.4, bus: "music" });

      // arpeggio
      const idx = ARP[pos];
      const note = idx === 3 ? chord[0] + 12 : chord[idx];
      this.tone(note + 12, t, eighth * 0.9, { type: "triangle", gain: 0.06, attack: 0.005, release: 0.25, bus: "music", echo: true });

      // occasional bell
      if (pos === 6 && Math.random() < 0.35) {
        const b = SPARKLE[Math.floor(Math.random() * SPARKLE.length)];
        this.tone(b, t, 0.4, { type: "sine", gain: 0.035, attack: 0.005, release: 0.8, bus: "music", echo: true });
      }

      this.nextNoteTime += eighth;
      this.step += 1;
    }
  }

  // ---------------------------------------------------------------- building blocks

  private tone(
    note: number,
    at: number,
    dur: number,
    o: {
      type?: OscillatorType;
      gain?: number;
      attack?: number;
      release?: number;
      bus?: "music" | "sfx";
      echo?: boolean;
      slideTo?: number;
      freq?: number;
    } = {},
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? "sine";
    const f = o.freq ?? midi(note);
    osc.frequency.setValueAtTime(f, at);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, at + dur);
    const peak = o.gain ?? 0.2;
    const atk = o.attack ?? 0.01;
    const rel = o.release ?? 0.1;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + atk);
    g.gain.setValueAtTime(peak, at + Math.max(atk, dur - rel * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur + rel);
    osc.connect(g);
    const bus = o.bus === "music" ? this.musicBus : this.sfxBus;
    g.connect(bus);
    if (o.echo) g.connect(this.delay);
    osc.start(at);
    osc.stop(at + dur + rel + 0.05);
  }

  private noiseHit(at: number, dur: number, freq: number, q: number, gain: number, sweepTo?: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(freq, at);
    if (sweepTo) bp.frequency.exponentialRampToValueAtTime(sweepTo, at + dur);
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(bp).connect(g).connect(this.sfxBus);
    src.start(at, Math.random() * 0.5, dur + 0.05);
  }

  // ---------------------------------------------------------------- sound effects

  play(name: Sfx, variant = 0) {
    if (!this.sfxOn || !this.ctx || this.ctx.state !== "running") return;
    const t = this.ctx.currentTime + 0.01;
    switch (name) {
      case "click":
        this.tone(0, t, 0.03, { freq: 880, type: "sine", gain: 0.08, release: 0.04 });
        break;
      case "join":
        this.tone(72, t, 0.08, { type: "triangle", gain: 0.15 });
        this.tone(79, t + 0.08, 0.12, { type: "triangle", gain: 0.15, release: 0.2 });
        break;
      case "dice": {
        // rattling clicks that slow down, then a final clack
        let at = t;
        for (let i = 0; i < 9; i++) {
          this.noiseHit(at, 0.035, 2500 + Math.random() * 1500, 6, 0.5);
          at += 0.04 + i * 0.012;
        }
        this.noiseHit(at + 0.05, 0.08, 1800, 4, 0.7);
        break;
      }
      case "step":
        this.tone(67 + (variant % 6) * 2, t, 0.05, { type: "triangle", gain: 0.14, release: 0.08 });
        break;
      case "card":
        this.noiseHit(t, 0.35, 600, 1.2, 0.35, 4000);
        this.tone(84, t + 0.25, 0.08, { type: "sine", gain: 0.06, release: 0.2 });
        break;
      case "correct":
        [72, 76, 79, 84].forEach((n, i) => this.tone(n, t + i * 0.09, 0.12, { type: "triangle", gain: 0.18, release: 0.25 }));
        break;
      case "wrong":
        this.tone(52, t, 0.18, { type: "square", gain: 0.08, release: 0.05 });
        this.tone(47, t + 0.2, 0.32, { type: "square", gain: 0.08, release: 0.15 });
        break;
      case "coin":
        this.tone(83, t, 0.07, { type: "square", gain: 0.06, release: 0.02 });
        this.tone(88, t + 0.07, 0.25, { type: "square", gain: 0.06, release: 0.2 });
        break;
      case "power":
        this.tone(0, t, 0.5, { freq: 400, slideTo: 1600, type: "sine", gain: 0.12, release: 0.2 });
        [84, 88, 91, 96].forEach((n, i) => this.tone(n, t + 0.1 + i * 0.07, 0.1, { type: "sine", gain: 0.07, release: 0.3 }));
        break;
      case "drum":
        this.tone(0, t, 0.25, { freq: 140, slideTo: 45, type: "sine", gain: 0.6, release: 0.1 });
        this.noiseHit(t + 0.18, 0.15, 1500, 0.8, 0.45);
        this.tone(0, t + 0.36, 0.25, { freq: 140, slideTo: 45, type: "sine", gain: 0.6, release: 0.1 });
        break;
      case "fanfare":
        [
          [60, 0, 0.14], [64, 0.14, 0.14], [67, 0.28, 0.14], [72, 0.42, 0.5],
        ].forEach(([n, d, len]) => {
          this.tone(n, t + d, len, { type: "sawtooth", gain: 0.07, attack: 0.02, release: 0.3 });
          this.tone(n + 12, t + d, len, { type: "triangle", gain: 0.08, attack: 0.02, release: 0.3 });
        });
        break;
      case "eliminated":
        this.tone(0, t, 0.8, { freq: 500, slideTo: 90, type: "sawtooth", gain: 0.07, release: 0.2 });
        break;
    }
  }
}

export const sound = new SoundEngine();
