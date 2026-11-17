/**
 * createCodeEntry — wpisywanie odpowiedzi cyframi ('7', '10', kod bramy '4271') razem z trenerem.
 * Używa go runRound (wariant `digits`) i gra z własną pętlą (brama w labiryncie). Opis API: index.ts.
 */
import type { Control, GameContext } from '../types';
import { h } from '../util/dom';
import { createCodeBuffer } from './codeBuffer';
import { LOCK_MS } from './coachCore';
import type { Coach, CodeEntry, CodeEntryOptions } from './index';

export function createCodeEntry(ctx: GameContext, coach: Coach, options: CodeEntryOptions): CodeEntry {
  const code = String(options.code);
  const buffer = createCodeBuffer(code);
  // Sprawdzane w każdym trybie: na klawiaturze błąd byłby niewidoczny, a na dotyku zadanie nie do zrobienia.
  const { keys } = options;
  const missing = keys && [...code].find((digit) => !keys.includes(Number(digit)));
  if (missing) throw new Error(`Odpowiedzi „${code}” nie da się wpisać na dotyku: cyfry ${missing} nie ma w keys [${keys}]`);
  // Kratki tworzone raz — zmienia się tylko ich tekst, więc podpowiedź dołożona do pola zostaje.
  const slots = Array.from(code, () => h('span', { class: 'mg-code__slot' }));
  const field = h('span', { class: 'mg-code', 'data-length': code.length, role: 'img', 'aria-label': 'Wpisane cyfry' }, slots);
  // Dotyk: klawiatura numeryczna; „cofnij” tylko przy kodach dłuższych niż 1 cyfra.
  const pad: Control | null =
    ctx.input.mode === 'touch' ? ctx.ui.numPad({ digits: options.keys, erase: code.length > 1 }) : null;
  let active = true;
  let cancelClear = () => {};

  const renderField = () => slots.forEach((slot, i) => (slot.textContent = buffer.typed.charAt(i)));

  /**
   * Podpowiedź zawsze wskazuje klawisz do naciśnięcia teraz: klawisz ekranowy (dotyk) albo klawisz nad polem.
   * Gdy wpisane cyfry już się nie zgadzają z kodem — „Cofnij” (Backspace), a nie dalszą cyfrę złego kodu.
   */
  const updateCoach = (next = code.startsWith(buffer.typed) ? buffer.next || code.charAt(0) : 'Cofnij') => {
    const keys = pad ? (Array.from(pad.el.children) as HTMLElement[]) : [];
    const key = keys.find((el) => el.getAttribute('aria-label') === next);
    coach.setTask({ key: options.key, target: key ?? field, hintKey: next === 'Cofnij' ? '⌫' : next, question: options.question });
  };

  const stopListening = ctx.input.on((intent) => {
    if (!active || coach.locked) return;
    if (intent.type === 'erase') {
      buffer.erase();
      renderField();
      updateCoach();
      return;
    }
    if (intent.type !== 'digit') return;
    const verdict = buffer.press(intent.value);
    if (verdict === 'ignored') return;
    renderField();
    if (verdict === 'typing') return updateCoach();
    if (verdict === 'right') {
      coach.success();
      return options.onAnswer('right');
    }
    updateCoach(code.charAt(0)); // po błędzie wpisujemy od początku — tam celuje podpowiedź
    const outcome = coach.miss(field);
    if (outcome === 'together') {
      // Z-19, 3. szczebel: pole pokazuje poprawny kod.
      buffer.clear();
      for (const digit of code) buffer.press(Number(digit));
      renderField();
    } else {
      // Błędne cyfry widać, póki pole się kołysze; pole czyści się, gdy mija blokada po błędzie.
      cancelClear = ctx.clock.after(LOCK_MS, () => {
        buffer.clear();
        renderField();
        updateCoach();
      });
    }
    options.onAnswer(outcome);
  });

  updateCoach();

  const stop = () => {
    if (!active) return;
    active = false;
    stopListening();
    cancelClear();
    if (buffer.typed !== code) {
      buffer.clear();
      renderField();
    }
  };

  return {
    field,
    stop,
    destroy() {
      stop();
      pad?.destroy();
    },
  };
}
