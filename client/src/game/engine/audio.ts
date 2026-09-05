/**
 * AudioManager — fully procedural WebAudio (no external assets).
 * Engine: dual detuned saws through a lowpass, pitch follows speed.
 * Skids: filtered noise. UI/countdown/music: scheduled oscillators.
 * All gains wired to master/music/sfx/engine buses from settings.
 */

export type MusicTrack = 'menu' | 'race' | 'victory' | null;

export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private engineBus: GainNode | null = null;

  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private skidSource: AudioBufferSourceNode | null = null;
  private skidGain: GainNode | null = null;
  private windGain: GainNode | null = null;

  private musicTimer: number | null = null;
  private musicStep = 0;
  private currentTrack: MusicTrack = null;
  private volumes = { master: 0.8, music: 0.5, sfx: 0.8, engine: 0.6 };

  /** Must be called from a user gesture. Idempotent. */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.engineBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.engineBus.connect(this.master);
    this.applyVolumes();
    this.startSkidNoise();
    this.startWind();
  }

  setVolumes(v: { master: number; music: number; sfx: number; engine: number }) {
    this.volumes = v;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master?.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.musicBus?.gain.setTargetAtTime(this.volumes.music * 0.35, t, 0.05);
    this.sfxBus?.gain.setTargetAtTime(this.volumes.sfx * 0.8, t, 0.05);
    this.engineBus?.gain.setTargetAtTime(this.volumes.engine * 0.5, t, 0.05);
  }

  // ---- engine ---------------------------------------------------------------

  startEngine() {
    if (!this.ctx || this.engineOsc1) return;
    const ctx = this.ctx;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 800;
    this.engineFilter.Q.value = 2;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc1 = ctx.createOscillator();
    this.engineOsc1.type = 'sawtooth';
    this.engineOsc1.frequency.value = 60;
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc2.frequency.value = 61;
    const g2 = ctx.createGain();
    g2.gain.value = 0.4;
    this.engineOsc1.connect(this.engineFilter);
    this.engineOsc2.connect(g2);
    g2.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.engineBus!);
    this.engineOsc1.start();
    this.engineOsc2.start();
  }

  stopEngine() {
    try {
      this.engineOsc1?.stop();
      this.engineOsc2?.stop();
    } catch { /* already stopped */ }
    this.engineOsc1 = null;
    this.engineOsc2 = null;
  }

  /** speed01: 0..1 of top speed; load: throttle 0..1; boosting adds shimmer */
  updateEngine(speed01: number, throttle: number, boosting: boolean, dt: number) {
    if (!this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const rpm01 = Math.min(1, speed01 * 0.85 + throttle * 0.15);
    const freq = 42 + rpm01 * 230 + (boosting ? 30 : 0);
    this.engineOsc1.frequency.setTargetAtTime(freq, t, 0.04);
    this.engineOsc2.frequency.setTargetAtTime(freq * 1.005 + 2, t, 0.04);
    this.engineFilter.frequency.setTargetAtTime(500 + rpm01 * 2600, t, 0.06);
    this.engineGain.gain.setTargetAtTime(0.5 + rpm01 * 0.5, t, 0.08);
  }

  // ---- skid / wind -----------------------------------------------------------

  private noiseBuffer(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private startSkidNoise() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    filter.Q.value = 1.2;
    this.skidGain = ctx.createGain();
    this.skidGain.gain.value = 0;
    src.connect(filter);
    filter.connect(this.skidGain);
    this.skidGain.connect(this.sfxBus!);
    src.start();
    this.skidSource = src;
  }

  private startWind() {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 350;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    src.connect(filter);
    filter.connect(this.windGain);
    this.windGain.connect(this.sfxBus!);
    src.start();
  }

  updateSkid(drift01: number, speed01: number) {
    if (!this.ctx || !this.skidGain || !this.windGain) return;
    const t = this.ctx.currentTime;
    this.skidGain.gain.setTargetAtTime(drift01 * 0.5, t, 0.05);
    this.windGain.gain.setTargetAtTime(speed01 * speed01 * 0.25, t, 0.1);
  }

  // ---- one-shots -------------------------------------------------------------

  private blip(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.3, slideTo?: number) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.sfxBus!);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  uiClick() {
    this.blip(2200, 0.05, 'triangle', 0.15);
  }
  uiHover() {
    this.blip(1400, 0.03, 'triangle', 0.06);
  }
  countdownBeep(final: boolean) {
    this.blip(final ? 1200 : 600, final ? 0.5 : 0.15, 'square', 0.35);
  }
  collision(intensity = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.5 * intensity, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxBus!);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }
  nitroWhoosh() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer();
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxBus!);
    src.start();
    src.stop(ctx.currentTime + 0.65);
  }
  checkpoint() {
    this.blip(880, 0.08, 'sine', 0.2);
  }
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.35, 'triangle', 0.3), i * 140);
    });
  }
  defeat() {
    [392, 330, 262].forEach((f, i) => {
      setTimeout(() => this.blip(f, 0.4, 'triangle', 0.25), i * 180);
    });
  }
  achievement() {
    [660, 880, 1320].forEach((f, i) => setTimeout(() => this.blip(f, 0.2, 'sine', 0.25), i * 90));
  }

  // ---- music -----------------------------------------------------------------

  playMusic(track: MusicTrack) {
    if (this.currentTrack === track) return;
    this.currentTrack = track;
    this.stopMusic();
    if (!track || !this.ctx) return;
    const scale = track === 'menu' ? [220, 261.6, 329.6, 392, 440] : track === 'race' ? [146.8, 174.6, 220, 233.1, 293.7] : [523.3, 659.3, 784, 1046.5];
    const stepMs = track === 'race' ? 160 : 260;
    this.musicStep = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.currentTrack !== track) return;
      const step = this.musicStep++;
      const note = scale[(step * 3) % scale.length];
      const arp = scale[step % scale.length];
      this.musicNote(note / 2, 'sine', 0.5, 0.16);
      if (step % 2 === 0) this.musicNote(arp, 'triangle', 0.22, 0.09);
      if (track === 'race' && step % 4 === 0) this.musicNote(55, 'square', 0.12, 0.2);
      if (track === 'victory' && step % 4 === 2) this.musicNote(arp * 2, 'triangle', 0.3, 0.1);
    }, stepMs);
  }

  private musicNote(freq: number, type: OscillatorType, dur: number, vol: number) {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.musicBus);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.05);
  }

  stopMusic() {
    if (this.musicTimer != null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  suspendAll() {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }
  resumeAll() {
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }
}

export const audio = new AudioManager();
