import type { GameManifest, InputMode } from '../types';
import { hedgehog } from '../art';
import { AREAS, games, visibleGames } from '../registry';
import { buildPath, type Route } from '../router';
import { createFocusGrid } from '../ui/focusGrid';
import { icons } from '../ui/icons';
import { h } from '../util/dom';
import type { App } from './app';
import { createHoldButton } from './holdButton';
import { computeHubLayout, hubStartIndex, type SafeInsets } from './hubLayout';
import { addPressFeedback } from './pressFeedback';

const LAST_GAME_KEY = 'hub:lastGame';

/** Link wewnątrz aplikacji: zwykły <a href>, ale bez przeładowania strony. */
export function appLink(app: App, route: Route, className: string): HTMLAnchorElement {
  const a = h('a', { class: className, href: buildPath(route, app.base) });
  a.addEventListener('click', (event) => {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    app.navigate(route);
  });
  return a;
}

/** Dopisek przy grze, której nie da się grać w bieżącym trybie sterowania; null, gdy gra działa. */
function otherModeNote(manifest: GameManifest, current: InputMode): string | null {
  if (manifest.input.includes(current)) return null;
  return manifest.input.includes('keyboard') ? 'z klawiaturą' : 'na dotyk';
}

/**
 * Kafelek: obrazek na tle w kolorze obszaru i tytuł (widoczny, gdy pozwala układ — hubLayout `titles`).
 * Tytuł, obszar i opis są zawsze w etykiecie dla czytników.
 */
function tile(app: App, manifest: GameManifest, areaTitle: string): HTMLAnchorElement {
  const a = appLink(app, { name: 'game', id: manifest.id }, `mg-tile mg-tile--${manifest.area}`);
  a.dataset.game = manifest.id;

  const iconBox = h('span', { class: 'mg-tile__icon' });
  iconBox.innerHTML = manifest.icon;
  const note = otherModeNote(manifest, app.mode());
  if (note) {
    a.classList.add('mg-tile--other-mode');
    iconBox.append(h('span', { class: 'mg-tile__note' }, note));
  } else {
    // Gra działa w tym trybie: kafelek „wciska się” pod palcem (przygaszony nie udaje wciśnięcia).
    addPressFeedback(a);
  }
  a.append(iconBox, h('span', { class: 'mg-tile__title' }, manifest.title));

  const label = [manifest.title, areaTitle, manifest.description, note && `Gra ${note}`].filter(Boolean);
  a.setAttribute('aria-label', label.join('. '));
  return a;
}

/** Bezpieczne marginesy w px, odczytane z miarki (`.mg-hub__safe-probe` ma je jako padding). */
function readSafeInsets(probe: HTMLElement): SafeInsets {
  const style = getComputedStyle(probe);
  const px = (value: string) => parseFloat(value) || 0;
  return {
    top: px(style.paddingTop),
    right: px(style.paddingRight),
    bottom: px(style.paddingBottom),
    left: px(style.paddingLeft),
  };
}

/** Przekazuje układ z hubLayout do CSS; liczony z bieżącego rozmiaru okna i bezpiecznych marginesów. */
function applyLayout(page: HTMLElement, probe: HTMLElement, count: number): void {
  const width = document.documentElement.clientWidth || window.innerWidth;
  const layout = computeHubLayout(count, width, window.innerHeight, readSafeInsets(probe));
  page.dataset.orientation = layout.orientation;
  page.dataset.titles = String(layout.titles);
  page.style.setProperty('--mg-hub-cols', String(layout.columns));
  page.style.setProperty('--mg-hub-tile', `${layout.tile}px`);
  page.style.setProperty('--mg-hub-header', `${layout.headerHeight}px`);
}

export function renderHub(container: HTMLElement, app: App): () => void {
  app.setTitle();

  // Z-29: wejście do panelu rodzica przez przytrzymanie 2 s, potem bramka z działaniem. Sama ikonka
  // w prawym górnym rogu nagłówka; napis „Dla rodziców” zostaje w etykiecie dla czytników ekranu.
  const parentsBtn = createHoldButton({
    label: 'Dla rodziców',
    content: icons.parents,
    holdMs: 2000,
    className: 'mg-hub__parents',
    onActivate: () => app.navigate({ name: 'parents' }),
  });

  const header = h('header', { class: 'mg-hub__header' });
  const logo = h('span', { class: 'mg-hub__logo' });
  logo.innerHTML = hedgehog();
  const brand = h('div', { class: 'mg-hub__brand' }, [logo, h('h1', { class: 'mg-hub__title' }, 'Miłe Gry')]);
  header.append(brand, parentsBtn.el);

  // Jedna siatka gier widocznych w wieku wybranym przez rodzica: obszarami w kolejności z rejestru,
  // w obszarze według `order` (rejestr już sortuje). Ukryta gra nadal otwiera się pod swoim adresem.
  const shown = visibleGames(games, app.settings.ageGroup);
  const main = h('main', { class: 'mg-hub__main' });
  const grid = h('div', { class: 'mg-hub__grid' });
  const tiles: HTMLAnchorElement[] = [];
  for (const area of AREAS) {
    for (const manifest of shown.filter((g) => g.area === area.id)) {
      const t = tile(app, manifest, area.title);
      tiles.push(t);
      grid.append(t);
    }
  }
  main.append(tiles.length > 0 ? grid : h('p', { class: 'mg-hub__empty' }, 'Tu wkrótce pojawią się gry.'));

  const probe = h('div', { class: 'mg-hub__safe-probe', 'aria-hidden': 'true' });
  const page = h('div', { class: 'mg-hub' }, [header, main, probe]);
  container.append(page);
  // Po wstawieniu do strony — dopiero wtedy miarka ma obliczony styl. Obrót telefonu zmienia
  // marginesy i wywołuje `resize`.
  applyLayout(page, probe, tiles.length);
  const onResize = () => applyLayout(page, probe, tiles.length);
  window.addEventListener('resize', onResize);

  // Klawiatura: strzałki po kafelkach i do „Dla rodziców” (wg położenia na ekranie: z górnego rzędu
  // w górę), Enter otwiera grę albo bramkę. Start: ostatnio grana, a gdy ukryta — pierwszy kafelek.
  const lastGame = app.store.get<string>(LAST_GAME_KEY, '');
  const initial = hubStartIndex(tiles.map((t) => t.dataset.game ?? ''), lastGame);
  const focusGrid = createFocusGrid({
    items: [...tiles, parentsBtn.el],
    initial,
    domFocus: app.mode() === 'keyboard',
    pointer: false,
    onSelect: (_i, el) => el.click(),
  });
  const removeSink = app.inputHub.push({ onIntent: (intent) => void focusGrid.handle(intent) });

  return () => {
    window.removeEventListener('resize', onResize);
    removeSink();
    focusGrid.destroy();
    parentsBtn.destroy();
  };
}

export function rememberLastGame(app: App, id: string): void {
  app.store.set(LAST_GAME_KEY, id);
}
