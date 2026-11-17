/**
 * „Każdemu po jednym” — tryb rozdawania (poziomy z `mode: 'deal'`), na createCoach.
 * Przy stoliku czekają jeżyki, w koszyku leżą jabłka. Stuknięcie jeżyka (albo ramka + Spacja) daje mu jabłko
 * z koszyka; jeżyk, który już ma jabłko, łagodnie się kołysze (każdemu po jednym). Stolik jest gotowy, gdy każdy
 * jeżyk ma jabłko — czasem jedno jabłko zostaje w koszyku (jabłek więcej niż jeżyków).
 *
 * Dlaczego nie runRound: krok ma KILKA dobrych odpowiedzi (każdy jeżyk bez jabłka), a stolik to kilka kroków;
 * ChooseView ma jedno `correct`, a zadanie kończy się po jednej odpowiedzi.
 */
import { art } from '../../core/art';
import { createCoach } from '../../core/round';
import type { FocusGrid, GameContext, GameInstance } from '../../core/types';
import { h } from '../../core/util/dom';
import { appleIcon, appleSvg } from './apple';
import { allFed, createTables, firstHungry, giveApple, isRepeatTap } from './logic';

/** Element z grafiką SVG (tekst z apple.ts albo core/art, nie dane z zewnątrz). */
export const sprite = (cls: string, svg: string): HTMLElement => {
  const el = h('span', { class: cls });
  el.innerHTML = svg;
  return el;
};

export function mountDeal(ctx: GameContext): GameInstance {
  const coach = createCoach(ctx);
  const tables = createTables(ctx.level, ctx.rng);
  const basket = h('div', { class: 'g-po-jednym-basket', role: 'img', 'aria-label': 'koszyk z jabłkami' });
  // data-max: najwięcej jeżyków przy stoliku w tej rundzie — style.css rezerwuje tyle rzędów, ile on zajmie,
  // żeby koszyk stał w jednym miejscu przez całą rundę (Z-02).
  const row = h('div', {
    class: 'g-po-jednym-seats',
    'data-max': String(Math.max(...tables.map((t) => t.hedgehogs))),
  });
  const scene = h('div', { class: 'g-po-jednym-scene g-po-jednym-deal' }, [basket, row]);
  // Najwięcej jabłek przy stoliku w tej rundzie — style.css liczy z tego stałą szerokość koszyka (Z-02).
  scene.style.setProperty('--g-po-jednym-apples', String(Math.max(...tables.map((t) => t.apples))));
  ctx.root.append(scene);

  let table = -1;
  let fed: boolean[] = [];
  let seats: HTMLElement[] = [];
  let grid: FocusGrid | null = null;
  let busy = true;
  let lastServed: { index: number; at: number } | null = null;
  let cancelNext = () => {};

  /** Podpowiedź wskazuje pierwszego głodnego jeżyka; po każdym jabłku nowy klucz (drabina od zera). */
  const aim = () => {
    const target = seats[firstHungry(fed)];
    coach.setTask(target ? { key: `${table}-${fed.filter(Boolean).length}`, target } : null);
  };

  /** Jabłko z koszyka przelatuje na talerzyk jeżyka `i` (ruch w style.css, przy ograniczonym ruchu — przenikanie). */
  const serve = (i: number) => {
    fed = giveApple(fed, i).fed;
    lastServed = { index: i, at: ctx.clock.now };
    const seat = seats[i] as HTMLElement;
    const left = basket.querySelectorAll<HTMLElement>('.g-po-jednym-apple:not(.g-po-jednym-taken)');
    const source = left[left.length - 1];
    const apple = sprite('g-po-jednym-apple', appleSvg());
    seat.querySelector('.g-po-jednym-plate')?.append(apple);
    seat.classList.add('g-po-jednym-fed');
    seat.setAttribute('aria-label', `jeżyk ${i + 1} z jabłkiem`);
    if (source) {
      const from = source.getBoundingClientRect();
      const to = apple.getBoundingClientRect();
      source.classList.add('g-po-jednym-taken');
      apple.style.setProperty('--g-po-jednym-dx', `${from.left - to.left}px`);
      apple.style.setProperty('--g-po-jednym-dy', `${from.top - to.top}px`);
      apple.style.setProperty('--g-po-jednym-s', String(to.width > 0 ? from.width / to.width : 1));
    }
    apple.classList.add('g-po-jednym-served');
    ctx.audio.play('pop');
    if (!allFed(fed)) return aim();
    // Stolik gotowy (Z-20): jeżyki z jabłkami się cieszą, chwila przerwy, potem następny stolik.
    busy = true;
    grid?.setEnabled(false);
    coach.setTask(null);
    ctx.audio.play('good');
    cancelNext = coach.afterPause(next);
  };

  const choose = (i: number) => {
    if (busy || coach.done || coach.locked || isRepeatTap(lastServed, i, ctx.clock.now)) return;
    if (giveApple(fed, i).result === 'given') {
      coach.success();
      return serve(i);
    }
    // Ten jeżyk już ma jabłko: kołysanie i drabina z rdzenia; za 3. razem gra sama daje jabłko głodnemu.
    if (coach.miss(seats[i]) === 'together') {
      const hungry = firstHungry(fed);
      grid?.focus(hungry);
      serve(hungry);
    }
  };

  const next = () => {
    grid?.destroy();
    grid = null;
    const current = tables[++table];
    if (!current) return coach.finish({ icon: appleIcon() });
    fed = Array.from({ length: current.hedgehogs }, () => false);
    seats = fed.map((_, i) =>
      h('button', { class: 'g-po-jednym-seat', type: 'button', 'aria-label': `jeżyk ${i + 1}` }, [
        sprite('g-po-jednym-hog', art.hedgehog()),
        h('span', { class: 'g-po-jednym-plate' }),
      ]),
    );
    row.dataset.count = String(current.hedgehogs);
    row.replaceChildren(...seats);
    basket.replaceChildren(...Array.from({ length: current.apples }, () => sprite('g-po-jednym-apple', appleSvg())));
    grid = ctx.ui.focusGrid({ items: seats, onSelect: (i) => choose(i) });
    busy = false;
    aim();
  };

  next();
  return {
    destroy() {
      cancelNext();
      grid?.destroy();
      coach.destroy();
    },
  };
}
