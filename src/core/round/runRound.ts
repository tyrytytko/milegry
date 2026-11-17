/**
 * runRound — runda „rozwiąż N zadań po kolei”, zbudowana na createCoach. Gra podaje dane i scenę
 * (RoundSpec), tu dzieje się reszta: kolejka, odpowiedzi (focusGrid / cyfry / litera), kontrolki
 * dotykowe, pauza między zadaniami, powrót zadania po „zróbmy razem”, koniec rundy. Opis API: index.ts.
 */
import type { FocusGrid, GameContext, GameInstance, Hint, HintOptions, LetterKeysControl } from '../types';
import { normalizeLetter } from '../util/letters';
import { createCoach } from './coach';
import { createCodeEntry } from './codeEntry';
import type { CodeEntry, LetterView, MissOutcome, RoundSpec, TaskView } from './index';
import { createTaskQueue } from './queue';

export { NEXT_TASK_MS } from './coach';

/**
 * Dostępność elementu wyboru bez pracy autora: rola przycisku, a gdy element nie ma żadnej nazwy
 * (np. sam obrazek SVG) — zastępcza „Odpowiedź N”. Nazw nadanych przez grę nie ruszamy.
 */
function nameChoice(el: HTMLElement, index: number): void {
  if (!el.getAttribute('role')) el.setAttribute('role', 'button');
  const named =
    el.getAttribute('aria-label') ||
    el.getAttribute('aria-labelledby') ||
    el.textContent?.trim() ||
    el.querySelector('[aria-label]');
  if (!named) el.setAttribute('aria-label', `Odpowiedź ${index + 1}`);
}

/** `letters` z ChooseView: jedna litera na element, bez powtórzeń — inaczej któregoś elementu nie da się wybrać. */
function checkLetters(letters: string[], count: number): void {
  if (letters.length !== count) throw new Error(`letters ma ${letters.length} wpis(y), a choose ${count} element(y)`);
  const seen = new Set<string>();
  for (const l of letters) {
    const label = normalizeLetter(l);
    if (Array.from(l).length !== 1) throw new Error(`letters: „${l}” to nie jedna litera`);
    if (seen.has(label)) throw new Error(`letters: litera „${l}” powtarza się [${letters}]`);
    seen.add(label);
  }
}

export function runRound<T, S = void>(ctx: GameContext, spec: RoundSpec<T, S>): GameInstance {
  const coach = createCoach(ctx);
  let queue = createTaskQueue<T>([]);
  /** Miejsca stałej sceny (wynik spec.scene) — przekazywane do każdego show. */
  let places = undefined as S;
  let view: TaskView | null = null;
  let grid: FocusGrid | null = null;
  /** Odpowiedź cyframi bieżącego zadania (pole + klawiatura numeryczna na dotyku). */
  let entry: CodeEntry | null = null;
  /** Przyciski z literami (dotyk) — jedne na rundę, póki zestaw liter ten sam. */
  let letterPad: { id: string; control: LetterKeysControl } | null = null;
  /** Gdzie pokazać właściwy klawisz przy „zróbmy razem” w wariancie litery. */
  let letterAnswer: HintOptions | null = null;
  let reveal: Hint | null = null;
  /** Pauza między zadaniami: odpowiedzi się nie liczą. */
  let busy = true;
  let shownCount = 0;
  let destroyed = false;
  let cancelNext = () => {};

  const answer = (correct: boolean, wrongEl?: HTMLElement) => {
    if (busy || !view || coach.locked) return;
    if (correct) coach.success();
    settle(correct ? 'right' : coach.miss(wrongEl ?? view.question));
  };

  /** Ocena już zapadła (trener zna wynik): dobrze albo „zróbmy razem” kończą zadanie. */
  const settle = (outcome: 'right' | MissOutcome) => {
    if (busy || !view || (outcome !== 'right' && outcome !== 'together')) return;
    if (outcome === 'right') ctx.audio.play('good');
    else {
      // Z-19, 3. szczebel: rozwiązanie pokazuje rdzeń i scena, zadanie wraca raz na koniec rundy.
      queue.requeue();
      if ('choose' in view) grid?.focus(view.correct);
    }
    try {
      view.solved?.();
    } catch (error) {
      console.error('[runRound] błąd w solved():', error);
    }
    advance();
    if (outcome === 'together' && letterAnswer) reveal = ctx.ui.hint(letterAnswer);
  };

  const advance = () => {
    busy = true;
    grid?.setEnabled(false);
    entry?.stop();
    coach.setTask(null);
    cancelNext = coach.afterPause(showNext);
  };

  /** Sprząta odpowiedź bieżącego zadania (pole cyfr usuwa też ze stałej sceny). */
  const clearTask = () => {
    grid?.destroy();
    entry?.destroy();
    entry?.field.remove();
    reveal?.hide();
    grid = null;
    entry = null;
    reveal = null;
    letterAnswer = null;
    view = null;
  };

  const finish = () => {
    busy = true;
    clearTask();
    letterPad?.control.destroy();
    letterPad = null;
    coach.finish({ icon: spec.hero?.() });
  };

  /**
   * Błąd gry nie może zawiesić rundy ani jej „zaliczyć”: odpowiedzi stają, a ctx.fail loguje błąd
   * i pokazuje spokojny ekran z domkiem. Celowo bez coach.finish / ctx.complete — shell po complete
   * zapisuje poziom jako ukończony i pokazuje „Brawo!”, a błąd gry nie jest osiągnięciem dziecka.
   */
  const fail = (error: unknown) => {
    if (destroyed) return;
    busy = true;
    cancelNext();
    clearTask();
    letterPad?.control.destroy();
    letterPad = null;
    coach.setTask(null);
    ctx.fail(error);
  };

  const showNext = () => {
    clearTask();
    const task = queue.next();
    if (task === undefined) return finish();
    try {
      if (!spec.scene) ctx.root.replaceChildren(); // bez stałej sceny show buduje wszystko od nowa
      view = spec.show(ctx, task, places);
      wire(view, ++shownCount);
      busy = false;
    } catch (error) {
      fail(error);
    }
  };

  /** Podpina odpowiedź zadania i mówi trenerowi, gdzie pokazywać podpowiedzi. */
  const wire = (v: TaskView, key: number) => {
    if (!('letter' in v)) letterPad?.control.hide();
    if ('choose' in v) {
      const target = v.choose[v.correct];
      if (!target) throw new Error(`correct = ${v.correct}, a choose ma ${v.choose.length} element(y)`);
      if (v.letters) checkLetters(v.letters, v.choose.length);
      v.choose.forEach(nameChoice);
      grid = ctx.ui.focusGrid({ items: v.choose, onSelect: (i, el) => answer(i === v.correct, el) });
      coach.setTask({ key, target, question: v.question });
    } else if ('digits' in v) {
      entry = createCodeEntry(ctx, coach, { key, code: v.digits, keys: v.keys, question: v.question, onAnswer: settle });
      v.question.append(entry.field);
    } else {
      const label = normalizeLetter(v.letter);
      if (!v.keys.some((k) => normalizeLetter(k) === label)) {
        throw new Error(`Litery „${v.letter}” nie ma w keys [${v.keys}] — na dotyku nie da się jej wybrać`);
      }
      // Dotyk: paluszek przy właściwym przycisku; klawiatura: klawisz-podpowiedź nad pytaniem.
      const target = (ctx.input.mode === 'touch' && letterKey(v, label)) || v.question;
      letterAnswer = { target, key: label };
      coach.setTask({ key, target, hintKey: label, question: v.question });
    }
  };

  /** Pokazuje przyciski z literami zadania i zwraca przycisk z poprawną literą. */
  const letterKey = (v: LetterView, label: string): HTMLElement | undefined => {
    const id = v.keys.join(',');
    if (letterPad?.id !== id) {
      letterPad?.control.destroy();
      letterPad = { id, control: ctx.ui.letterKeys(v.keys) };
    }
    letterPad.control.show();
    // Przyciski ctx.ui mają aria-label = litera.
    const keys = Array.from(letterPad.control.el.children) as HTMLElement[];
    return keys.find((el) => normalizeLetter(el.getAttribute('aria-label') ?? '') === label);
  };

  const stopListening = ctx.input.on((intent) => {
    if (!view || intent.type !== 'letter') return;
    const pressed = normalizeLetter(intent.value);
    if ('letter' in view) answer(pressed === normalizeLetter(view.letter));
    else if ('choose' in view && view.letters) {
      // Klawisz litery = wybór elementu z tą literą; litera spoza elementów kołysze pytanie (answer).
      // Zaznaczenie przechodzi na wybrany element jak przy stuknięciu (ramka widoczna tylko po nawigacji).
      const i = view.letters.findIndex((l) => normalizeLetter(l) === pressed);
      if (i >= 0 && !busy && !coach.locked) grid?.focus(i);
      answer(i === view.correct, view.choose[i]);
    }
  });

  const start = () => {
    if (destroyed) return;
    try {
      const tasks = spec.tasks(ctx);
      if (tasks.length === 0) throw new Error('tasks() zwróciło pustą listę zadań (Z-23: 5–10)');
      queue = createTaskQueue(tasks);
      if (spec.scene) places = spec.scene(ctx);
    } catch (error) {
      return fail(error);
    }
    showNext();
  };
  // Kroje z ustawień rodzica ramka wczytuje przed startem gry; czekamy tylko na wymuszony krój pisany.
  // Gdy się nie wczyta, gra pokazałaby zadania trywialne (wzór = odpowiedź, ten sam drukowany znak) —
  // runda nie startuje wcale.
  if (spec.cursive) {
    void ctx.ui.lettersReady({ cursive: true }).then(
      (ready) => (ready ? start() : fail(new Error('krój pisany (cursive: true) się nie wczytał — runda nie startuje'))),
      (error: unknown) => fail(new Error(`krój pisany (cursive: true) się nie wczytał — runda nie startuje (${String(error)})`)),
    );
  } else start();

  return {
    destroy() {
      destroyed = true;
      cancelNext();
      stopListening();
      clearTask();
      letterPad?.control.destroy();
      coach.destroy();
    },
  };
}
