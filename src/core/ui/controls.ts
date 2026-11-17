import type { Cancel, Control, Direction, Intent, LetterKeysControl, Ui } from '../types';
import { h } from '../util/dom';
import { normalizeLetter } from '../util/letters';
import type { UiContext } from './context';
import { icons } from './icons';
import { letterElement } from './letters';

export function createControls({ deps, track }: UiContext): Pick<Ui, 'numPad' | 'dPad' | 'letterKeys'> {
  const { input, dock } = deps;
  /** Wciśnięty klawisz kontrolki (liczy się tylko pierwszy palec, więc najwyżej jeden). */
  let held: { btn: HTMLElement; release: () => void } | null = null;

  /** Puszcza wciśnięty klawisz, jeśli leży w `el` (kontrolka znika albo się chowa). */
  function releaseWithin(el: HTMLElement): void {
    if (held && el.contains(held.btn)) held.release();
  }

  /**
   * Przycisk kontrolki: emituje intencję na pointerdown (bez opóźnienia i bez kradzieży fokusu).
   * Przytrzymany przycisk ruchu powtarza ruch przez input.repeatMove (gdy gra włączyła powtarzanie).
   */
  function controlButton(label: string, content: string, intent: Intent, extraClass = ''): HTMLButtonElement {
    const btn = h('button', { type: 'button', class: `mg-key ${extraClass}`.trim(), 'aria-label': label, tabindex: -1 });
    btn.innerHTML = content;
    btn.addEventListener('pointerdown', (event) => {
      if (!event.isPrimary || event.button > 0) return;
      event.preventDefault();
      held?.release();
      btn.classList.add('mg-pressed');
      btn.setPointerCapture?.(event.pointerId);
      let stopRepeat: Cancel | null = null;
      const entry = {
        btn,
        release: () => {
          if (held !== entry) return;
          held = null;
          btn.classList.remove('mg-pressed');
          stopRepeat?.();
        },
      };
      held = entry;
      input.emit(intent);
      // Gra mogła w reakcji na intencję schować albo zniszczyć kontrolkę.
      if (held === entry && intent.type === 'move') stopRepeat = input.repeatMove(intent.dir);
    });
    const release = () => {
      if (held?.btn === btn) held.release();
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('lostpointercapture', release);
    return btn;
  }

  function makeControl(el: HTMLElement): Control {
    dock.append(el);
    const destroy = track(() => {
      releaseWithin(el);
      el.remove();
    });
    return {
      el,
      show: () => {
        el.hidden = false;
      },
      hide: () => {
        releaseWithin(el);
        el.hidden = true;
      },
      destroy,
    };
  }

  return {
    numPad(options = {}) {
      const digits = options.digits ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
      const el = h('div', { class: 'mg-numpad', role: 'group', 'aria-label': 'Cyfry' });
      // Układ telefonu 3 × 4 (tylko domyślne cyfry): zero w ostatnim rzędzie pośrodku, „cofnij” po lewej, „OK” po prawej.
      const standard = options.digits === undefined;
      for (const d of digits) {
        const extra = standard && d === 0 ? 'mg-numpad__zero' : '';
        el.append(controlButton(String(d), `<span class="mg-key__digit">${d}</span>`, { type: 'digit', value: d }, extra));
      }
      if (options.erase) {
        const place = standard ? ' mg-numpad__erase' : '';
        el.append(controlButton('Cofnij', icons.erase, { type: 'erase' }, `mg-key--soft${place}`));
      }
      if (options.confirm) {
        const place = standard ? ' mg-numpad__ok' : '';
        el.append(controlButton('Gotowe', icons.check, { type: 'confirm' }, `mg-key--primary${place}`));
      }
      return makeControl(el);
    },

    dPad(options = {}) {
      const el = h('div', { class: 'mg-dpad', role: 'group', 'aria-label': 'Strzałki' });
      const dirs: { dir: Direction; label: string }[] = [
        { dir: 'up', label: 'W górę' },
        { dir: 'left', label: 'W lewo' },
        { dir: 'right', label: 'W prawo' },
        { dir: 'down', label: 'W dół' },
      ];
      for (const { dir, label } of dirs) {
        el.append(controlButton(label, icons[dir], { type: 'move', dir }, `mg-dpad__${dir}`));
      }
      if (options.confirm) el.append(controlButton('OK', icons.check, { type: 'confirm' }, 'mg-dpad__ok mg-key--primary'));
      return makeControl(el);
    },

    letterKeys(letters) {
      const el = h('div', { class: 'mg-letterkeys', role: 'group', 'aria-label': 'Litery' });
      // Klawisze ekranowe zawsze drukowane (odwzorowują klawiaturę), wielkość wg ustawienia rodzica.
      const render = (list: string[]) => {
        releaseWithin(el);
        el.replaceChildren(
          ...list.map((letter) => {
            const btn = controlButton(letter, '', { type: 'letter', value: normalizeLetter(letter) });
            btn.append(letterElement(letter, 'print', deps.settings.letterCase));
            return btn;
          }),
        );
      };
      render(letters);
      const control = makeControl(el);
      const result: LetterKeysControl = { ...control, setLetters: render };
      return result;
    },
  };
}
