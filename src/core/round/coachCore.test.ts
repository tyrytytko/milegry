import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { createClock, type ClockController } from '../clock';
import { createCoachCore, FIRST_IDLE_MS, IDLE_MS, LOCK_MS, type CoachCore, type CoachView } from './coachCore';

interface T {
  key: string;
}

let clock: ClockController;
let view: { show: Mock<CoachView<T>['show']>; hide: Mock<CoachView<T>['hide']> };
let core: CoachCore<T>;

/** Przesuwa czas gry o `ms` (zegar przyjmuje najwyżej 100 ms na klatkę). */
function advance(ms: number): void {
  for (let left = ms; left > 0; left -= 50) clock.tick(Math.min(50, left));
}

const cues = () => view.show.mock.calls.map(([cue]) => cue);

beforeEach(() => {
  clock = createClock(1);
  view = { show: vi.fn<CoachView<T>['show']>(), hide: vi.fn<CoachView<T>['hide']>() };
  core = createCoachCore<T>(clock, view);
});

describe('bezczynność', () => {
  it('pierwsze zadanie rundy: podpowiedź obrazem po FIRST_IDLE_MS, tylko raz', () => {
    core.setTask({ key: 'a' });
    advance(FIRST_IDLE_MS - 50);
    expect(view.show).not.toHaveBeenCalled();
    advance(50);
    expect(view.show).toHaveBeenCalledWith('hint', { key: 'a' });
    advance(IDLE_MS * 3);
    expect(view.show).toHaveBeenCalledTimes(1);
  });

  it('kolejne zadania czekają IDLE_MS', () => {
    core.setTask({ key: 'a' });
    core.setTask({ key: 'b' });
    advance(FIRST_IDLE_MS);
    expect(view.show).not.toHaveBeenCalled();
    advance(IDLE_MS - FIRST_IDLE_MS);
    expect(cues()).toEqual(['hint']);
  });

  it('zmiana zadania zeruje licznik i chowa podpowiedź', () => {
    core.setTask({ key: 'a' });
    advance(FIRST_IDLE_MS);
    core.setTask({ key: 'b' });
    expect(view.hide).toHaveBeenCalledTimes(1);
    advance(IDLE_MS - 100);
    expect(view.show).toHaveBeenCalledTimes(1);
    advance(100);
    expect(view.show).toHaveBeenCalledTimes(2);
  });

  it('każda akcja dziecka zeruje licznik', () => {
    core.setTask({ key: 'a' });
    advance(FIRST_IDLE_MS - 100);
    core.activity();
    advance(IDLE_MS - 100);
    expect(view.show).not.toHaveBeenCalled();
    advance(100);
    expect(cues()).toEqual(['hint']);
  });

  it('to samo zadanie (ten sam key) nie zeruje licznika ani drabiny', () => {
    core.setTask({ key: 'a' });
    expect(core.miss()).toBe('glow'); // błąd też jest akcją: licznik liczy od teraz
    advance(IDLE_MS - 100);
    core.setTask({ key: 'a' });
    expect(view.hide).not.toHaveBeenCalled();
    advance(100);
    expect(cues()).toEqual(['glow', 'hint']);
    expect(core.miss()).toBe('hint');
  });

  it('1. błąd tuż przed progiem nie wyzwala podpowiedzi; po nim czekamy IDLE_MS, nie FIRST_IDLE_MS', () => {
    core.setTask({ key: 'a' });
    advance(FIRST_IDLE_MS - 50);
    expect(core.miss()).toBe('glow');
    advance(FIRST_IDLE_MS);
    expect(cues()).toEqual(['glow']); // po 1. błędzie tylko poświata
    advance(IDLE_MS - FIRST_IDLE_MS);
    expect(cues()).toEqual(['glow', 'hint']);
  });

  it('pierwsze czekanie kończy też zwykłe działanie dziecka (np. ruch strzałką)', () => {
    core.setTask({ key: 'a' });
    core.activity();
    advance(FIRST_IDLE_MS);
    expect(view.show).not.toHaveBeenCalled();
    advance(IDLE_MS - FIRST_IDLE_MS);
    expect(cues()).toEqual(['hint']);
  });

  it('bez zadania nie ma podpowiedzi', () => {
    core.setTask({ key: 'a' });
    core.setTask(null);
    advance(IDLE_MS * 2);
    expect(view.show).not.toHaveBeenCalled();
    expect(core.miss()).toBe('ignored');
  });
});

describe('drabina podpowiedzi (Z-19)', () => {
  beforeEach(() => core.setTask({ key: 'a' }));

  it('1. błąd → poświata, 2. → podpowiedź, 3. → zróbmy razem i od nowa', () => {
    expect(core.miss()).toBe('glow');
    expect(cues()).toEqual(['glow']);
    advance(LOCK_MS);
    expect(core.miss()).toBe('hint');
    expect(cues()).toEqual(['glow', 'hint']);
    advance(LOCK_MS);
    expect(core.miss()).toBe('together');
    expect(view.hide).toHaveBeenCalledTimes(1);
    advance(LOCK_MS);
    expect(core.miss()).toBe('glow');
  });

  it('podpowiedź z bezczynności nie znika po błędzie', () => {
    advance(FIRST_IDLE_MS);
    expect(core.miss()).toBe('glow');
    expect(cues()).toEqual(['hint', 'glow']);
    expect(view.hide).not.toHaveBeenCalled();
  });

  it('sukces zeruje drabinę i chowa podpowiedzi', () => {
    core.miss();
    advance(LOCK_MS);
    core.success();
    expect(view.hide).toHaveBeenCalledTimes(1);
    expect(core.miss()).toBe('glow');
  });

  it('nowe zadanie zaczyna drabinę od nowa', () => {
    core.miss();
    advance(LOCK_MS);
    core.miss();
    advance(LOCK_MS);
    core.setTask({ key: 'b' });
    expect(core.miss()).toBe('glow');
  });
});

describe('blokada po błędzie', () => {
  beforeEach(() => core.setTask({ key: 'a' }));

  it('przez LOCK_MS kolejne błędy są ignorowane i nie wchodzą na drabinę', () => {
    core.miss();
    expect(core.locked).toBe(true);
    expect(core.miss()).toBe('ignored');
    advance(LOCK_MS - 50);
    expect(core.miss()).toBe('ignored');
    advance(50);
    expect(core.locked).toBe(false);
    expect(core.miss()).toBe('hint');
  });

  it('bez błędu nie ma blokady', () => {
    expect(core.locked).toBe(false);
    core.success();
    expect(core.locked).toBe(false);
  });
});

describe('koniec i sprzątanie', () => {
  it('finish: raz, chowa podpowiedzi, blokuje odpowiedzi i bezczynność', () => {
    core.setTask({ key: 'a' });
    core.miss();
    expect(core.finish()).toBe(true);
    expect(core.finish()).toBe(false);
    expect(core.done).toBe(true);
    expect(core.locked).toBe(true);
    expect(view.hide).toHaveBeenCalledTimes(1);
    advance(IDLE_MS * 2);
    expect(core.miss()).toBe('ignored');
    core.setTask({ key: 'b' });
    advance(IDLE_MS * 2);
    expect(cues()).toEqual(['glow']);
  });

  it('po destroy wszystkie wywołania są bezpieczne i nic nie pokazują', () => {
    core.setTask({ key: 'a' });
    core.destroy();
    core.destroy();
    expect(() => {
      core.setTask({ key: 'b' });
      core.activity();
      core.success();
      expect(core.miss()).toBe('ignored');
      expect(core.finish()).toBe(false);
    }).not.toThrow();
    advance(IDLE_MS * 2);
    expect(view.show).not.toHaveBeenCalled();
  });
});
