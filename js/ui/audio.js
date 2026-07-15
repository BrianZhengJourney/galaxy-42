/* Procedural audio — no samples or downloaded assets.
   A restrained deep-space ambience (sub-harmonic drift, filtered cabin air,
   and distant harmonic shimmer) plus clear navigation cues. Sound is armed on
   by default, but the WebAudio graph stays lazy until unlock() runs inside the
   visitor's first gesture, as required by browser autoplay policies. */

const MASTER_LEVEL = 0.105;

export class AudioEngine {
  constructor(){
    this.ctx = null;
    this.enabled = true;
    this.unlocked = false;
    this.master = null;
    this.bed = null;
    this.sfxBus = null;
    this._cueDelay = null;
    this._lastHoverAt = -Infinity;
  }

  _ensure(){
    if (this.ctx) return true;
    let ctx = null;
    try{
      const AC = typeof window !== 'undefined'
        ? (window.AudioContext || window.webkitAudioContext)
        : null;
      if (!AC) return false;

      ctx = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0; // raised only after an explicit enable

      // Catch stacked UI cues without flattening the ambient dynamics.
      if (ctx.createDynamicsCompressor){
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -18;
        limiter.knee.value = 18;
        limiter.ratio.value = 3;
        limiter.attack.value = 0.012;
        limiter.release.value = 0.32;
        this.master.connect(limiter);
        limiter.connect(ctx.destination);
      }else{
        this.master.connect(ctx.destination);
      }

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.82;
      this.sfxBus.connect(this.master);
      this._buildCueSpace();
      this._buildBed();
      return true;
    }catch(e){
      try{ ctx?.close?.(); }catch(closeError){ /* best effort */ }
      this.ctx = null;
      this.master = null;
      this.bed = null;
      this.sfxBus = null;
      this._cueDelay = null;
      return false;
    }
  }

  _buildCueSpace(){
    const ctx = this.ctx;
    if (!ctx.createDelay) return;

    const delay = this._cueDelay = ctx.createDelay(0.8);
    delay.delayTime.value = 0.19;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.13;
    const out = ctx.createGain();
    out.gain.value = 0.22;
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(out);
    out.connect(this.sfxBus);
  }

  /* ---- evolving ambient bed ---- */
  _buildBed(){
    const ctx = this.ctx;
    const bed = this.bed = ctx.createGain();
    bed.gain.value = 0.31;
    bed.connect(this.master);

    // The whole field breathes over ~37 seconds, below conscious rhythm.
    const breath = ctx.createOscillator();
    breath.type = 'sine';
    breath.frequency.value = 0.027;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 0.045;
    breath.connect(breathDepth);
    breathDepth.connect(bed.gain);
    breath.start();

    // Open fifth + octave, kept below the range that reads as a musical loop.
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 470;
    padFilter.Q.value = 0.7;
    padFilter.connect(bed);

    const filterDrift = ctx.createOscillator();
    filterDrift.type = 'sine';
    filterDrift.frequency.value = 0.013;
    const filterDepth = ctx.createGain();
    filterDepth.gain.value = 150;
    filterDrift.connect(filterDepth);
    filterDepth.connect(padFilter.frequency);
    filterDrift.start();

    const voices = [
      { frequency: 43.65, type: 'sine',     gain: 0.22, detune: -4, pan: -0.28 },
      { frequency: 43.65, type: 'triangle', gain: 0.052, detune: 4, pan: 0.28 },
      { frequency: 65.41, type: 'sine',     gain: 0.11, detune: 2, pan: 0.18 },
      { frequency: 87.31, type: 'sine',     gain: 0.065, detune: -3, pan: -0.15 },
      { frequency: 130.81, type: 'sine',    gain: 0.022, detune: 5, pan: 0.34 },
    ];
    voices.forEach((voice, index) => {
      const osc = ctx.createOscillator();
      osc.type = voice.type;
      osc.frequency.value = voice.frequency;
      osc.detune.value = voice.detune;
      const gain = ctx.createGain();
      gain.gain.value = voice.gain;
      osc.connect(gain);

      const destination = this._withPan(gain, voice.pan);
      destination.connect(padFilter);

      // Each partial drifts independently, preventing an obvious repeating pad.
      const drift = ctx.createOscillator();
      drift.type = 'sine';
      drift.frequency.value = 0.009 + index * 0.0037;
      const depth = ctx.createGain();
      depth.gain.value = voice.gain * (index === 0 ? 0.08 : 0.16);
      drift.connect(depth);
      depth.connect(gain.gain);
      osc.start();
      drift.start();
    });

    // Brown-ish noise feels like distant pressure/air instead of radio static.
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++){
      brown = brown * 0.985 + (Math.random() * 2 - 1) * 0.015;
      data[i] = Math.max(-1, Math.min(1, brown * 4.2));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const rumbleHighpass = ctx.createBiquadFilter();
    rumbleHighpass.type = 'highpass';
    rumbleHighpass.frequency.value = 48;
    const rumbleLowpass = ctx.createBiquadFilter();
    rumbleLowpass.type = 'lowpass';
    rumbleLowpass.frequency.value = 330;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0.052;
    noise.connect(rumbleHighpass);
    rumbleHighpass.connect(rumbleLowpass);
    rumbleLowpass.connect(rumbleGain);
    rumbleGain.connect(bed);

    // A nearly subliminal high air-band adds scale without constant hiss.
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'bandpass';
    airFilter.frequency.value = 2300;
    airFilter.Q.value = 0.45;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.006;
    noise.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(bed);
    noise.start();

    // Remote harmonics appear and disappear on different long cycles.
    const shimmerBus = ctx.createGain();
    shimmerBus.gain.value = 1;
    shimmerBus.connect(bed);
    this._buildDiffuseTail(shimmerBus, bed);
    [523.25, 783.99, 1046.5].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      osc.detune.value = [-7, 5, -2][index];
      const gain = ctx.createGain();
      const base = [0.0032, 0.0022, 0.0012][index];
      gain.gain.value = base;
      const shimmerLfo = ctx.createOscillator();
      shimmerLfo.type = 'sine';
      shimmerLfo.frequency.value = [0.017, 0.011, 0.007][index];
      const shimmerDepth = ctx.createGain();
      shimmerDepth.gain.value = base * 0.88;
      shimmerLfo.connect(shimmerDepth);
      shimmerDepth.connect(gain.gain);
      osc.connect(gain);
      this._withPan(gain, [-0.45, 0.38, -0.12][index]).connect(shimmerBus);
      osc.start();
      shimmerLfo.start();
    });
  }

  _buildDiffuseTail(input, output){
    const ctx = this.ctx;
    if (!ctx.createDelay) return;
    const delay = ctx.createDelay(1.2);
    delay.delayTime.value = 0.37;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.21;
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    input.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(output);
  }

  _withPan(node, value){
    if (!this.ctx.createStereoPanner) return node;
    const pan = this.ctx.createStereoPanner();
    pan.pan.value = value;
    node.connect(pan);
    return pan;
  }

  _rampMaster(target, duration, floor = 0){
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    if (this.master.gain.cancelAndHoldAtTime){
      this.master.gain.cancelAndHoldAtTime(t);
    }else{
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value, t);
    }
    if (floor > 0 && this.master.gain.value < floor)
      this.master.gain.setValueAtTime(floor, t);
    this.master.gain.linearRampToValueAtTime(target, t + duration);
  }

  unlock(){
    if (!this.enabled) return true;
    if (!this._ensure()){
      this.enabled = false;
      this.unlocked = false;
      return false;
    }
    this.unlocked = true;
    try{
      const resumed = this.ctx.resume?.();
      resumed?.catch?.(() => { this.unlocked = false; });
    }catch(e){ this.unlocked = false; }
    // A small floor makes the first interaction cue audible while the ambient
    // bed still arrives gently instead of snapping on.
    this._rampMaster(MASTER_LEVEL, 0.55, MASTER_LEVEL * 0.42);
    return true;
  }

  setEnabled(on){
    this.enabled = Boolean(on);
    if (this.enabled) return this.unlock();
    this.unlocked = false;
    if (this.ctx) this._rampMaster(0, 0.35);
    return true;
  }

  _routeCue(node, { pan = 0, wet = 0.15 } = {}){
    const output = this._withPan(node, pan);
    output.connect(this.sfxBus);
    if (this._cueDelay && wet > 0){
      const send = this.ctx.createGain();
      send.gain.value = wet;
      output.connect(send);
      send.connect(this._cueDelay);
    }
  }

  /* ---- UI sounds — short, synthesized, and intentionally quiet ---- */
  _tone(freq, dur, {
    type = 'sine', gain = 0.035, to = null, delay = 0,
    attack = 0.014, pan = 0, wet = 0.15,
  } = {}){
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const end = t + dur;
    const peak = t + Math.min(attack, dur * 0.42);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(1, freq), t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), end);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.exponentialRampToValueAtTime(gain, peak);
    envelope.gain.setValueAtTime(gain, Math.max(peak, end - Math.min(0.08, dur * 0.45)));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    osc.connect(envelope);
    this._routeCue(envelope, { pan, wet });
    osc.start(t);
    osc.stop(end + 0.03);
  }

  _noiseBurst(dur, cutoff, {
    gain = 0.055, sweep = null, delay = 0, attack = 0.02,
    pan = 0, wet = 0.22, q = 0.8,
  } = {}){
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + delay;
    const end = t + dur;
    const length = Math.ceil(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(Math.max(1, cutoff), t);
    filter.Q.value = q;
    if (sweep) filter.frequency.exponentialRampToValueAtTime(Math.max(1, sweep), end);
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, t);
    envelope.gain.exponentialRampToValueAtTime(gain, t + Math.min(attack, dur * 0.7));
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    source.connect(filter);
    filter.connect(envelope);
    this._routeCue(envelope, { pan, wet });
    source.start(t);
    source.stop(end + 0.01);
  }

  hover(){
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this._lastHoverAt < 0.055) return;
    this._lastHoverAt = now;
    this._tone(1420, 0.06, { gain: 0.017, to: 1810, attack: 0.004, pan: 0.16, wet: 0.04 });
    this._tone(2840, 0.05, { gain: 0.005, delay: 0.008, attack: 0.003, pan: -0.12, wet: 0.03 });
  }

  button(){
    this._noiseBurst(0.055, 2100, {
      gain: 0.014, sweep: 1180, attack: 0.003, pan: -0.05, wet: 0.025, q: 1.45,
    });
    this._tone(690, 0.105, {
      type: 'triangle', gain: 0.031, to: 835, attack: 0.004, pan: 0.06, wet: 0.07,
    });
  }

  select(){
    this._tone(440, 0.16, { type: 'triangle', gain: 0.038, to: 466, attack: 0.006, pan: -0.1, wet: 0.12 });
    this._tone(659.25, 0.24, { gain: 0.024, delay: 0.045, attack: 0.008, pan: 0.16, wet: 0.20 });
  }

  jump(){
    // Air gathers before the low gravitational pulse; no abrasive sawtooth.
    this._noiseBurst(0.82, 170, {
      gain: 0.065, sweep: 2800, attack: 0.25, pan: 0.08, wet: 0.30, q: 0.68,
    });
    this._tone(76, 0.78, { gain: 0.060, to: 38, attack: 0.018, pan: -0.05, wet: 0.22 });
    this._tone(330, 0.42, { gain: 0.018, to: 185, delay: 0.22, attack: 0.008, pan: 0.2, wet: 0.30 });
  }

  ascend(){
    this._noiseBurst(0.72, 240, {
      gain: 0.032, sweep: 1950, attack: 0.30, pan: -0.08, wet: 0.26, q: 0.78,
    });
    this._tone(98, 0.82, { gain: 0.044, to: 196, attack: 0.045, pan: -0.16, wet: 0.22 });
    this._tone(146.83, 0.76, { gain: 0.024, to: 293.66, delay: 0.08, attack: 0.012, pan: 0.2, wet: 0.28 });
  }

  back(){
    this._tone(349.23, 0.20, { gain: 0.034, to: 220, attack: 0.006, pan: 0.12, wet: 0.10 });
    this._tone(174.61, 0.30, { gain: 0.018, to: 110, delay: 0.035, attack: 0.008, pan: -0.12, wet: 0.16 });
  }
}
