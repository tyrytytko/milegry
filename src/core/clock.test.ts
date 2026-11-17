import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClock, driveClock, MAX_FRAME_MS } from './clock';

/** Tyka zegarem w krokach po 16 ms, aż minie `total` ms czasu rzeczywistego. */
function run(clock: ReturnType<typeof createClock>, total: number): void {
  for (let t = 0; t < total; t += 16) clock.tick(16);
}

describe('createClock', () => {
  it('after() wywołuje callback raz po czasie', () => {
    const clock = createClock();
    const fn = vi.fn();
    clock.after(100, fn);
    run(clock, 90);
    expect(fn).not.toHaveBeenCalled();
    run(clock, 30);
    expect(fn).toHaveBeenCalledTimes(1);
    run(clock, 500);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('every() powtarza i daje się anulować', () => {
    const clock = createClock();
    const fn = vi.fn();
    const cancel = clock.every(100, fn);
    run(clock, 1000);
    expect(fn.mock.calls.length).toBeGreaterThanOrEqual(9);
    cancel();
    const count = fn.mock.calls.length;
    run(clock, 1000);
    expect(fn).toHaveBeenCalledTimes(count);
  });

  it('timery należne w tej samej klatce odpalają się w kolejności terminów', () => {
    const clock = createClock();
    const order: string[] = [];
    clock.after(120, () => order.push('A'));
    clock.tick(100);
    clock.after(10, () => order.push('B'));
    clock.tick(50);
    expect(order).toEqual(['B', 'A']);
  });

  it('frame() dostaje dt skalowane tempem', () => {
    const clock = createClock(0.5);
    const dts: number[] = [];
    clock.frame((dt) => dts.push(dt));
    clock.tick(20);
    expect(dts).toEqual([10]);
  });

  it('skala tempa wydłuża czas rzeczywisty', () => {
    const clock = createClock(0.5);
    const fn = vi.fn();
    clock.after(100, fn);
    run(clock, 150);
    expect(fn).not.toHaveBeenCalled();
    run(clock, 80);
    expect(fn).toHaveBeenCalled();
  });

  it('pauza zatrzymuje czas, wznowienie go puszcza', () => {
    const clock = createClock();
    const fn = vi.fn();
    clock.after(50, fn);
    clock.pause('hidden');
    run(clock, 500);
    expect(fn).not.toHaveBeenCalled();
    expect(clock.paused).toBe(true);
    clock.resume('hidden');
    run(clock, 64);
    expect(fn).toHaveBeenCalled();
  });

  it('ogranicza pojedynczy krok do MAX_FRAME_MS', () => {
    const clock = createClock();
    clock.tick(5000);
    expect(clock.now).toBe(MAX_FRAME_MS);
  });

  it('destroy() anuluje wszystko', () => {
    const clock = createClock();
    const fn = vi.fn();
    clock.after(10, fn);
    clock.frame(fn);
    clock.destroy();
    run(clock, 100);
    expect(fn).not.toHaveBeenCalled();
  });

  it('błąd w callbacku nie zatrzymuje innych', () => {
    const clock = createClock();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = vi.fn();
    clock.after(10, () => {
      throw new Error('test');
    });
    clock.after(10, ok);
    run(clock, 32);
    expect(ok).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('wait() rozwiązuje się po czasie', async () => {
    const clock = createClock();
    let done = false;
    void clock.wait(30).then(() => {
      done = true;
    });
    run(clock, 48);
    await Promise.resolve();
    expect(done).toBe(true);
  });
});

describe('driveClock', () => {
  type Listener = () => void;
  let rafQueue: ((time: number) => void)[];
  let docListeners: Map<string, Listener>;
  let doc: { hidden: boolean; addEventListener: (t: string, f: Listener) => void; removeEventListener: () => void };

  beforeEach(() => {
    vi.useFakeTimers();
    rafQueue = [];
    docListeners = new Map();
    doc = { hidden: false, addEventListener: (t, f) => docListeners.set(t, f), removeEventListener: () => {} };
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', { addEventListener() {}, removeEventListener() {} });
    vi.stubGlobal('requestAnimationFrame', (fn: (time: number) => void) => rafQueue.push(fn));
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  /** Przeglądarka z działającym rAF: klatka co 16 ms. */
  function runWithFrames(totalMs: number): number {
    let frames = 0;
    for (let t = 0; t < totalMs; t += 16) {
      vi.advanceTimersByTime(16);
      const frame = rafQueue.shift();
      if (frame) {
        frame(performance.now());
        frames++;
      }
    }
    return frames;
  }

  it('gdy rAF nie przychodzi, a karta jest widoczna, czas gry płynie normalnie', () => {
    const clock = createClock();
    const fn = vi.fn();
    clock.after(700, fn);
    const stop = driveClock(clock);
    vi.advanceTimersByTime(650);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(clock.now).toBeGreaterThan(700);
    expect(clock.now).toBeLessThanOrEqual(750);
    stop();
  });

  it('gdy rAF działa, klatki gry nie są podwajane', () => {
    const clock = createClock();
    const frame = vi.fn();
    clock.frame(frame);
    const stop = driveClock(clock);
    const rafFrames = runWithFrames(1000);
    expect(rafFrames).toBeGreaterThan(50);
    expect(frame).toHaveBeenCalledTimes(rafFrames);
    stop();
  });

  it('przy ukrytej karcie zegar stoi, po powrocie rusza bez skoku', () => {
    const clock = createClock();
    const stop = driveClock(clock);
    doc.hidden = true;
    docListeners.get('visibilitychange')?.();
    vi.advanceTimersByTime(5000);
    expect(clock.now).toBe(0);
    doc.hidden = false;
    docListeners.get('visibilitychange')?.();
    vi.advanceTimersByTime(500);
    expect(clock.now).toBeGreaterThan(400);
    expect(clock.now).toBeLessThanOrEqual(500);
    stop();
  });

  it('stop() zatrzymuje zapasowy timer', () => {
    const clock = createClock();
    const stop = driveClock(clock);
    vi.advanceTimersByTime(200);
    stop();
    const at = clock.now;
    vi.advanceTimersByTime(1000);
    expect(clock.now).toBe(at);
  });
});
