import { test } from 'node:test';
import assert from 'node:assert/strict';

import { AudioEngine } from '../js/ui/audio.js';

class FakeParam {
  constructor(value = 0){
    this.value = value;
    this.events = [];
  }
  cancelScheduledValues(time){ this.events.push(['cancel', time]); }
  setValueAtTime(value, time){ this.value = value; this.events.push(['set', value, time]); }
  linearRampToValueAtTime(value, time){ this.value = value; this.events.push(['linear', value, time]); }
  exponentialRampToValueAtTime(value, time){ this.value = value; this.events.push(['exponential', value, time]); }
}

class FakeNode {
  constructor(ctx){ this.ctx = ctx; this.connections = []; }
  connect(node){ this.connections.push(node); return node; }
}

class FakeGain extends FakeNode {
  constructor(ctx){ super(ctx); this.gain = new FakeParam(1); }
}

class FakeOscillator extends FakeNode {
  constructor(ctx){
    super(ctx);
    this.type = 'sine';
    this.frequency = new FakeParam(440);
    this.detune = new FakeParam(0);
  }
  start(time = 0){ this.ctx.oscillatorStarts.push(time); }
  stop(time = 0){ this.ctx.oscillatorStops.push(time); }
}

class FakeBufferSource extends FakeNode {
  constructor(ctx){ super(ctx); this.buffer = null; this.loop = false; }
  start(time = 0){ this.ctx.bufferStarts.push(time); }
  stop(time = 0){ this.ctx.bufferStops.push(time); }
}

class FakeFilter extends FakeNode {
  constructor(ctx){
    super(ctx);
    this.type = 'lowpass';
    this.frequency = new FakeParam(350);
    this.Q = new FakeParam(1);
  }
}

class FakeDelay extends FakeNode {
  constructor(ctx){ super(ctx); this.delayTime = new FakeParam(0); }
}

class FakePanner extends FakeNode {
  constructor(ctx){ super(ctx); this.pan = new FakeParam(0); }
}

class FakeCompressor extends FakeNode {
  constructor(ctx){
    super(ctx);
    this.threshold = new FakeParam(-24);
    this.knee = new FakeParam(30);
    this.ratio = new FakeParam(12);
    this.attack = new FakeParam(0.003);
    this.release = new FakeParam(0.25);
  }
}

class FakeAudioContext {
  constructor(){
    this.currentTime = 1;
    this.sampleRate = 8000;
    this.destination = new FakeNode(this);
    this.oscillatorStarts = [];
    this.oscillatorStops = [];
    this.bufferStarts = [];
    this.bufferStops = [];
    this.resumeCalls = 0;
    this.closeCalls = 0;
  }
  createGain(){ return new FakeGain(this); }
  createOscillator(){ return new FakeOscillator(this); }
  createBufferSource(){ return new FakeBufferSource(this); }
  createBiquadFilter(){ return new FakeFilter(this); }
  createDelay(){ return new FakeDelay(this); }
  createStereoPanner(){ return new FakePanner(this); }
  createDynamicsCompressor(){ return new FakeCompressor(this); }
  createBuffer(channels, length){
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { getChannelData: channel => data[channel] };
  }
  resume(){ this.resumeCalls += 1; return Promise.resolve(); }
  close(){ this.closeCalls += 1; return Promise.resolve(); }
}

function withWindow(value, run){
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value });
  try{ return run(); }
  finally{
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else delete globalThis.window;
  }
}

test('audio is armed by default but stays lazy until a user gesture unlocks it', () => {
  const audio = new AudioEngine();
  assert.equal(audio.enabled, true);
  assert.equal(audio.ctx, null);
  audio.hover();
  assert.equal(audio.ctx, null, 'hover alone must not create a blocked AudioContext');
  assert.equal(audio.setEnabled(false), true);
  assert.equal(audio.enabled, false);
  assert.equal(audio.ctx, null);
});

test('unlock builds the procedural bed and distinct cues preserve the public API', () => {
  withWindow({ AudioContext: FakeAudioContext }, () => {
    const audio = new AudioEngine();
    assert.equal(audio.ctx, null);
    assert.equal(audio.unlock(), true);
    assert.equal(audio.enabled, true);
    assert.equal(audio.unlocked, true);
    assert.equal(audio.ctx.resumeCalls, 1);
    assert.equal(audio.master.gain.value, 0.105);
    assert.ok(audio.ctx.oscillatorStarts.length >= 15, 'ambient oscillators started');
    assert.equal(audio.ctx.bufferStarts.length, 1, 'looping ambient noise started');

    const beforeCues = audio.ctx.oscillatorStarts.length;
    audio.button();
    audio.select();
    audio.jump();
    audio.ascend();
    audio.back();
    assert.ok(audio.ctx.oscillatorStarts.length >= beforeCues + 9);
    assert.equal(audio.ctx.bufferStarts.length, 4,
      'button, jump and ascend add three distinct air transients');

    const beforeHover = audio.ctx.oscillatorStarts.length;
    audio.hover();
    audio.hover();
    assert.equal(audio.ctx.oscillatorStarts.length, beforeHover + 2, 'hover cue is rate limited');

    assert.equal(audio.setEnabled(false), true);
    assert.equal(audio.enabled, false);
    assert.equal(audio.unlocked, false);
    assert.equal(audio.master.gain.value, 0);
  });
});

test('unsupported WebAudio fails cleanly without creating partial state', () => {
  withWindow({}, () => {
    const audio = new AudioEngine();
    assert.equal(audio.unlock(), false);
    assert.equal(audio.enabled, false);
    assert.equal(audio.unlocked, false);
    assert.equal(audio.ctx, null);
  });
});
