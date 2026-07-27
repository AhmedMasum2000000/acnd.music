/**
 * Opt-in procedural audio.
 *
 * No audio files ship with the site. The ambient bed is three detuned
 * oscillators through a slowly sweeping filter, and the interface sounds are
 * short filtered noise bursts — a few hundred bytes of code standing in for
 * a few hundred kilobytes of samples.
 *
 * Nothing is constructed until the visitor explicitly enables sound, so no
 * AudioContext is ever created without a user gesture and no autoplay policy
 * is ever tripped.
 */

const BASE_HZ = 55; // A1 — the root the whole bed sits on

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private droneGain: GainNode | null = null;
  private voices: OscillatorNode[] = [];
  private lfo: OscillatorNode | null = null;
  private buf: Uint8Array | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private _enabled = false;

  get enabled(): boolean {
    return this._enabled;
  }

  /** Must be called from inside a user gesture handler. */
  async enable(): Promise<void> {
    if (this._enabled) return;

    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    if (ctx.state === 'suspended') await ctx.resume();

    this._enabled = true;
    // Long fade-in: the bed should arrive, not switch on.
    this.droneGain!.gain.cancelScheduledValues(ctx.currentTime);
    this.droneGain!.gain.setValueAtTime(this.droneGain!.gain.value, ctx.currentTime);
    this.droneGain!.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 2.4);
  }

  disable(): void {
    if (!this._enabled || !this.ctx) return;
    this._enabled = false;
    const t = this.ctx.currentTime;
    this.droneGain!.gain.cancelScheduledValues(t);
    this.droneGain!.gain.setValueAtTime(this.droneGain!.gain.value, t);
    this.droneGain!.gain.linearRampToValueAtTime(0.0001, t + 0.8);
  }

  private build(): void {
    const Ctor: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.9;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.75;
    this.buf = new Uint8Array(this.analyser.frequencyBinCount);

    this.master.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // ── the bed ───────────────────────────────────────────────────────
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.0001;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.Q.value = 6;

    // A very slow filter sweep is what stops a static drone from becoming
    // wallpaper — it keeps the bed moving just below conscious attention.
    this.lfo = ctx.createOscillator();
    this.lfo.frequency.value = 0.037;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 260;
    this.lfo.connect(lfoDepth);
    lfoDepth.connect(filter.frequency);
    this.lfo.start();

    // Root, fifth, octave — detuned against each other so they beat slowly.
    const intervals = [1, 1.5, 2, 3];
    const detune = [-7, 4, -3, 9];
    intervals.forEach((mult, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = BASE_HZ * mult;
      osc.detune.value = detune[i];

      const g = ctx.createGain();
      g.gain.value = i === 0 ? 0.35 : 0.22 / i;

      osc.connect(g);
      g.connect(filter);
      osc.start();
      this.voices.push(osc);
    });

    filter.connect(this.droneGain);
    this.droneGain.connect(this.master);

    // ── noise source for interface sounds ─────────────────────────────
    const len = Math.floor(ctx.sampleRate * 0.4);
    const nb = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = nb.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    this.noiseBuffer = nb;
  }

  /**
   * Short percussive tick for hovers, clicks and typewriter characters.
   * @param freq  centre frequency of the band-passed noise
   * @param level 0..1
   */
  blip(freq = 1800, level = 0.25): void {
    if (!this._enabled || !this.ctx || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq;
    bp.Q.value = 9;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.master!);
    src.start(t);
    src.stop(t + 0.12);
  }

  /** Rising sweep — used when the visitor crosses into a new act. */
  sweep(up = true): void {
    if (!this._enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(up ? 180 : 900, t);
    osc.frequency.exponentialRampToValueAtTime(up ? 900 : 180, t + 0.5);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

    osc.connect(g);
    g.connect(this.master!);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  /** Current amplitude, 0..1. Feeds the field so the visuals breathe. */
  level(): number {
    if (!this._enabled || !this.analyser || !this.buf) return 0;
    // `as never` works around the ArrayBufferLike variance in the DOM types
    // when Uint8Array is generic over its backing buffer.
    this.analyser.getByteFrequencyData(this.buf as never);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i];
    return Math.min(1, sum / this.buf.length / 128);
  }

  destroy(): void {
    this.disable();
    this.voices.forEach((v) => {
      try {
        v.stop();
      } catch {
        /* already stopped */
      }
    });
    this.lfo?.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}
