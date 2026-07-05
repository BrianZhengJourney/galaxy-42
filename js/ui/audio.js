/* Procedural audio — no sample assets, all synthesized with WebAudio.
   An evolving ambient bed (detuned pad + drifting filter + hull-noise wash +
   occasional shimmer) plus a small kit of instrument-panel UI sounds. Off by
   default; the enable toggle supplies the user gesture WebAudio needs. */

export class AudioEngine {
  constructor(){
    this.ctx = null;
    this.enabled = false;
    this.master = null;
    this.bed = null;
    this.sfxBus = null;
  }

  _ensure(){
    if (this.ctx) return true;
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain();
      this.master.gain.value = 0;                 // ramped up on enable
      this.master.connect(ctx.destination);

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);

      this._buildBed();
      return true;
    }catch(e){ return false; }
  }

  /* ---- evolving ambient bed ---- */
  _buildBed(){
    const ctx = this.ctx;
    const bed = this.bed = ctx.createGain();
    bed.gain.value = 0.55;

    // shared drifting lowpass gives the pad slow movement
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 380; filt.Q.value = 3;
    filt.connect(bed);
    const lfo = ctx.createOscillator();     lfo.frequency.value = 0.05;
    const lfoGain = ctx.createGain();       lfoGain.gain.value = 190;
    lfo.connect(lfoGain); lfoGain.connect(filt.frequency); lfo.start();

    // A-minor-ish pad, each voice lightly detuned for chorus warmth
    const voices = [55, 82.41, 110, 130.81];
    voices.forEach((f, i) => {
      for (const det of [-0.3, 0.3]){
        const o = ctx.createOscillator();
        o.type = i > 1 ? 'sine' : 'triangle';
        o.frequency.value = f; o.detune.value = det * 6;
        const g = ctx.createGain(); g.gain.value = (i > 1 ? 0.10 : 0.16);
        o.connect(g); g.connect(filt); o.start();
      }
    });

    // filtered noise wash — hull / life-support air
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true;
    const nflt = ctx.createBiquadFilter(); nflt.type = 'lowpass'; nflt.frequency.value = 200;
    const ng = ctx.createGain(); ng.gain.value = 0.06;
    noise.connect(nflt); nflt.connect(ng); ng.connect(bed); noise.start();

    // slow gain swell so the pad breathes
    const swell = ctx.createOscillator(); swell.frequency.value = 0.033;
    const swellG = ctx.createGain(); swellG.gain.value = 0.12;
    swell.connect(swellG); swellG.connect(bed.gain); swell.start();

    // rare high shimmer, mostly silent
    const shim = ctx.createOscillator(); shim.type = 'sine'; shim.frequency.value = 880;
    const shimG = ctx.createGain(); shimG.gain.value = 0;
    shim.connect(shimG); shimG.connect(bed);
    const shimLfo = ctx.createOscillator(); shimLfo.frequency.value = 0.021;
    const shimLfoG = ctx.createGain(); shimLfoG.gain.value = 0.016;
    // bias negative so the shimmer only peeks through at the LFO crest
    const bias = ctx.createConstantSource(); bias.offset.value = -0.012;
    shimLfo.connect(shimLfoG); shimLfoG.connect(shimG.gain); bias.connect(shimG.gain);
    shim.start(); shimLfo.start(); bias.start();

    bed.connect(this.master);
  }

  setEnabled(on){
    if (on && !this._ensure()) return false;
    this.enabled = on;
    this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(on ? 0.09 : 0, t + (on ? 0.8 : 0.5));
    return true;
  }

  /* ---- UI sounds — short, synthesized, tasteful ---- */
  _tone(freq, dur, { type = 'sine', gain = 0.06, to = null, delay = 0 } = {}){
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  _noiseBurst(dur, cutoff, { gain = 0.08, sweep = null } = {}){
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const flt = ctx.createBiquadFilter(); flt.type = 'bandpass';
    flt.frequency.setValueAtTime(cutoff, t); flt.Q.value = 1.2;
    if (sweep) flt.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(this.sfxBus);
    src.start(t); src.stop(t + dur);
  }

  hover(){ this._tone(1240, 0.07, { type: 'sine', gain: 0.028, to: 1480 }); }
  select(){
    this._tone(660, 0.09, { type: 'triangle', gain: 0.05 });
    this._tone(990, 0.11, { type: 'sine', gain: 0.045, delay: 0.06 });
  }
  jump(){                                   // hyperjump: down-sweep + whoosh
    this._tone(420, 0.55, { type: 'sawtooth', gain: 0.06, to: 60 });
    this._noiseBurst(0.6, 900, { gain: 0.09, sweep: 120 });
  }
  ascend(){ this._tone(200, 0.6, { type: 'sine', gain: 0.05, to: 820 }); }  // rise to galaxy
  back(){ this._tone(360, 0.16, { type: 'sine', gain: 0.045, to: 220 }); }
}
