/**
 * Procedural WebAudio: engine (detuned saws + lowpass), skid/wind noise,
 * UI/countdown one-shots and tiny generative music loops. No audio files.
 */

type MusicKind = 'menu' | 'race' | 'win' | null;

class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private engBus: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private engFilter: BiquadFilterNode | null = null;
  private engGain: GainNode | null = null;
  private skidGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private musicId: number | null = null;
  private musicStep = 0;
  private musicKind: MusicKind = null;
  vol = { master: 0.8, music: 0.5, sfx: 0.8, engine: 0.6 };

  /** Call from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const ctx = new AudioContext();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.sfxBus = ctx.createGain();
      this.engBus = ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.engBus.connect(this.master);
      this.apply();
      this.loopNoise(true);
      this.loopNoise(false);
    } catch {
      this.ctx = null;
    }
  }

  apply() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master?.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.musicBus?.gain.setTargetAtTime(this.vol.music * 0.32, t, 0.05);
    this.sfxBus?.gain.setTargetAtTime(this.vol.sfx * 0.8, t, 0.05);
    this.engBus?.gain.setTargetAtTime(this.vol.engine * 0.5, t, 0.05);
  }

  engineOn() {
    if (!this.ctx || this.osc1) return;
    const ctx = this.ctx;
    this.engFilter = ctx.createBiquadFilter();
    this.engFilter.type = 'lowpass';
    this.engFilter.frequency.value = 800;
    this.engGain = ctx.createGain();
    this.engGain.gain.value = 0;
    this.osc1 = ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.value = 60;
    this.osc2 = ctx.createOscillator();
    this.osc2.type = 'square';
    this.osc2.frequency.value = 61;
    const g2 = ctx.createGain();
    g2.gain.value = 0.35;
    this.osc1.connect(this.engFilter);
    this.osc2.connect(g2);
    g2.connect(this.engFilter);
    this.engFilter.connect(this.engGain);
    this.engGain.connect(this.engBus!);
    this.osc1.start();
    this.osc2.start();
  }

  engineOff() {
    try {
      this.osc1?.stop();
      this.osc2?.stop();
    } catch {
      /* noop */
    }
    this.osc1 = null;
    this.osc2 = null;
    this.engFilter = null;
    if (this.skidGain && this.ctx) this.skidGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    if (this.windGain && this.ctx) this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
  }

  engine(speed01: number, throttle: number, boosting: boolean) {
    if (!this.ctx || !this.osc1 || !this.osc2 || !this.engFilter || !this.engGain) return;
    const t = this.ctx.currentTime;
    const rpm = Math.min(1, speed01 * 0.85 + throttle * 0.15);
    const f = 42 + rpm * 230 + (boosting ? 30 : 0);
    this.osc1.frequency.setTargetAtTime(f, t, 0.04);
    this.osc2.frequency.setTargetAtTime(f * 1.005 + 2, t, 0.04);
    this.engFilter.frequency.setTargetAtTime(500 + rpm * 2600, t, 0.06);
    this.engGain.gain.setTargetAtTime(0.5 + rpm * 0.5, t, 0.08);
  }

  slide(drift01: number, speed01: number) {
    if (!this.ctx || !this.skidGain || !this.windGain) return;
    const t = this.ctx.currentTime;
    this.skidGain.gain.setTargetAtTime(drift01 * 0.45, t, 0.05);
    this.windGain.gain.setTargetAtTime(speed01 * speed01 * 0.22, t, 0.1);
  }

  private noiseBuf(): AudioBuffer {
    const ctx = this.ctx!;
    const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  private loopNoise(skid: boolean) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf();
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = skid ? 'bandpass' : 'lowpass';
    f.frequency.value = skid ? 900 : 350;
    if (skid) f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus!);
    src.start();
    if (skid) this.skidGain = g;
    else this.windGain = g;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.sfxBus!);
    o.start();
    o.stop(ctx.currentTime + dur + 0.02);
  }

  click() {
    this.tone(2200, 0.05, 'triangle', 0.15);
  }
  beep(final: boolean) {
    this.tone(final ? 1200 : 600, final ? 0.5 : 0.15, 'square', 0.32);
  }
  thud(hard = 1) {
    this.tone(120, 0.15, 'triangle', 0.5 * hard, 40);
  }
  whoosh() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf();
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(300, ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus!);
    src.start();
    src.stop(ctx.currentTime + 0.65);
  }
  ping() {
    this.tone(880, 0.08, 'sine', 0.2);
  }
  fanfare(win: boolean) {
    const seq = win ? [523, 659, 784, 1047] : [392, 330, 262];
    seq.forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'triangle', 0.28), i * (win ? 140 : 180)));
  }
  unlock_jingle() {
    [660, 880, 1320].forEach((f, i) => setTimeout(() => this.tone(f, 0.2, 'sine', 0.24), i * 90));
  }

  music(kind: MusicKind) {
    if (this.musicKind === kind) return;
    this.musicKind = kind;
    if (this.musicId != null) {
      clearInterval(this.musicId);
      this.musicId = null;
    }
    if (!kind || !this.ctx) return;
    const scale =
      kind === 'menu' ? [220, 261.6, 329.6, 392, 440] : kind === 'race' ? [146.8, 174.6, 220, 233.1, 293.7] : [523.3, 659.3, 784, 1046.5];
    const stepMs = kind === 'race' ? 170 : 260;
    this.musicStep = 0;
    this.musicId = window.setInterval(() => {
      if (!this.ctx || !this.musicBus || this.musicKind !== kind) return;
      const s = this.musicStep++;
      const base = scale[(s * 3) % scale.length];
      this.note(base / 2, 'sine', 0.5, 0.16);
      if (s % 2 === 0) this.note(scale[s % scale.length], 'triangle', 0.22, 0.09);
      if (kind === 'race' && s % 4 === 0) this.note(55, 'square', 0.12, 0.2);
    }, stepMs);
  }

  private note(freq: number, type: OscillatorType, dur: number, vol: number) {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.musicBus);
    o.start();
    o.stop(ctx.currentTime + dur + 0.05);
  }

  duck(on: boolean) {
    if (!this.ctx) return;
    if (on) void this.ctx.suspend();
    else void this.ctx.resume();
  }
}

export const sound = new Sound();
