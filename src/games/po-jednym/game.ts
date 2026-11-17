/**
 * „Każdemu po jednym” — widok. Reguły i zadania: logic.ts, jabłko: apple.ts. Dwa tryby wybierane poziomem:
 * - rozdawanie (deal.ts, createCoach): daj każdemu jeżykowi po jednym jabłku;
 * - wybór tacki (tu, runRound „wybierz 1 z N”): która tacka ma tyle jabłek, ilu jest jeżyków / ile pokazuje cyfra.
 */
import { art } from '../../core/art';
import { runRound, type RoundSpec } from '../../core/round';
import type { GameModule } from '../../core/types';
import { h } from '../../core/util/dom';
import { appleIcon, appleSvg } from './apple';
import { mountDeal, sprite } from './deal';
import { CELL_X, applesLabel, createChooseTasks, levelParams, type Apple, type ChooseTask } from './logic';
import './style.css';

interface Places {
  /** Obiekt pytania: rząd jeżyków albo cyfra. */
  question: HTMLElement;
  /** Miejsce na tacki do wyboru. */
  trays: HTMLElement;
}

/** Jabłko na tacce, ustawione procentami tacki (zob. logic.ts). */
const appleAt = (apple: Apple): HTMLElement => {
  const el = sprite('g-po-jednym-apple', appleSvg());
  el.style.cssText = `left:${apple.x}%;top:${apple.y}%;width:${apple.size * CELL_X}%`;
  return el;
};

const chooseSpec: RoundSpec<ChooseTask, Places> = {
  tasks: (ctx) => createChooseTasks(ctx.level, ctx.rng),

  // Stała scena (Z-02): kafelek pytania i miejsce na tacki stoją przez całą rundę.
  scene(ctx) {
    const question = h('div', { class: 'g-po-jednym-question', role: 'img' });
    const trays = h('div', { class: 'g-po-jednym-trays' });
    ctx.root.append(h('div', { class: 'g-po-jednym-scene g-po-jednym-choose' }, [question, trays]));
    return { question, trays };
  },

  // Zadanie wymienia treść pytania i tacki (nowe wchodzą przenikaniem — style.css).
  show(_ctx, task, { question, trays }) {
    const hogs = Array.from({ length: task.prompt === 'hedgehogs' ? task.count : 0 }, () =>
      h('span', { class: 'g-po-jednym-qhog' }, [sprite('g-po-jednym-hog', art.hedgehog()), sprite('g-po-jednym-apple', appleSvg())]),
    );
    question.dataset.prompt = task.prompt;
    question.setAttribute('aria-label', task.prompt === 'digit' ? `cyfra ${task.count}` : `jeżyki: ${task.count}`);
    question.replaceChildren(...(task.prompt === 'digit' ? [h('span', { class: 'g-po-jednym-digit' }, String(task.count))] : hogs));
    const buttons = task.trays.map((tray) =>
      h('button', { class: 'g-po-jednym-tray', type: 'button', 'aria-label': applesLabel(tray.count) }, tray.apples.map(appleAt)),
    );
    trays.replaceChildren(...buttons);
    return {
      choose: buttons,
      correct: task.answer,
      question, // 1. błąd: pytanie „oddycha” poświatą — popatrz jeszcze raz, ilu jest jeżyków / jaka cyfra
      solved: () => {
        // Z-20: tacka robi się „dobra”, a przy rzędzie jeżyków każdy dostaje po jabłku — widać pary 1:1.
        buttons[task.answer]?.classList.add('g-po-jednym-solved');
        hogs.forEach((el) => el.classList.add('g-po-jednym-fed'));
      },
    };
  },

  hero: appleIcon,
};

export default {
  mount: (ctx) => (levelParams(ctx.level).mode === 'deal' ? mountDeal(ctx) : runRound(ctx, chooseSpec)),
} satisfies GameModule;
