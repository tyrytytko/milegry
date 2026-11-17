import type { GameManifest, GameSkin } from '../types';
import { leaf } from '../art';
import { h } from '../util/dom';
import type { App } from './app';
import { openSheet, type Sheet } from './sheet';

/** Wybór poziomu (Z-39: każdy poziom dostępny). Znaczki: liść = ukończony, romb = trudniejszy. */
export function openLevelPicker(
  frame: HTMLElement,
  app: App,
  manifest: GameManifest,
  current: number,
  completed: readonly number[],
  onPick: (level: number) => void,
  onClose: () => void,
): Sheet {
  const hard = new Set(manifest.hardLevels?.[app.mode()] ?? []);
  const items: HTMLButtonElement[] = [];
  for (let n = 1; n <= manifest.levels; n++) {
    const done = completed.includes(n);
    const b = h('button', {
      type: 'button',
      class: `mg-level${n === current ? ' mg-level--current' : ''}`,
      'aria-label': `Poziom ${n}${done ? ', ukończony' : ''}${hard.has(n) ? ', trudniejszy' : ''}`,
    });
    b.append(h('span', { class: 'mg-level__num' }, n));
    if (done) {
      const mark = h('span', { class: 'mg-level__done', 'aria-hidden': 'true' });
      mark.innerHTML = leaf({ tone: 'sage' });
      b.append(mark);
    }
    if (hard.has(n)) b.append(h('span', { class: 'mg-level__hard', 'aria-hidden': 'true' }));
    b.addEventListener('click', () => onPick(n));
    items.push(b);
  }
  return openSheet(frame, app.inputHub, {
    title: 'Wybierz poziom',
    content: h('div', { class: 'mg-levels' }, items),
    focusItems: items,
    initial: current - 1,
    onClose,
  });
}

/** Wybór obrazków (skórki). */
export function openSkinPicker(
  frame: HTMLElement,
  app: App,
  skins: readonly GameSkin[],
  current: string,
  onPick: (skin: string) => void,
  onClose: () => void,
): Sheet {
  const items = skins.map((s) => {
    const b = h('button', {
      type: 'button',
      class: `mg-skin${s.id === current ? ' mg-skin--current' : ''}`,
      'aria-pressed': s.id === current ? 'true' : 'false',
    });
    if (s.icon) {
      const ic = h('span', { class: 'mg-skin__icon' });
      ic.innerHTML = s.icon;
      b.append(ic);
    }
    b.append(h('span', { class: 'mg-skin__title' }, s.title));
    b.addEventListener('click', () => onPick(s.id));
    return b;
  });
  return openSheet(frame, app.inputHub, {
    title: 'Wybierz obrazki',
    content: h('div', { class: 'mg-skins' }, items),
    focusItems: items,
    initial: Math.max(0, skins.findIndex((s) => s.id === current)),
    onClose,
  });
}
