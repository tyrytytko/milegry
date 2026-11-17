import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClockController } from '../clock';
import type { GameContext, GameManifest, GameModule } from '../types';
import type { App } from './app';
import { startSession, type SessionOptions } from './session';

const stopDriving = vi.fn();
const destroyAll = vi.fn();
vi.mock('../clock', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../clock')>()),
  driveClock: () => stopDriving,
}));
vi.mock('../input/gameInput', () => ({ createGameInput: () => ({ destroy: vi.fn() }) }));
vi.mock('../ui', () => ({ createUi: () => ({ destroyAll }) }));

const app = {
  mode: () => 'keyboard',
  settings: { tempo: 'medium' },
  reducedMotion: () => false,
  recordPlay: vi.fn(),
  flushPlay: vi.fn(),
  store: { scope: () => ({}) },
} as unknown as App;

const element = () => ({ replaceChildren: vi.fn() }) as unknown as HTMLElement;

function options(mount: (ctx: GameContext) => void, onComplete = vi.fn(), onFail = vi.fn()): SessionOptions {
  const module: GameModule = {
    mount(ctx) {
      mount(ctx);
      return { destroy() {} };
    },
  };
  return {
    app,
    module,
    manifest: { id: 'x' } as GameManifest,
    level: 1,
    skin: '',
    root: element(),
    dock: element(),
    onComplete,
    onFail,
    onExit: () => {},
    onExitHold: () => {},
  };
}

describe('startSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ctx.complete() po destroy() nic nie robi', async () => {
    let ctx: GameContext | undefined;
    const onComplete = vi.fn();
    const session = startSession(options((c) => (ctx = c), onComplete));
    session.destroy();
    ctx?.complete();
    await Promise.resolve();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('ctx.complete() wołane w mount dociera po zwróceniu sesji, raz', async () => {
    const onComplete = vi.fn();
    startSession(
      options((ctx) => {
        ctx.complete({ icon: '<svg></svg>' });
        ctx.complete();
      }, onComplete),
    );
    expect(onComplete).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({ icon: '<svg></svg>' });
  });

  describe('ctx.fail()', () => {
    const failOptions = (mount: (ctx: GameContext) => void, onFail = vi.fn(), onComplete = vi.fn()) =>
      options(mount, onComplete, onFail);

    it('loguje błąd z id gry, sprząta sesję (zegar, czas gry, wejście) i zgłasza ekran błędu, bez zaliczenia', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      let ctx: GameContext | undefined;
      const onFail = vi.fn();
      const onComplete = vi.fn();
      startSession(failOptions((c) => (ctx = c), onFail, onComplete));
      const error = new Error('zepsute');
      ctx?.fail(error);
      expect(log).toHaveBeenCalledWith('[x] gra zgłosiła błąd:', error);
      await Promise.resolve();
      expect(onFail).toHaveBeenCalledTimes(1);
      expect(stopDriving).toHaveBeenCalled();
      expect(destroyAll).toHaveBeenCalled();
      for (let i = 0; i < 50; i++) (ctx?.clock as ClockController).tick(100);
      expect(app.recordPlay).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('complete() po fail() i drugie fail() są ignorowane; fail() po destroy() też', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      let ctx: GameContext | undefined;
      const onFail = vi.fn();
      const onComplete = vi.fn();
      startSession(failOptions((c) => (ctx = c), onFail, onComplete));
      ctx?.fail('a');
      ctx?.complete();
      ctx?.fail('b');
      await Promise.resolve();
      expect(onFail).toHaveBeenCalledTimes(1);
      expect(onComplete).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledTimes(1);

      const second = vi.fn();
      const session = startSession(failOptions((c) => (ctx = c), second));
      session.destroy();
      ctx?.fail('c');
      await Promise.resolve();
      expect(second).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledTimes(1);
      log.mockRestore();
    });

    it('fail() po complete() jest ignorowane (poziom już zaliczony)', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onFail = vi.fn();
      const onComplete = vi.fn();
      startSession(failOptions((c) => (c.complete(), c.fail('późno')), onFail, onComplete));
      await Promise.resolve();
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onFail).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('fail() wołane w mount dociera po zwróceniu sesji', async () => {
      const log = vi.spyOn(console, 'error').mockImplementation(() => {});
      const onFail = vi.fn();
      startSession(failOptions((c) => c.fail('w mount'), onFail));
      expect(onFail).not.toHaveBeenCalled();
      await Promise.resolve();
      expect(onFail).toHaveBeenCalledTimes(1);
      log.mockRestore();
    });
  });

  it('destroy() zapisuje zaległy czas gry', () => {
    startSession(options(() => {})).destroy();
    expect(app.flushPlay).toHaveBeenCalledTimes(1);
  });

  it('wyjątek w mount: sesja sprząta się, zegar i licznik czasu gry stoją', async () => {
    let ctx: GameContext | undefined;
    const onComplete = vi.fn();
    const failing = options((c) => {
      ctx = c;
      c.complete();
      throw new Error('zepsuta gra');
    }, onComplete);
    expect(() => startSession(failing)).toThrow('zepsuta gra');
    expect(stopDriving).toHaveBeenCalled();
    expect(destroyAll).toHaveBeenCalled();
    for (let i = 0; i < 50; i++) (ctx?.clock as ClockController).tick(100);
    expect(app.recordPlay).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
