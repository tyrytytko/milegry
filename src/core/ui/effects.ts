import type { CelebrateOptions, Hint, HintOptions, Ui } from '../types';
import { leaf, type LeafTone } from '../art';
import { createRng } from '../util/rng';
import { h } from '../util/dom';
import type { UiContext } from './context';
import { icons } from './icons';

/** Z-04: najwyżej tyle listków naraz. */
const MAX_CELEBRATE_PIECES = 12;
/** Miejsce na klawisz-podpowiedź obok celu (ui.css: klawisz 60 px + odstęp 12 px). */
const KEY_HINT_ROOM = 72;

export function createEffects({ deps, track }: UiContext): Pick<Ui, 'celebrate' | 'wobble' | 'hint'> {
  const { root } = deps;
  const effectsRng = createRng();
  let stopCelebrate: (() => void) | null = null;
  const wobbling = new WeakMap<HTMLElement, () => void>();

  return {
    celebrate(options: CelebrateOptions = {}) {
      stopCelebrate?.();
      const rootRect = root.getBoundingClientRect();
      let x = rootRect.width / 2;
      let y = rootRect.height / 2;
      if (options.at instanceof HTMLElement) {
        const r = options.at.getBoundingClientRect();
        x = r.left + r.width / 2 - rootRect.left;
        y = r.top + r.height / 2 - rootRect.top;
      } else if (options.at) {
        x = options.at.x;
        y = options.at.y;
      }
      const requested = options.count ?? 6;
      const count = Number.isFinite(requested) ? Math.max(1, Math.min(MAX_CELEBRATE_PIECES, Math.round(requested))) : 6;
      const tones: LeafTone[] = ['sage', 'ochre', 'rose', 'brown'];
      const layer = h('div', { class: 'mg-celebrate', 'aria-hidden': 'true' });
      layer.style.left = `${x}px`;
      layer.style.top = `${y}px`;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + effectsRng.next() * 0.6;
        const distance = deps.reducedMotion ? 0 : 50 + effectsRng.next() * 40;
        const piece = h('span', { class: 'mg-celebrate__piece' });
        piece.innerHTML = leaf({ tone: tones[i % tones.length], rotate: effectsRng.int(0, 359) });
        piece.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        piece.style.setProperty('--dy', `${Math.sin(angle) * distance - 30}px`);
        layer.append(piece);
      }
      root.append(layer);
      let landed = () => {};
      const done = new Promise<void>((resolve) => (landed = resolve));
      const remove = track(() => {
        layer.remove();
        landed();
      });
      stopCelebrate = remove;
      // Czas trwania zna tylko CSS: warstwa znika, gdy wszystkie listki skończą lot.
      let flying = count;
      layer.addEventListener('animationend', () => {
        if (--flying === 0) remove();
      });
      return done;
    },

    wobble(el: HTMLElement) {
      wobbling.get(el)?.();
      void el.offsetWidth; // ponowne wywołanie zaczyna animację od nowa
      el.classList.add('mg-wobble');
      const onEnd = (event: AnimationEvent) => {
        if (event.target === el && event.animationName.startsWith('mg-wobble')) stop();
      };
      const stop = track(() => {
        wobbling.delete(el);
        el.removeEventListener('animationend', onEnd);
        el.classList.remove('mg-wobble');
      });
      wobbling.set(el, stop);
      el.addEventListener('animationend', onEnd);
    },

    hint(options: HintOptions): Hint {
      const kind = options.kind ?? 'auto';
      const showKey = kind === 'key' || (kind === 'auto' && deps.mode === 'keyboard' && options.key !== undefined);
      const variant = kind === 'glow' ? 'glow' : showKey ? 'key' : 'tap';
      const el = h('span', { class: `mg-hint mg-hint--${variant}`, 'aria-hidden': 'true' });
      if (variant === 'key') {
        el.append(h('span', { class: 'mg-hint__key' }, options.key ?? ''));
        const place = keyPlacement(options.target);
        if (place) el.classList.add(`mg-hint--${place}`);
      } else if (variant === 'tap') {
        el.innerHTML = `<span class="mg-hint__ring"></span>${icons.touch}`;
      }
      options.target.append(el);
      const hide = track(() => el.remove());
      return { hide };
    },
  };

  /** Klawisz stoi nad celem (pole kodu: z prawej); gdy tam wyszedłby poza scenę — pod celem, a w ostateczności na nim. */
  function keyPlacement(target: HTMLElement): 'below' | 'on' | null {
    const scene = root.getBoundingClientRect();
    if (scene.height === 0) return null; // scena jeszcze bez układu: zostaje domyślne miejsce
    const t = target.getBoundingClientRect();
    const usual = target.classList.contains('mg-code') ? scene.right - t.right : t.top - scene.top;
    if (usual >= KEY_HINT_ROOM) return null;
    return scene.bottom - t.bottom >= KEY_HINT_ROOM ? 'below' : 'on';
  }
}
