/**
 * createCoach — cienka warstwa wiążąca maszynę stanów (coachCore.ts) z ctx: podpowiedzi przez
 * ctx.ui.hint, kołysanie przez ctx.ui.wobble, bezczynność z ctx.input, koniec rundy. Opis API: index.ts.
 */
import { TEMPO_SCALE } from '../clock';
import type { GameContext, Hint } from '../types';
import { createCoachCore } from './coachCore';
import type { Coach, CoachTask } from './index';

/**
 * Zapas na wypadek, gdyby animacja listków nigdy się nie skończyła (np. animacje wyłączone
 * w przeglądarce). Celowo kilka razy dłuższy od animacji — nie dubluje czasu z CSS, tylko chroni
 * przed rundą, która nigdy się nie kończy.
 */
export const FINISH_FALLBACK_MS = 4000;

/**
 * Pauza po rozwiązaniu: chwila na reakcję sceny (Z-20, ≤ 800 ms w CSS) przed następnym zadaniem.
 * Czas rzeczywisty — tempo gry nie skraca animacji CSS, więc nie może skracać i pauzy.
 */
export const NEXT_TASK_MS = 1000;

/**
 * Bezczynność, po której przychodzi podpowiedź obrazem, dla stopni z panelu rodzica (`HintDelay`;
 * 'off' = wcale). Czas rzeczywisty: rodzic wybiera sekundy, więc tempo gry ich nie zmienia.
 */
export const IDLE_MS = { short: 6000, medium: 12_000, long: 20_000 } as const;

export function createCoach(ctx: GameContext): Coach {
  let glow: Hint | null = null;
  let hint: Hint | null = null;
  let destroyed = false;

  const { hintDelay, tempo } = ctx.settings;
  const idleMs = hintDelay === 'off' ? null : IDLE_MS[hintDelay] * TEMPO_SCALE[tempo];

  const core = createCoachCore<CoachTask>(ctx.clock, {
    show(cue, task) {
      if (cue === 'glow') glow = ctx.ui.hint({ target: task.question ?? task.target, kind: 'glow' });
      else hint = ctx.ui.hint({ target: task.target, key: task.hintKey });
    },
    hide() {
      glow?.hide();
      hint?.hide();
      glow = null;
      hint = null;
    },
  }, idleMs);

  // Każda intencja dziecka (także ruch strzałką) to „działanie” — zeruje licznik bezczynności.
  const stopListening = ctx.input.on(() => core.activity());

  let current: CoachTask | null = null;

  return {
    setTask(task) {
      const previous = current;
      core.setTask(task);
      if (core.done) return;
      current = task;
      // To samo zadanie, ale wskazówki mają wskazać coś innego (np. następną cyfrę kodu, inną kartę) — przenieś je.
      if (!previous || !task || previous.key !== task.key) return;
      if (glow && (previous.question ?? previous.target) !== (task.question ?? task.target)) {
        glow.hide();
        glow = ctx.ui.hint({ target: task.question ?? task.target, kind: 'glow' });
      }
      if (hint && (previous.target !== task.target || previous.hintKey !== task.hintKey)) {
        hint.hide();
        hint = ctx.ui.hint({ target: task.target, key: task.hintKey });
      }
    },

    miss(wrongEl) {
      const outcome = core.miss();
      if (outcome !== 'ignored') {
        if (wrongEl) ctx.ui.wobble(wrongEl);
        ctx.audio.play('soft-no'); // neutralny ton, nie dźwięk porażki (Z-09)
      }
      return outcome;
    },

    success: () => core.success(),

    afterPause: (fn) => ctx.clock.after(NEXT_TASK_MS * TEMPO_SCALE[ctx.settings.tempo], fn),

    get locked() {
      return core.locked;
    },
    get done() {
      return core.done;
    },

    finish(result = {}) {
      if (!core.finish()) return;
      stopListening();
      void Promise.race([ctx.ui.celebrate(), ctx.clock.wait(FINISH_FALLBACK_MS)]).then(() => {
        if (!destroyed) ctx.complete(result);
      });
    },

    destroy() {
      destroyed = true;
      stopListening();
      core.destroy();
    },
  };
}
