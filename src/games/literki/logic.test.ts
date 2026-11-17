import { describe, expect, it } from 'vitest';
import { createRng } from '../../core/util/rng';
import { BASE_ALPHABET, DIACRITICS } from '../../core/util/letters';
import {
  AUTO_LEAVE_MS,
  DIACRITIC_LEVELS,
  LEVELS,
  MIN_OPEN_MS,
  AFTER_COLLECT_MS,
  createState,
  isComplete,
  keyLabel,
  levelParams,
  pickLane,
  pickLetter,
  pressLetter,
  remainingToSpawn,
  solveTogether,
  step,
  tapItem,
  target,
  type GameState,
  type Item,
} from './logic';

/** Symuluje `ms` czasu gry krokami po 16 ms. */
function run(state: GameState, ms: number, seed = 1): void {
  const rng = createRng(seed);
  for (let t = 0; t < ms; t += 16) step(state, 16, rng);
}

const item = (id: number, letter: string, lane: number, extra: Partial<Item> = {}): Item => ({
  id,
  letter,
  lane,
  y: 0,
  stage: 'closed',
  landed: false,
  openMs: 0,
  ...extra,
});

/** Przedmioty, które się teraz przesuwają (Z-01). */
const moving = (state: GameState) => state.items.filter((i) => i.stage === 'closed' && !i.landed).length;

describe('poziomy', () => {
  it('są poprawne: litery z alfabetu, rozsądne parametry, rundy 5–10 zadań', () => {
    for (const p of LEVELS) {
      expect(p.letters.length).toBeGreaterThanOrEqual(3);
      expect(new Set(p.letters).size).toBe(p.letters.length);
      for (const l of p.letters) expect([...BASE_ALPHABET, ...DIACRITICS]).toContain(l);
      expect(p.goal).toBeGreaterThanOrEqual(5);
      expect(p.goal).toBeLessThanOrEqual(10); // Z-23
      expect(p.maxActive).toBeGreaterThanOrEqual(1);
      expect(p.maxActive).toBeLessThanOrEqual(3); // Z-01
      expect(p.fallSeconds).toBeGreaterThanOrEqual(8);
      expect(p.letters.length).toBeGreaterThan(p.maxActive); // litery na ekranie się nie powtarzają
    }
  });

  it('poziom 1: jeden przedmiot naraz, mały zestaw WIELKICH liter bez diakrytyków', () => {
    const first = levelParams(1);
    expect(first.maxActive).toBe(1);
    expect(first.letters.every((l) => BASE_ALPHABET.includes(l))).toBe(true);
  });

  it('polskie znaki są tylko na ostatnim poziomie; wcześniejsze poziomy rosną w trudności', () => {
    expect(DIACRITIC_LEVELS).toEqual([LEVELS.length]);
    // Ostatni poziom (polskie znaki) jest pominięty celowo: jest wolniejszy, bo trudność daje AltGr.
    for (let i = 1; i < LEVELS.length - 1; i++) {
      const prev = LEVELS[i - 1]!;
      const cur = LEVELS[i]!;
      expect(cur.fallSeconds).toBeLessThanOrEqual(prev.fallSeconds);
      expect(cur.maxActive).toBeGreaterThanOrEqual(prev.maxActive);
    }
    expect(LEVELS[LEVELS.length - 2]!.letters).toEqual(BASE_ALPHABET);
  });

  it('levelParams przycina numer poziomu do zakresu', () => {
    expect(levelParams(0)).toBe(LEVELS[0]);
    expect(levelParams(99)).toBe(LEVELS[LEVELS.length - 1]);
  });

  it('klawisz-podpowiedź dla polskiego znaku pokazuje AltGr (Z-31)', () => {
    expect(keyLabel('M')).toBe('M');
    expect(keyLabel('Ą')).toBe('AltGr + A');
    expect(keyLabel('Ź')).toBe('AltGr + X');
    expect(keyLabel('Ż')).toBe('AltGr + Z');
    for (const l of levelParams(DIACRITIC_LEVELS[0]!).letters) {
      if (!BASE_ALPHABET.includes(l)) expect(keyLabel(l)).toMatch(/^AltGr \+ [A-Z]$/);
    }
  });
});

describe('pickLetter / pickLane', () => {
  it('nie losuje litery, która już jest na ekranie, ani poprzedniej', () => {
    const rng = createRng(3);
    for (let i = 0; i < 100; i++) expect(pickLetter(rng, ['A', 'O', 'M'], ['A'], 'O')).toBe('M');
  });

  it('gdy się nie da, bierze cokolwiek z puli', () => {
    expect(pickLetter(createRng(1), ['A'], ['A'], 'A')).toBe('A');
  });

  it('wybiera wolny tor', () => {
    const rng = createRng(2);
    const items = [0, 1, 3].map((lane, i) => item(i, 'A', lane));
    for (let i = 0; i < 50; i++) expect(pickLane(rng, 4, items)).toBe(2);
  });

  it('torów jest co najmniej tyle, ile przedmiotów naraz', () => {
    expect(createState(7, 1).lanes).toBe(levelParams(7).maxActive);
  });
});

describe('przebieg rundy', () => {
  it('pierwszy przedmiot pojawia się od razu, kolejny dopiero po spawnEveryMs', () => {
    const state = createState(3, 5);
    run(state, 16);
    expect(state.items).toHaveLength(1);
    run(state, levelParams(3).spawnEveryMs - 100);
    expect(state.items).toHaveLength(1);
    run(state, 200);
    expect(state.items).toHaveLength(2);
  });

  it('Z-01: ruchomych przedmiotów najwyżej 1 na poziomie 1 i najwyżej 3 na każdym poziomie', () => {
    for (let level = 1; level <= LEVELS.length; level++) {
      const state = createState(level, 5);
      const rng = createRng(level);
      let most = 0;
      for (let t = 0; t < 120_000; t += 16) {
        step(state, 16, rng);
        const goal = target(state);
        if (goal && t % 2000 === 0) tapItem(state, goal.id);
        most = Math.max(most, moving(state));
      }
      expect(most).toBeLessThanOrEqual(level === 1 ? 1 : 3);
    }
  });

  it('Z-01: po zebraniu nowy przedmiot nie rusza razem z odchodzącym zwierzątkiem', () => {
    const state = createState(1, 4);
    const rng = createRng(2);
    step(state, 16, rng);
    const first = state.items[0]!;
    tapItem(state, first.id);
    run(state, MIN_OPEN_MS);
    expect(tapItem(state, first.id).kind).toBe('collect');
    let waited = 0;
    while (step(state, 16, rng).spawned.length === 0) waited += 16;
    expect(waited).toBeGreaterThanOrEqual(AFTER_COLLECT_MS - 16);
    expect(waited).toBeLessThanOrEqual(AFTER_COLLECT_MS);
  });

  it('Z-22: przedmiot, który doleci do końca toru, ląduje i czeka (nic nie przepada)', () => {
    const state = createState(1, 4);
    run(state, 16);
    const first = state.items[0]!;
    run(state, levelParams(1).fallSeconds * 1000 + 500);
    expect(first.landed).toBe(true);
    expect(first.y).toBe(1);
    run(state, 60_000);
    expect(state.items).toEqual([first]);
    expect(state.collected).toBe(0);
  });

  it('Z-05: przy ograniczonym ruchu przedmiot pojawia się od razu na końcu toru i stoi', () => {
    const state = createState(7, 4, true);
    const rng = createRng(4);
    for (let t = 0; t < 30_000; t += 16) {
      for (const spawned of step(state, 16, rng).spawned) expect(spawned).toMatchObject({ y: 1, landed: true });
      expect(moving(state)).toBe(0);
    }
    expect(state.items.length).toBe(levelParams(7).maxActive);
  });

  it('litery na ekranie są zawsze różne, a tory się nie powtarzają', () => {
    const state = createState(7, 3);
    const rng = createRng(9);
    for (let t = 0; t < 120_000; t += 16) {
      step(state, 16, rng);
      const goal = target(state);
      if (goal && t % 3000 === 0) tapItem(state, goal.id);
      const letters = state.items.map((i) => i.letter);
      const lanes = state.items.map((i) => i.lane);
      expect(new Set(letters).size).toBe(letters.length);
      expect(new Set(lanes).size).toBe(lanes.length);
    }
  });

  it('klawiatura: dwa trafienia — otwarcie, potem (po chwili) zebranie', () => {
    const state = createState(1, 4);
    run(state, 16);
    const first = state.items[0]!;
    expect(pressLetter(state, first.letter)).toEqual({ kind: 'open', item: first });
    expect(pressLetter(state, first.letter)).toEqual({ kind: 'none' }); // podwójne stuknięcie tylko otwiera
    run(state, MIN_OPEN_MS);
    expect(pressLetter(state, first.letter).kind).toBe('collect');
    expect(state.items).toHaveLength(0);
    expect(state.collected).toBe(1);
  });

  it('klawiatura: litera spoza ekranu to błąd bez żadnej straty', () => {
    const state = createState(1, 4);
    run(state, 16);
    const other = ['A', 'O', 'M'].find((l) => l !== state.items[0]!.letter)!;
    expect(pressLetter(state, other)).toEqual({ kind: 'miss' });
    expect(state.collected).toBe(0);
    expect(state.items).toHaveLength(1);
  });

  it('klawiatura: każda litera z ekranu zalicza swój przedmiot, nie tylko zadanie', () => {
    const state = createState(3, 4);
    state.items.push(item(1, 'A', 0, { y: 0.8 }), item(2, 'E', 1, { y: 0.2 }));
    expect(pressLetter(state, 'E').kind).toBe('open');
  });

  it('„A” nie otwiera „Ą”', () => {
    const state = createState(8, 4);
    state.items.push(item(99, 'Ą', 0, { y: 0.2 }));
    expect(pressLetter(state, 'A')).toEqual({ kind: 'miss' });
    expect(state.items[0]!.stage).toBe('closed');
  });

  it('dotyk: zalicza się tylko przedmiot z literą z karty-wzoru, inny to błąd', () => {
    const state = createState(3, 4);
    state.items.push(item(1, 'A', 0, { y: 0.8 }), item(2, 'E', 1, { y: 0.2 }));
    expect(target(state)?.id).toBe(1);
    expect(tapItem(state, 2)).toEqual({ kind: 'miss' });
    expect(state.items[1]!.stage).toBe('closed');
    expect(tapItem(state, 1).kind).toBe('open');
    expect(target(state)?.id).toBe(2); // następne zadanie
    expect(tapItem(state, 2).kind).toBe('open');
  });

  it('dotyk: otwarte zwierzątko można zebrać stuknięciem (to nie błąd)', () => {
    const state = createState(3, 4);
    state.items.push(item(1, 'A', 0, { stage: 'open', openMs: MIN_OPEN_MS }), item(2, 'E', 1));
    expect(tapItem(state, 1).kind).toBe('collect');
  });

  it('zadaniem jest najstarszy zamknięty przedmiot', () => {
    const state = createState(3, 5);
    state.items.push(item(1, 'A', 0, { y: 0.9, stage: 'open' }), item(2, 'E', 1, { y: 0.7 }), item(3, 'I', 2, { y: 0.2 }));
    expect(target(state)?.id).toBe(2);
  });

  it('otwarte zwierzątko samo odchodzi po AUTO_LEAVE_MS i liczy się jako zebrane', () => {
    const state = createState(1, 4);
    const rng = createRng(1);
    step(state, 16, rng);
    const first = state.items[0]!;
    tapItem(state, first.id);
    const y = first.y;
    let left = false;
    for (let t = 0; t <= AUTO_LEAVE_MS + 32; t += 16) left = left || step(state, 16, rng).left.includes(first);
    expect(left).toBe(true);
    expect(first.y).toBe(y); // otwarte nie spada
    expect(state.collected).toBe(1);
  });

  it('„zróbmy razem”: gra sama otwiera zadanie, a jego litera wraca później w rundzie', () => {
    const state = createState(1, 4);
    const rng = createRng(5);
    step(state, 16, rng);
    const first = state.items[0]!;
    expect(solveTogether(state)).toEqual({ kind: 'open', item: first });
    for (let t = 0; t <= AUTO_LEAVE_MS + AFTER_COLLECT_MS + 32; t += 16) step(state, 16, rng);
    expect(state.items[0]?.letter).toBe(first.letter);
    expect(state.again).toEqual([]);
  });
});

describe('koniec rundy (Z-23)', () => {
  it('trafiając zadania, runda kończy się dokładnie po celu i nic nie pojawia się ponad cel', () => {
    for (let level = 1; level <= LEVELS.length; level++) {
      const state = createState(level, 5);
      const rng = createRng(level);
      let spawned = 0;
      for (let t = 0; t < 600_000 && !isComplete(state); t += 16) {
        spawned += step(state, 16, rng).spawned.length;
        const goal = target(state);
        if (goal && t % 400 === 0) tapItem(state, goal.id);
      }
      expect(isComplete(state)).toBe(true);
      expect(state.collected).toBe(levelParams(level).goal);
      expect(spawned).toBe(levelParams(level).goal);
      expect(remainingToSpawn(state)).toBe(0);
    }
  });

  it('runda kończy się, nawet gdy dziecko tylko się myli — co 3. błąd „zróbmy razem” (Z-19)', () => {
    for (let level = 1; level <= LEVELS.length; level++) {
      for (const touch of [false, true]) {
        const state = createState(level, 4);
        const rng = createRng(level * 7);
        let misses = 0;
        for (let t = 0; t < 600_000 && !isComplete(state); t += 16) {
          step(state, 16, rng);
          if (t % 800 !== 0) continue;
          // Zawsze źle: klawiatura — litera bazowa zamiast polskiej albo litera spoza ekranu;
          // dotyk — przedmiot, który nie jest zadaniem (o ile jest).
          const goal = target(state);
          const wrong = state.items.find((i) => i.stage === 'closed' && i !== goal);
          const result = touch
            ? wrong
              ? tapItem(state, wrong.id)
              : { kind: 'miss' as const }
            : pressLetter(state, BASE_ALPHABET.find((l) => !state.items.some((i) => i.letter === l)) ?? 'Q');
          if (result.kind === 'miss' && ++misses % 3 === 0) solveTogether(state);
        }
        expect(isComplete(state)).toBe(true);
      }
    }
  });
});
