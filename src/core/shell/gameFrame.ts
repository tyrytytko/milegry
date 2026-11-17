import type { GameManifest, GameModule, LevelResult } from '../types';
import { hedgehog } from '../art';
import { loadGame } from '../registry';
import { loadProgress, markCompleted, saveProgress, type GameProgress } from '../storage/progress';
import { loadLetterFonts } from '../ui';
import { icons } from '../ui/icons';
import { h } from '../util/dom';
import type { App } from './app';
import { errorScreen, openCompleteScreen, openSleepScreen, type EndScreenHost } from './endScreens';
import { createHoldButton } from './holdButton';
import { rememberLastGame } from './hub';
import { nextLevel, startFromQuery } from './levels';
import { openLevelPicker, openSkinPicker } from './pickers';
import { startSession, type Session } from './session';
import type { Sheet } from './sheet';

/** Zdejmuje fokus z przycisków ramki, żeby Spacja/Enter trafiały do gry. */
function blurActive(): void {
  const active = document.activeElement;
  if (active instanceof HTMLElement) active.blur();
}

/**
 * Ramka gry: pasek, ładowanie modułu i cykl rund (start → koniec rundy → jeszcze raz / dalej).
 * Okna (wybieraki, ekrany końca) pauzują zegar gry i wyłączają ekran pod spodem.
 */
export function renderGameFrame(container: HTMLElement, app: App, manifest: GameManifest): () => void {
  app.setTitle(manifest.title);
  rememberLastGame(app, manifest.id);

  let progress: GameProgress = loadProgress(app.store, manifest);
  // Adres z poziomem/obrazkami (?poziom=5&obrazki=…) wygrywa z zapisem, ale pierwszy start niczego nie zapisuje.
  const fromUrl = startFromQuery(window.location.search, manifest);
  let level = fromUrl.level ?? progress.lastLevel;
  let skin = fromUrl.skin ?? progress.lastSkin;
  let persistStart = fromUrl.level === undefined && fromUrl.skin === undefined;
  let module: GameModule | null = null;
  let session: Session | null = null;
  let sheet: Sheet | null = null;
  let disposed = false;

  const goHome = () => app.navigate({ name: 'hub' });

  // --- Pasek górny: domek (lewy róg), a po załadowaniu gry wybór poziomu i obrazków ---
  const home = createHoldButton({ label: 'Do domu', content: icons.home, className: 'mg-bar__home', onActivate: goHome });
  const levelBtn = h('button', { type: 'button', class: 'mg-btn mg-bar__level' });
  const skinBtn = h('button', { type: 'button', class: 'mg-btn mg-bar__skin' });
  const pickers = [
    manifest.levels > 0 ? levelBtn : null,
    manifest.skins && manifest.skins.length > 1 ? skinBtn : null,
  ].filter((b): b is HTMLButtonElement => b !== null);
  const bar = h('header', { class: 'mg-bar' }, [
    home.el,
    h('h1', { class: 'mg-bar__title' }, manifest.title),
    h('span', { class: 'mg-bar__spacer' }),
  ]);

  const stage = h('main', { class: 'mg-stage' });
  const dock = h('div', { class: 'mg-dock' });
  const pause = h('div', { class: 'mg-pause', 'aria-hidden': 'true' });
  pause.innerHTML = hedgehog({ size: 120, sleeping: true });
  const frame = h('div', { class: `mg-frame mg-frame--${manifest.id}` }, [bar, stage, dock, pause]);
  container.append(frame);
  document.documentElement.classList.add('mg-in-game');

  // Pauza przy utracie fokusu okna (zegar gry pauzuje sam; tu tylko spokojna plansza).
  const onBlur = () => frame.classList.add('mg-frame--paused');
  const onFocus = () => frame.classList.remove('mg-frame--paused');
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);

  // Gdy nie ma gry (ładowanie, ekran błędu), przytrzymany Escape też wraca do domu.
  let removeIdleSink: (() => void) | null = null;
  const releaseIdleSink = () => {
    removeIdleSink?.();
    removeIdleSink = null;
  };
  const holdIdleSink = () => {
    releaseIdleSink();
    removeIdleSink = app.inputHub.push({ onIntent: () => {}, exitMode: 'hold', onExit: goHome, onExitHold: home.showHolding });
  };

  function updateBar(): void {
    levelBtn.innerHTML = `${icons.levels}<span class="mg-bar__level-num">${level}</span>`;
    levelBtn.setAttribute('aria-label', `Poziom ${level} — wybierz poziom`);
    const current = manifest.skins?.find((s) => s.id === skin);
    skinBtn.innerHTML = current?.icon ?? '';
    skinBtn.append(h('span', { class: current?.icon ? 'mg-visually-hidden' : '' }, current?.title ?? ''));
    skinBtn.setAttribute('aria-label', `Obrazki: ${current?.title ?? ''} — zmień`);
  }

  // --- Okna: jedno naraz; pod spodem zegar stoi, a pasek i scena są niedostępne (także dla Tab) ---
  const underlay = [bar, stage, dock];
  function openOverlay(make: () => Sheet): void {
    sheet?.close();
    session?.clock.pause('overlay');
    underlay.forEach((el) => (el.inert = true));
    sheet = make();
  }

  function closedOverlay(): void {
    sheet = null;
    session?.clock.resume('overlay');
    underlay.forEach((el) => (el.inert = false));
    blurActive();
  }

  const endHost: EndScreenHost = { frame, app, goHome, onExitHold: home.showHolding, onClose: closedOverlay };
  const showSleep = () => openOverlay(() => openSleepScreen(endHost));

  function showError(): void {
    const screen = errorScreen(goHome);
    stage.replaceChildren(screen.el);
    screen.focus();
    holdIdleSink();
  }

  // --- Runda ---
  function restart(): void {
    if (disposed || !module) return;
    releaseIdleSink();
    session?.destroy();
    session = null;
    sheet?.close();
    stage.replaceChildren();
    if (app.sessionOver()) return showSleep();
    const root = h('div', { class: `mg-game-root g-${manifest.id}`, 'data-skin': skin || null });
    stage.append(root);
    progress = { ...progress, lastLevel: level, lastSkin: skin };
    if (persistStart) saveProgress(app.store, manifest.id, progress);
    persistStart = true;
    updateBar();
    blurActive();
    try {
      session = startSession({
        app,
        module,
        manifest,
        level,
        skin,
        root,
        dock,
        onComplete: showComplete,
        onFail: () => {
          if (disposed) return;
          sheet?.close();
          showError();
        },
        onExit: goHome,
        onExitHold: home.showHolding,
      });
    } catch (error) {
      console.error(`[${manifest.id}] błąd przy uruchamianiu gry:`, error);
      showError();
    }
  }

  // Gra zostaje pod oknem (zegar stoi); sesję niszczy dopiero następna runda albo wyjście.
  function showComplete(result: LevelResult): void {
    if (disposed) return;
    app.flushPlay();
    progress = markCompleted(progress, level, manifest.levels);
    saveProgress(app.store, manifest.id, progress);
    // Limit sesji nie przerywa nagrody (Z-20): sen pokazuje dopiero restart() po „Jeszcze raz”/„Dalej” (Z-25).
    app.audio.play('win');
    const target = nextLevel(manifest, level, app.mode());
    const next =
      target === null
        ? null
        : () => {
            level = target;
            restart();
          };
    openOverlay(() => openCompleteScreen(endHost, result, restart, next));
  }

  levelBtn.addEventListener('click', () =>
    openOverlay(() =>
      openLevelPicker(
        frame,
        app,
        manifest,
        level,
        progress.completed,
        (n) => {
          level = n;
          restart();
        },
        closedOverlay,
      ),
    ),
  );

  skinBtn.addEventListener('click', () =>
    openOverlay(() =>
      openSkinPicker(
        frame,
        app,
        manifest.skins ?? [],
        skin,
        (id) => {
          skin = id;
          restart();
        },
        closedOverlay,
      ),
    ),
  );

  // --- Ładowanie modułu gry (i krojów liter przed startem, żeby nie mignął krój zastępczy) ---
  updateBar();
  const loading = h('div', { class: 'mg-loading', 'aria-label': 'Ładowanie' });
  loading.innerHTML = hedgehog({ size: 96 });
  stage.append(loading);
  holdIdleSink();

  Promise.all([loadGame(manifest.id), loadLetterFonts(app.settings.letterScript !== 'print')]).then(
    ([loaded]) => {
      if (disposed) return;
      module = loaded;
      bar.append(...pickers);
      restart();
    },
    (error: unknown) => {
      console.error(`[${manifest.id}] nie udało się załadować gry:`, error);
      if (!disposed) showError();
    },
  );

  return () => {
    disposed = true;
    releaseIdleSink();
    home.destroy();
    sheet?.close();
    session?.destroy();
    session = null;
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    document.documentElement.classList.remove('mg-in-game');
  };
}
