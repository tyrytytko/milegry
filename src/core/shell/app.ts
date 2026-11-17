import type { InputMode, Settings } from '../types';
import { createAudio, type AudioEngine } from '../audio/audio';
import { applyModeToDocument, createInputHub, detectMode, resolveMode, type InputHub } from '../input/inputHub';
import { findGame, games } from '../registry';
import { createRouter, type Route } from '../router';
import { createStore, getBrowserStorage, type Store } from '../storage/storage';
import { loadSettings, saveSettings } from '../storage/settings';
import { renderGameFrame } from './gameFrame';
import { renderHub } from './hub';
import { renderParents } from './parents';
import { createPlayTime } from './playTime';

const APP_TITLE = 'Miłe Gry';

/** Usługi rdzenia wspólne dla widoków powłoki. */
export interface App {
  readonly base: string;
  readonly store: Store;
  readonly audio: AudioEngine;
  readonly inputHub: InputHub;
  readonly settings: Readonly<Settings>;
  updateSettings(patch: Partial<Settings>): void;
  /** Rozstrzygnięty tryb sterowania. */
  mode(): InputMode;
  /** Co wykryłaby autodetekcja (do panelu rodzica). */
  detectedMode(): InputMode;
  reducedMotion(): boolean;
  navigate(route: Route): void;
  setTitle(title?: string): void;
  /** Dolicza czas aktywnej gry (ms); na dysk trafia rzadko, resztę zapisuje flushPlay. */
  recordPlay(ms: number): void;
  /** Zapisuje zaległy czas gry (koniec rundy, wyjście z gry, ukrycie karty). */
  flushPlay(): void;
  /** Czy minął limit sesji (sprawdzane tylko między rundami). */
  sessionOver(): boolean;
  /** Naliczony czas gry bieżącej sesji w ms (0 po półgodzinnej przerwie albo po resecie). */
  sessionPlayedMs(): number;
  /** Rodzic zaczyna sesję od nowa. */
  resetSession(): void;
}

export function startApp(container: HTMLElement, base: string): void {
  const store = createStore(getBrowserStorage());
  let settings = loadSettings(store);
  const audio = createAudio({ muted: settings.muted, effectsVolume: settings.effectsVolume });
  const inputHub = createInputHub();
  inputHub.onGesture(() => audio.unlock());

  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const playTime = createPlayTime(store);
  let cleanupView: (() => void) | null = null;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) playTime.flush();
  });
  window.addEventListener('pagehide', playTime.flush);

  // Blokada menu kontekstowego (długie przytrzymanie na dotyku) poza polami formularzy.
  document.addEventListener('contextmenu', (event) => {
    if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
  });

  const app: App = {
    base,
    store,
    audio,
    inputHub,
    get settings() {
      return settings;
    },
    updateSettings(patch) {
      settings = { ...settings, ...patch };
      saveSettings(store, settings);
      audio.configure({ muted: settings.muted, effectsVolume: settings.effectsVolume });
      applyModeToDocument(app.mode());
    },
    mode: () => resolveMode(settings.inputMode),
    detectedMode: detectMode,
    reducedMotion: () => motionQuery?.matches ?? false,
    navigate: (route) => router.navigate(route),
    setTitle(title) {
      document.title = title ? `${title} — ${APP_TITLE}` : APP_TITLE;
    },
    recordPlay: (ms) => playTime.record(ms, Date.now()),
    flushPlay: playTime.flush,
    sessionOver: () => playTime.isOver(settings.sessionLimit, Date.now()),
    sessionPlayedMs: () => playTime.elapsedMs(Date.now()),
    resetSession: playTime.reset,
  };

  applyModeToDocument(app.mode());

  const show = (route: Route) => {
    cleanupView?.();
    cleanupView = null;
    container.replaceChildren();
    window.scrollTo(0, 0);
    if (route.name === 'game') {
      const manifest = findGame(route.id);
      if (manifest) {
        cleanupView = renderGameFrame(container, app, manifest);
        return;
      }
    }
    if (route.name === 'parents') {
      cleanupView = renderParents(container, app);
      return;
    }
    cleanupView = renderHub(container, app);
  };

  const router = createRouter(base, (id) => games.some((g) => g.id === id), show);
  show(router.current);
}
