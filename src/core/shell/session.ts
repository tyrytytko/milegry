import type { GameContext, GameInstance, GameManifest, GameModule, LevelResult } from '../types';
import { createClock, driveClock, TEMPO_SCALE, type ClockController } from '../clock';
import { createGameInput } from '../input/gameInput';
import { createUi } from '../ui';
import { createRng } from '../util/rng';
import type { App } from './app';

export interface SessionOptions {
  app: App;
  module: GameModule;
  manifest: GameManifest;
  level: number;
  skin: string;
  /** Element sceny (ctx.root). */
  root: HTMLElement;
  /** Pas kontrolek obok/pod sceną. */
  dock: HTMLElement;
  onComplete: (result: LevelResult) => void;
  /** Gra zgłosiła ctx.fail(): sesja jest już zniszczona, ramka pokazuje ekran błędu. */
  onFail: () => void;
  onExit: () => void;
  onExitHold: (holding: boolean) => void;
}

export interface Session {
  readonly clock: ClockController;
  destroy(): void;
}

/**
 * Jedno uruchomienie gry na jednym poziomie: buduje GameContext, montuje grę
 * i sprząta wszystko (zegar, wejście, kontrolki, DOM) przy destroy.
 * Gdy `mount` rzuci wyjątek, sesja sprząta się sama i przekazuje wyjątek dalej.
 */
export function startSession(options: SessionOptions): Session {
  const { app, manifest, root, dock } = options;
  const mode = app.mode();
  const settings = { ...app.settings };
  const clock = createClock(TEMPO_SCALE[settings.tempo]);
  const stopDriving = driveClock(clock);
  const input = createGameInput({ hub: app.inputHub, mode, root, onExit: options.onExit, onExitHold: options.onExitHold });
  const reducedMotion = app.reducedMotion();
  const ui = createUi({ input, root, dock, mode, reducedMotion, settings });

  // Czas aktywnej gry do łagodnego końca sesji (Z-25); zegar stoi na pauzie, więc liczy tylko grę.
  const stopPlayTime = clock.every(1000, () => app.recordPlay(1000 / clock.scale));

  /** Pierwsze z complete / fail rozstrzyga rundę. */
  let settled = false;
  let destroyed = false;
  const ctx: GameContext = {
    root,
    manifest,
    level: options.level,
    skin: options.skin,
    settings,
    reducedMotion,
    input,
    audio: app.audio,
    storage: app.store.scope(`game:${manifest.id}`),
    ui,
    clock,
    rng: createRng(),
    complete(result = {}) {
      if (settled || destroyed) return;
      settled = true;
      // Po bieżącym wywołaniu gry: ekran końca nie wchodzi w środek jej kodu (ani w mount).
      queueMicrotask(() => {
        if (!destroyed) options.onComplete(result);
      });
    },
    fail(error) {
      if (settled || destroyed) return;
      settled = true;
      console.error(`[${manifest.id}] gra zgłosiła błąd:`, error);
      // Jak complete: po kodzie gry, nie w jego środku (sprzątanie woła destroy() gry).
      queueMicrotask(() => {
        if (destroyed) return;
        session.destroy();
        options.onFail();
      });
    },
  };

  let instance: GameInstance | null = null;
  const session: Session = {
    clock,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      try {
        instance?.destroy();
      } catch (error) {
        console.error(`[${manifest.id}] błąd w destroy():`, error);
      }
      stopPlayTime();
      app.flushPlay();
      ui.destroyAll();
      input.destroy();
      clock.destroy();
      stopDriving();
      root.replaceChildren();
      dock.replaceChildren();
    },
  };

  try {
    instance = options.module.mount(ctx);
  } catch (error) {
    session.destroy();
    throw error;
  }
  return session;
}
