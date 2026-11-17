import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameContext, InputMode, Tempo } from '../types';
import { IDLE_MS, LOCK_MS } from './coachCore';
import { fakeCtx, fakeEl, flush, hintsIn } from './fakeCtx';
import type { RoundSpec, TaskView } from './index';
import { NEXT_TASK_MS, runRound } from './runRound';

/** Runda wyboru 1 z 3: poprawny zawsze element 1; `shown` zapisuje kolejne zadania. */
function chooseRound(tasks: string[]) {
  const shown: string[] = [];
  const solved = vi.fn();
  const spec: RoundSpec<string> = {
    tasks: () => tasks,
    show(_ctx, task) {
      shown.push(task);
      return { choose: [fakeEl('a'), fakeEl('b'), fakeEl('c')], correct: 1, solved: () => solved(task) };
    },
    hero: () => '<svg>hero</svg>',
  };
  return { spec, shown, solved };
}

async function start<T, S = void>(spec: RoundSpec<T, S>, mode: InputMode = 'keyboard', tempo: Tempo = 'medium') {
  const f = fakeCtx(mode, tempo);
  const game = runRound(f.ctx, spec);
  await flush();
  const grid = () => f.grids[f.grids.length - 1]!;
  const pick = (i: number) => grid().options.onSelect(i, grid().options.items[i]!);
  return { ...f, game, grid, pick };
}

describe('runRound — wybór 1 z N', () => {
  it('dobra odpowiedź: solved, dźwięk, pauza, następne zadanie; po ostatnim koniec rundy', async () => {
    const { spec, shown, solved } = chooseRound(['x', 'y']);
    const r = await start(spec);
    expect(shown).toEqual(['x']);
    r.pick(1);
    expect(solved).toHaveBeenCalledWith('x');
    expect(r.play).toHaveBeenCalledWith('good');
    expect(r.grid().enabled).toBe(false);
    r.pick(1); // w pauzie odpowiedzi się nie liczą
    expect(solved).toHaveBeenCalledTimes(1);
    r.advance(NEXT_TASK_MS);
    expect(shown).toEqual(['x', 'y']);
    expect(r.grids[0]!.destroyed).toBe(true);
    r.pick(1);
    r.advance(NEXT_TASK_MS);
    expect(r.ui.celebrate).toHaveBeenCalledTimes(1);
    r.endCelebrate();
    await flush();
    expect(r.complete).toHaveBeenCalledWith({ icon: '<svg>hero</svg>' });
  });

  it('błąd: kołysanie wybranego elementu i blokada — nawet dobra odpowiedź chwilę nie przechodzi', async () => {
    const { spec, solved } = chooseRound(['x']);
    const r = await start(spec);
    r.pick(0);
    expect(r.ui.wobble).toHaveBeenCalledWith(r.grid().options.items[0]);
    r.pick(1);
    expect(solved).not.toHaveBeenCalled();
    r.advance(LOCK_MS);
    r.pick(1);
    expect(solved).toHaveBeenCalledTimes(1);
  });

  it('3. błąd: zróbmy razem (ramka na poprawnym), zadanie wraca raz na koniec kolejki', async () => {
    const { spec, shown, solved } = chooseRound(['x', 'y']);
    const r = await start(spec);
    const missThrice = () => {
      for (let i = 0; i < 3; i++) {
        r.pick(0);
        r.advance(LOCK_MS);
      }
    };
    missThrice();
    expect(solved).toHaveBeenCalledWith('x');
    expect(r.grid().focused).toBe(1);
    r.advance(NEXT_TASK_MS);
    missThrice();
    r.advance(NEXT_TASK_MS);
    missThrice(); // x po raz drugi — już nie wraca
    r.advance(NEXT_TASK_MS);
    missThrice(); // y po raz drugi
    r.advance(NEXT_TASK_MS);
    expect(shown).toEqual(['x', 'y', 'x', 'y']);
    expect(r.ui.celebrate).toHaveBeenCalledTimes(1);
  });

  it('pauza między zadaniami trwa tyle samo czasu rzeczywistego przy każdym tempie (animacje CSS się nie skalują)', async () => {
    const { spec, shown } = chooseRound(['x', 'y']);
    const r = await start(spec, 'keyboard', 'lively');
    r.pick(1);
    r.advance(NEXT_TASK_MS - 50);
    expect(shown).toEqual(['x']);
    r.advance(50);
    expect(shown).toEqual(['x', 'y']);
  });

  it('destroy w trakcie: nic więcej się nie pokazuje', async () => {
    const { spec, shown } = chooseRound(['x', 'y']);
    const r = await start(spec);
    r.pick(1);
    r.game.destroy();
    r.advance(NEXT_TASK_MS * 2);
    expect(shown).toEqual(['x']);
    expect(r.grid().destroyed).toBe(true);
    expect(() => r.game.destroy()).not.toThrow();
  });
});

describe('runRound — wybór 1 z N z literami (letters)', () => {
  /** Żołędzie „a / m / ó” (gra podaje litery w kroju z ekranu), poprawny zawsze 1 („m”), liść jako pytanie. */
  function letterChooseRound(tasks: string[], withLetters = true) {
    const letters = withLetters ? ['a', 'm', 'ó'] : undefined;
    const shown: string[] = [];
    const solved = vi.fn();
    const question = fakeEl('liść');
    const items: HTMLElement[][] = [];
    const spec: RoundSpec<string> = {
      tasks: () => tasks,
      show(_ctx, task) {
        shown.push(task);
        const choose = [fakeEl('a'), fakeEl('m'), fakeEl('ó')];
        items.push(choose);
        return { choose, correct: 1, question, letters, solved: () => solved(task) };
      },
    };
    const current = () => items[items.length - 1]!;
    return { spec, shown, solved, question, current };
  }

  it('klawisz poprawnej litery zalicza zadanie (wielkość litery bez znaczenia)', async () => {
    const { spec, shown, solved } = letterChooseRound(['x', 'y']);
    const r = await start(spec);
    r.emit({ type: 'letter', value: 'M' });
    expect(solved).toHaveBeenCalledWith('x');
    expect(r.play).toHaveBeenCalledWith('good');
    r.advance(NEXT_TASK_MS);
    expect(shown).toEqual(['x', 'y']);
  });

  it('litera z innego elementu: ten element się kołysze, 1. szczebel drabiny (poświata pytania)', async () => {
    const { spec, solved, question, current } = letterChooseRound(['x']);
    const r = await start(spec);
    r.emit({ type: 'letter', value: 'Ó' });
    expect(r.ui.wobble).toHaveBeenCalledWith(current()[2]);
    expect(r.play).toHaveBeenCalledWith('soft-no');
    expect(hintsIn(question)).toEqual(['glow']);
    expect(solved).not.toHaveBeenCalled();
  });

  it('litera spoza elementów: kołysze się obiekt pytania i też liczy się jako błąd', async () => {
    const { spec, question, current } = letterChooseRound(['x']);
    const r = await start(spec);
    r.emit({ type: 'letter', value: 'O' }); // „O” ≠ „Ó” (Z-31)
    expect(r.ui.wobble).toHaveBeenCalledWith(question);
    expect(hintsIn(question)).toEqual(['glow']);
    r.advance(LOCK_MS);
    r.emit({ type: 'letter', value: 'Z' });
    expect(hintsIn(current()[1]!)).toEqual(['key:']); // 2. błąd: paluszek przy poprawnym (bez klawisza)
  });

  it('trzy błędy literami: „zróbmy razem” (ramka na poprawnym), zadanie wraca na koniec rundy', async () => {
    const { spec, shown, solved } = letterChooseRound(['x', 'y']);
    const r = await start(spec);
    for (const value of ['A', 'Z', 'Ó']) {
      r.emit({ type: 'letter', value });
      r.advance(LOCK_MS);
    }
    expect(solved).toHaveBeenCalledWith('x');
    expect(r.grid().focused).toBe(1);
    r.advance(NEXT_TASK_MS);
    r.emit({ type: 'letter', value: 'M' });
    r.advance(NEXT_TASK_MS);
    expect(shown).toEqual(['x', 'y', 'x']);
  });

  it('w blokadzie po błędzie i w pauzie między zadaniami litera nic nie zmienia', async () => {
    const { spec, shown, solved } = letterChooseRound(['x', 'y']);
    const r = await start(spec);
    r.emit({ type: 'letter', value: 'A' });
    r.emit({ type: 'letter', value: 'M' }); // blokada po błędzie
    r.emit({ type: 'letter', value: 'Z' });
    expect(solved).not.toHaveBeenCalled();
    expect(r.ui.wobble).toHaveBeenCalledTimes(1);
    r.advance(LOCK_MS);
    r.emit({ type: 'letter', value: 'M' });
    expect(solved).toHaveBeenCalledTimes(1);
    r.emit({ type: 'letter', value: 'M' }); // pauza między zadaniami
    r.emit({ type: 'letter', value: 'A' });
    expect(solved).toHaveBeenCalledTimes(1);
    expect(r.ui.wobble).toHaveBeenCalledTimes(1);
    expect(shown).toEqual(['x']);
  });

  it('wybór literą przenosi zaznaczenie ramki na wybrany element, jak stuknięcie', async () => {
    const { spec } = letterChooseRound(['x', 'y']);
    const r = await start(spec);
    r.emit({ type: 'letter', value: 'Ó' });
    expect(r.grid().focused).toBe(2);
    r.advance(LOCK_MS);
    r.emit({ type: 'letter', value: 'Z' }); // litera spoza elementów: zaznaczenie zostaje
    expect(r.grid().focused).toBe(2);
    r.emit({ type: 'letter', value: 'A' }); // blokada po błędzie: nic się nie zmienia
    expect(r.grid().focused).toBe(2);
  });

  it('bez letters klawisz litery nic nie robi (jak dotąd)', async () => {
    const { spec, solved } = letterChooseRound(['x'], false);
    const r = await start(spec);
    for (const value of ['M', 'A', 'Z']) r.emit({ type: 'letter', value });
    expect(solved).not.toHaveBeenCalled();
    expect(r.ui.wobble).not.toHaveBeenCalled();
    expect(r.play).not.toHaveBeenCalled();
    r.pick(1);
    expect(solved).toHaveBeenCalledTimes(1);
  });
});

describe('runRound — wygoda autora', () => {
  type Node = HTMLElement & { children: Node[]; attrs: Map<string, string> };

  it('czyści ctx.root przed każdym show — show tylko dokłada scenę', async () => {
    const counts: number[] = [];
    const spec: RoundSpec<number> = {
      tasks: () => [1, 2],
      show(ctx) {
        counts.push((ctx.root as Node).children.length);
        const item = fakeEl('x');
        ctx.root.append(item, fakeEl('tło'));
        return { choose: [item], correct: 0 };
      },
    };
    const r = await start(spec);
    r.pick(0);
    r.advance(NEXT_TASK_MS);
    expect(counts).toEqual([0, 0]);
    expect((r.ctx.root as Node).children).toHaveLength(2);
  });

  it('elementy wyboru dostają rolę przycisku i nazwę zastępczą tylko, gdy nie mają własnej', async () => {
    const bare = fakeEl() as Node;
    const named = fakeEl('koło') as Node;
    const withText = fakeEl() as Node;
    withText.append('M');
    const withLabelledChild = fakeEl() as Node;
    withLabelledChild.append(fakeEl('litera M'));
    const items = [bare, named, withText, withLabelledChild];
    await start<number>({ tasks: () => [1], show: () => ({ choose: items, correct: 1 }) });
    expect(items.map((el) => el.getAttribute('role'))).toEqual(['button', 'button', 'button', 'button']);
    expect(items.map((el) => el.getAttribute('aria-label'))).toEqual(['Odpowiedź 1', 'koło', null, null]);
  });

  it('stała scena: budowana raz, ctx.root nie jest czyszczony, show dostaje jej miejsca', async () => {
    const scene = vi.fn((ctx: GameContext) => {
      const slot = fakeEl();
      ctx.root.append(fakeEl('tło'), slot);
      return { slot };
    });
    const spec: RoundSpec<number, { slot: HTMLElement }> = {
      tasks: () => [1, 2],
      scene,
      show(_ctx, n, { slot }) {
        const item = fakeEl(`x${n}`);
        slot.replaceChildren(item);
        return { choose: [item], correct: 0 };
      },
    };
    const r = await start(spec);
    const [background, slot] = (r.ctx.root as Node).children;
    r.pick(0);
    r.advance(NEXT_TASK_MS);
    expect(scene).toHaveBeenCalledTimes(1);
    expect((r.ctx.root as Node).children).toEqual([background, slot]);
    expect(slot!.children.map((el) => el.getAttribute('aria-label'))).toEqual(['x2']);
  });

  it('stała scena z cyframi: pole poprzedniego zadania znika ze stałego pytania', async () => {
    const question = fakeEl() as Node;
    const spec: RoundSpec<number, HTMLElement> = {
      tasks: () => [1, 2],
      scene: () => question,
      show: (_ctx, n, q) => ({ digits: n, question: q }),
    };
    const r = await start(spec);
    r.emit({ type: 'digit', value: 1 });
    r.advance(NEXT_TASK_MS);
    expect(question.children).toHaveLength(1);
    expect(question.children[0]!.textContent).toBe('');
  });

  it('bez wymuszonego kroju pisanego pierwsza scena powstaje od razu, bez czekania na kroje', () => {
    const f = fakeCtx();
    const show = vi.fn(() => ({ choose: [fakeEl('a')], correct: 0 }));
    runRound(f.ctx, { tasks: () => [1], show });
    expect(show).toHaveBeenCalledTimes(1);
    expect(f.ui.lettersReady).not.toHaveBeenCalled();
  });
});

describe('runRound — cyfry i litera', () => {
  const digitSpec = (question: HTMLElement, answers: (number | string)[] = [3, 2], keys = [1, 2, 3]): RoundSpec<number | string> => ({
    tasks: () => answers,
    show: (_ctx, n): TaskView => ({ digits: n, keys, question }),
  });
  const fieldOf = (question: HTMLElement) => (question as unknown as { children: HTMLElement[] }).children[0]!;

  it('jedna cyfra: jedno naciśnięcie = odpowiedź; pole trafia do pytania; bez numPad na klawiaturze', async () => {
    const question = fakeEl();
    const r = await start(digitSpec(question));
    const field = fieldOf(question);
    expect(r.ui.numPad).not.toHaveBeenCalled();
    r.emit({ type: 'digit', value: 1 });
    expect(r.ui.wobble).toHaveBeenCalledWith(field);
    r.advance(LOCK_MS);
    r.emit({ type: 'digit', value: 1 });
    expect(r.ui.hint).toHaveBeenLastCalledWith({ target: field, key: '3' });
    r.advance(LOCK_MS);
    r.emit({ type: 'digit', value: 3 });
    expect(r.play).toHaveBeenCalledWith('good');
  });

  it('kilka cyfr: ocena sama przy komplecie, cofanie kasuje; błąd czyści pole po blokadzie', async () => {
    const question = fakeEl();
    const r = await start(digitSpec(question, [10], [0, 1, 2, 5]));
    const field = fieldOf(question);
    r.emit({ type: 'digit', value: 1 });
    r.emit({ type: 'digit', value: 2 });
    expect(field.textContent).toBe('12');
    expect(r.ui.wobble).toHaveBeenCalledWith(field);
    r.emit({ type: 'digit', value: 1 }); // blokada — nie wchodzi
    r.advance(LOCK_MS);
    expect(field.textContent).toBe('');
    r.emit({ type: 'digit', value: 5 });
    r.emit({ type: 'erase' });
    expect(field.textContent).toBe('');
    r.emit({ type: 'digit', value: 1 });
    r.emit({ type: 'digit', value: 0 });
    expect(r.ui.wobble).toHaveBeenCalledTimes(1);
    expect(field.textContent).toBe('10');
    expect(r.play).toHaveBeenCalledWith('good');
  });

  it('dotyk: numPad z podanymi cyframi, „cofnij” tylko dla kodów > 1 cyfry; paluszek przy następnej cyfrze', async () => {
    const r = await start(digitSpec(fakeEl(), [3, '21']), 'touch');
    expect(r.ui.numPad).toHaveBeenLastCalledWith({ digits: [1, 2, 3], erase: false });
    r.emit({ type: 'digit', value: 3 });
    r.advance(NEXT_TASK_MS);
    expect(r.ui.numPad.mock.results[0]!.value.destroyed).toBe(true);
    expect(r.ui.numPad).toHaveBeenLastCalledWith({ digits: [1, 2, 3], erase: true });
    const keys = r.ui.numPad.mock.results[1]!.value.el.children;
    r.advance(IDLE_MS); // bezczynność → podpowiedź pierwszej cyfry
    expect(r.ui.hint).toHaveBeenLastCalledWith({ target: keys[1], key: '2' });
    r.emit({ type: 'digit', value: 2 });
    expect(r.ui.hint).toHaveBeenLastCalledWith({ target: keys[0], key: '1' }); // podpowiedź idzie za kodem
  });

  it('litera: wielkość bez znaczenia, letterKeys na dotyku, inne intencje nie są błędem', async () => {
    const solved = vi.fn();
    const spec: RoundSpec<string> = {
      tasks: () => ['m'],
      show: (_ctx, letter) => ({ letter, keys: ['A', 'M', 'O'], question: fakeEl(), solved }),
      cursive: true,
    };
    const r = await start(spec, 'touch');
    expect(r.ui.lettersReady).toHaveBeenCalledWith({ cursive: true });
    expect(r.ui.letterKeys).toHaveBeenCalledWith(['A', 'M', 'O']);
    r.emit({ type: 'move', dir: 'up' });
    r.emit({ type: 'digit', value: 1 });
    expect(r.ui.wobble).not.toHaveBeenCalled();
    r.emit({ type: 'letter', value: 'M' });
    expect(solved).toHaveBeenCalledTimes(1);
  });

  it('cyfry, podpowiedź z 2. błędu zostaje nad polem po jego wyczyszczeniu', async () => {
    const question = fakeEl();
    const r = await start(digitSpec(question, [3]));
    const field = fieldOf(question);
    r.emit({ type: 'digit', value: 1 });
    r.advance(LOCK_MS);
    r.emit({ type: 'digit', value: 1 });
    r.advance(LOCK_MS);
    expect(field.textContent).toBe('');
    expect(hintsIn(field)).toEqual(['key:3']);
  });

  it('cyfry, 3. błąd: pole pokazuje poprawną odpowiedź, solved, zadanie wraca na koniec', async () => {
    const question = fakeEl();
    const solved = vi.fn();
    const shown: number[] = [];
    const r = await start<number>({
      tasks: () => [3, 2],
      show: (_ctx, n) => (shown.push(n), { digits: n, question, solved }),
    });
    const field = fieldOf(question);
    for (let i = 0; i < 3; i++) {
      r.emit({ type: 'digit', value: 1 });
      r.advance(LOCK_MS);
    }
    expect(field.textContent).toBe('3');
    expect(solved).toHaveBeenCalledTimes(1);
    r.advance(NEXT_TASK_MS);
    r.emit({ type: 'digit', value: 2 });
    r.advance(NEXT_TASK_MS);
    expect(shown).toEqual([3, 2, 3]);
  });

  it.each<Tempo>(['calm', 'medium', 'lively'])('cyfry, po „zróbmy razem” (%s): pierwsza cyfra nowego zadania liczy się od razu', async (tempo) => {
    const shown: number[] = [];
    const r = await start<number>({ tasks: () => [3, 2], show: (_ctx, n) => (shown.push(n), { digits: n, question: fakeEl() }) }, 'keyboard', tempo);
    for (let i = 0; i < 3; i++) {
      if (i > 0) r.advance(LOCK_MS * 1.5); // blokada po błędzie (czas gry) minęła przy każdym tempie
      r.emit({ type: 'digit', value: 1 });
    }
    r.advance(NEXT_TASK_MS); // pauza: 1 s czasu rzeczywistego od 3. błędu — dłuższa niż blokada
    expect(shown).toEqual([3, 2]);
    r.emit({ type: 'digit', value: 2 });
    expect(r.play).toHaveBeenLastCalledWith('good');
  });

  it.each<InputMode>(['keyboard', 'touch'])('litera, 3. błąd (%s): w pauzie widać właściwy klawisz, potem znika', async (mode) => {
    const question = fakeEl();
    const solved = vi.fn();
    const r = await start<string>({ tasks: () => ['M', 'O'], show: (_ctx, letter) => ({ letter, keys: ['A', 'M', 'O'], question, solved }) }, mode);
    for (let i = 0; i < 3; i++) {
      r.emit({ type: 'letter', value: 'A' });
      r.advance(LOCK_MS);
    }
    expect(solved).toHaveBeenCalledTimes(1);
    const target = mode === 'touch' ? r.ui.letterKeys.mock.results[0]!.value.el.children[1] : question;
    expect(hintsIn(target)).toEqual(['key:M']);
    r.advance(NEXT_TASK_MS);
    expect(hintsIn(target)).toEqual([]);
  });

  it('po ostatnim zadaniu przyciski z literami znikają', async () => {
    const r = await start<string>({ tasks: () => ['M'], show: (_ctx, letter) => ({ letter, keys: ['A', 'M'], question: fakeEl() }) }, 'touch');
    r.emit({ type: 'letter', value: 'M' });
    r.advance(NEXT_TASK_MS);
    expect(r.ui.celebrate).toHaveBeenCalledTimes(1);
    expect(r.ui.letterKeys.mock.results[0]!.value.destroyed).toBe(true);
  });
});

describe('runRound — błąd w grze nie zawiesza rundy', () => {
  afterEach(() => vi.restoreAllMocks());
  const quietErrors = () => vi.spyOn(console, 'error').mockImplementation(() => {});

  const failing = (show: RoundSpec<number>['show'], cursive = false): RoundSpec<number> => ({ tasks: () => [1, 2, 3], show, cursive });

  it.each([
    ['wyjątek w show', failing(() => { throw new Error('zepsute'); })],
    ['wyjątek w show przy krojach pisanych', failing(() => { throw new Error('zepsute'); }, true)],
    ['correct spoza choose', failing(() => ({ choose: [fakeEl('a')], correct: 1 }))],
    ['letters o innej długości niż choose', failing(() => ({ choose: [fakeEl('a'), fakeEl('b')], correct: 0, letters: ['A'] }))],
    ['letters z powtórzoną literą', failing(() => ({ choose: [fakeEl('a'), fakeEl('b')], correct: 0, letters: ['a', 'A'] }))],
    ['letters z wpisem, który nie jest jedną literą', failing(() => ({ choose: [fakeEl('a'), fakeEl('b')], correct: 0, letters: ['A', 'BC'] }))],
    ['cyfra odpowiedzi spoza keys', failing(() => ({ digits: 4, keys: [1, 2, 3], question: fakeEl() }))],
    ['odpowiedź cyframi z nie-cyframi', failing(() => ({ digits: '', question: fakeEl() }))],
    ['litera spoza keys', failing(() => ({ letter: 'Ż', keys: ['A', 'Z'], question: fakeEl() }))],
    ['pusta lista zadań', { tasks: () => [], show: () => ({ choose: [fakeEl('a')], correct: 0 }) } satisfies RoundSpec<number>],
    ['wyjątek w scene', { ...failing(() => ({ choose: [fakeEl('a')], correct: 0 })), scene: () => { throw new Error('zepsute'); } }],
  ])('%s: ctx.fail, runda staje, poziom NIE jest zaliczony', async (_name, spec) => {
    const r = await start(spec as RoundSpec<number>);
    expect(r.fail).toHaveBeenCalledTimes(1);
    // Błąd gry to nie ukończenie rundy: bez listków, bez ctx.complete (shell zapisałby postęp i pokazał „Brawo!”).
    expect(r.ui.celebrate).not.toHaveBeenCalled();
    r.endCelebrate();
    r.advance(10_000);
    await flush();
    expect(r.complete).not.toHaveBeenCalled();
  });

  it('błąd w trakcie rundy (drugie zadanie): nie zalicza poziomu, sprząta wybór i podpowiedzi', async () => {
    const r = await start<number>({
      tasks: () => [1, 2],
      show: (_ctx, n) => {
        if (n === 2) throw new Error('zepsute');
        return { choose: [fakeEl('a'), fakeEl('b')], correct: 0 };
      },
    });
    r.pick(0);
    r.advance(NEXT_TASK_MS);
    expect(r.fail).toHaveBeenCalledTimes(1);
    expect(r.fail).toHaveBeenCalledWith(new Error('zepsute'));
    expect(r.grids[0]!.destroyed).toBe(true);
    r.advance(10_000);
    await flush();
    expect(r.ui.celebrate).not.toHaveBeenCalled();
    expect(r.complete).not.toHaveBeenCalled();
  });

  it('cursive: true, a krój pisany się nie wczytał: runda nie startuje, ctx.fail, poziom nie zaliczony', async () => {
    const f = fakeCtx();
    f.ui.lettersReady.mockImplementationOnce(() => Promise.resolve(false));
    const show = vi.fn(() => ({ choose: [fakeEl('a')], correct: 0 }));
    const scene = vi.fn();
    runRound(f.ctx, { tasks: () => [1], scene, show, cursive: true });
    await flush();
    expect(f.ui.lettersReady).toHaveBeenCalledWith({ cursive: true });
    expect(scene).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();
    expect(f.fail).toHaveBeenCalledTimes(1);
    expect(String(f.fail.mock.calls[0]![0])).toMatch(/krój pisany/);
    expect(f.ui.celebrate).not.toHaveBeenCalled();
    f.advance(10_000);
    await flush();
    expect(f.complete).not.toHaveBeenCalled();
  });

  it('cursive: true i lettersReady odrzucone: to samo — bez rundy i bez zaliczenia', async () => {
    const f = fakeCtx();
    f.ui.lettersReady.mockImplementationOnce(() => Promise.reject(new Error('sieć')));
    const show = vi.fn(() => ({ choose: [fakeEl('a')], correct: 0 }));
    runRound(f.ctx, { tasks: () => [1], show, cursive: true });
    await flush();
    expect(show).not.toHaveBeenCalled();
    expect(f.fail).toHaveBeenCalledTimes(1);
    expect(f.complete).not.toHaveBeenCalled();
  });

  it('cursive: true i krój wczytany: runda startuje normalnie', async () => {
    const f = fakeCtx();
    const show = vi.fn(() => ({ choose: [fakeEl('a')], correct: 0 }));
    runRound(f.ctx, { tasks: () => [1], show, cursive: true });
    await flush();
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('wyjątek w solved: zapis w konsoli, runda idzie dalej', async () => {
    const error = quietErrors();
    const shown: number[] = [];
    const r = await start<number>({
      tasks: () => [1, 2],
      show: (_ctx, n) => (shown.push(n), { choose: [fakeEl('a')], correct: 0, solved: () => { throw new Error('zepsute'); } }),
    });
    r.pick(0);
    r.advance(NEXT_TASK_MS);
    expect(error).toHaveBeenCalledTimes(1);
    expect(shown).toEqual([1, 2]);
  });
});
