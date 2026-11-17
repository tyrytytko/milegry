import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAudio } from './audio';

class FakeContext {
  static last: FakeContext;
  state = 'suspended';
  currentTime = 0;
  destination = {};
  master = { gain: { value: -1 }, connect() {} };
  started = 0;
  resume = vi.fn(() => Promise.resolve());
  constructor() {
    FakeContext.last = this;
  }
  createGain() {
    if (this.master.gain.value === -1) {
      this.master.gain.value = 0;
      return this.master;
    }
    const param = { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
    return { gain: param, connect() {} };
  }
  createBiquadFilter() {
    return { type: '', frequency: { value: 0 }, connect() {} };
  }
  createOscillator() {
    const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {} };
    return { type: '', frequency: param, connect() {}, start: () => this.started++, stop() {} };
  }
}

const listeners = new Map<string, () => void>();

beforeEach(() => {
  listeners.clear();
  vi.stubGlobal('window', {
    AudioContext: FakeContext,
    addEventListener: (type: string, fn: () => void) => listeners.set(type, fn),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('audio', () => {
  it('wznawia kontekst przerwany przez system (iOS: interrupted)', () => {
    const audio = createAudio({ muted: false, effectsVolume: 1 });
    audio.unlock();
    const ctx = FakeContext.last;
    ctx.state = 'interrupted';
    ctx.resume.mockClear();
    audio.unlock();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('na dotyku ponawia wznowienie przy puszczeniu palca (dopiero to jest aktywacją)', () => {
    const audio = createAudio({ muted: false, effectsVolume: 1 });
    audio.unlock(); // z pointerdown — przeglądarka odmawia
    const ctx = FakeContext.last;
    ctx.resume.mockClear();
    listeners.get('pointerup')?.();
    expect(ctx.resume).toHaveBeenCalledTimes(1);
  });

  it('nic nie gra, dopóki kontekst nie działa; potem gra', () => {
    const audio = createAudio({ muted: false, effectsVolume: 1 });
    audio.unlock();
    audio.play('good');
    expect(FakeContext.last.started).toBe(0);
    FakeContext.last.state = 'running';
    audio.play('good');
    expect(FakeContext.last.started).toBe(2);
  });

  it('wyciszenie od razu zeruje głośność główną (także trwających dźwięków)', () => {
    const audio = createAudio({ muted: false, effectsVolume: 0.5 });
    audio.unlock();
    expect(FakeContext.last.master.gain.value).toBeCloseTo(0.06);
    audio.configure({ muted: true, effectsVolume: 0.5 });
    expect(FakeContext.last.master.gain.value).toBe(0);
  });
});
