import type { LevelResult } from '../types';
import { hedgehog, leaf } from '../art';
import { icons } from '../ui/icons';
import { h } from '../util/dom';
import type { App } from './app';
import { openSheet, type Sheet } from './sheet';

/** To, czego ekrany końca potrzebują od ramki gry. */
export interface EndScreenHost {
  frame: HTMLElement;
  app: App;
  goHome(): void;
  /** Pierścień domku w pasku podczas przytrzymania Escape. */
  onExitHold(holding: boolean): void;
  onClose(): void;
}

/** Duży przycisk-ikona (tekst tylko dla czytników ekranu). */
function bigIconButton(label: string, icon: string, primary: boolean, action: () => void): HTMLButtonElement {
  const b = h('button', {
    type: 'button',
    class: `mg-btn mg-bigicon${primary ? ' mg-btn--primary' : ''}`,
    'aria-label': label,
    title: label,
  });
  b.innerHTML = icon;
  b.addEventListener('click', action);
  return b;
}

const actions = (buttons: HTMLButtonElement[]) => h('div', { class: 'mg-complete__actions' }, buttons);

function sleepingHedgehog(): HTMLElement {
  const hero = h('div', { 'aria-hidden': 'true' });
  hero.innerHTML = hedgehog({ size: 160, sleeping: true });
  return hero;
}

/** Okno końca: bez zamykania, wyjście z gry tylko przyciskiem albo przytrzymanym Escape. */
function openEndSheet(
  host: EndScreenHost,
  title: string,
  className: string,
  content: HTMLElement,
  buttons: HTMLButtonElement[],
  initial = 0,
): Sheet {
  return openSheet(host.frame, host.app.inputHub, {
    title,
    content,
    focusItems: buttons,
    initial,
    closable: false,
    exitMode: 'hold',
    onExit: host.goHome,
    onExitHold: host.onExitHold,
    className,
    onClose: host.onClose,
  });
}

/** Łagodny koniec sesji (Z-25): tylko między rundami. */
export function openSleepScreen(host: EndScreenHost): Sheet {
  const homeBtn = bigIconButton('Do domu', icons.home, true, host.goHome);
  const content = h('div', { class: 'mg-sleep' }, [
    sleepingHedgehog(),
    h('p', { class: 'mg-sleep__note' }, 'Czas na przerwę. Limit ustawia rodzic w panelu „Dla rodziców”.'),
    actions([homeBtn]),
  ]);
  return openEndSheet(host, 'Jeżyk idzie spać', 'mg-sheet__panel--sleep', content, [homeBtn]);
}

/** Ekran końca rundy: animacja ≤ 1,5 s (Z-04; czasy w endScreens.css), trzy duże ikony, nic nie startuje samo. */
export function openCompleteScreen(
  host: EndScreenHost,
  result: LevelResult,
  again: () => void,
  next: (() => void) | null,
): Sheet {
  const buttons = [
    bigIconButton('Jeszcze raz', icons.again, !next, again),
    next ? bigIconButton('Dalej', icons.next, true, next) : null,
    bigIconButton('Do domu', icons.home, false, host.goHome),
  ].filter((b): b is HTMLButtonElement => b !== null);

  const hero = h('div', { class: 'mg-complete__hero', 'aria-hidden': 'true' });
  const hog = h('span', { class: 'mg-complete__hog' });
  hog.innerHTML = hedgehog({ size: 120 });
  hero.append(hog);
  if (result.icon) {
    const buddy = h('span', { class: 'mg-complete__buddy' });
    buddy.innerHTML = result.icon;
    hero.append(buddy);
  }

  const falling = h('div', { class: 'mg-complete__leaves', 'aria-hidden': 'true' });
  if (!host.app.reducedMotion()) {
    const tones = ['sage', 'ochre', 'rose', 'brown'] as const;
    for (let i = 0; i < 6; i++) {
      const piece = h('span', { class: 'mg-complete__leaf' });
      piece.style.setProperty('--x', `${8 + i * 16}%`);
      piece.style.setProperty('--delay', `${(i % 3) * 0.25}s`);
      piece.innerHTML = leaf({ tone: tones[i % tones.length], rotate: i * 50 });
      falling.append(piece);
    }
  }

  const content = h('div', { class: 'mg-complete' }, [falling, hero, actions(buttons)]);
  return openEndSheet(host, 'Brawo!', 'mg-sheet__panel--complete', content, buttons, next ? 1 : 0);
}

/**
 * Spokojny ekran na scenie, gdy gry nie da się otworzyć: śpiący jeżyk i duży domek.
 * Po wstawieniu do DOM wywołaj `focus()` — jak na ekranach końca ramka stoi na domku, Enter/Spacja go wybiera.
 */
export function errorScreen(goHome: () => void): { el: HTMLElement; focus(): void } {
  const retry = h('button', { type: 'button', class: 'mg-btn mg-btn--quiet' }, 'Spróbuj jeszcze raz');
  retry.addEventListener('click', () => window.location.reload());
  const homeBtn = bigIconButton('Do domu', icons.home, true, goHome);
  homeBtn.classList.add('mg-focused');
  const el = h('div', { class: 'mg-error' }, [
    sleepingHedgehog(),
    actions([homeBtn]),
    h('p', { class: 'mg-sleep__note' }, 'Nie udało się otworzyć gry.'),
    retry,
  ]);
  return { el, focus: () => homeBtn.focus({ preventScroll: true }) };
}
