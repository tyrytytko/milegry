import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Intent } from '../types';
import { createGameInput } from './gameInput';
import { EXIT_HOLD_MS, MOVE_REPEAT_MS, createInputHub, type InputHub, type InputSink } from './inputHub';

/** Atrapa celu zdarzeń: zapamiętuje nasłuchy i pozwala „wystrzelić” zdarzenie z dowolnym obiektem. */
function fakeTarget() {
  const listeners = new Map<string, Set<(event: unknown) => void>>();
  return {
    addEventListener(type: string, fn: (event: unknown) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(fn);
    },
    removeEventListener(type: string, fn: (event: unknown) => void) {
      listeners.get(type)?.delete(fn);
    },
    fire(type: string, event: unknown) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn(event);
    },
  };
}

let win: ReturnType<typeof fakeTarget>;
let hub: InputHub;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance'] });
  win = fakeTarget();
  vi.stubGlobal('window', win);
  for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement', 'HTMLButtonElement', 'HTMLAnchorElement']) {
    vi.stubGlobal(name, class {});
  }
  hub = createInputHub();
});

afterEach(() => {
  hub.destroy();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function keyEvent(key: string, extra: Record<string, unknown> = {}) {
  return {
    key,
    code: /^[a-z]$/.test(key) ? `Key${key.toUpperCase()}` : key,
    repeat: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    isComposing: false,
    target: null,
    getModifierState: () => false,
    preventDefault: vi.fn(),
    ...extra,
  };
}

const down = (key: string, extra?: Record<string, unknown>) => {
  const event = keyEvent(key, extra);
  win.fire('keydown', event);
  return event;
};
const up = (key: string) => win.fire('keyup', keyEvent(key));
const tap = (key: string) => {
  down(key);
  up(key);
};
const wait = (ms: number) => vi.advanceTimersByTime(ms);

function gameSink(extra: Partial<InputSink> = {}) {
  const got: Intent[] = [];
  const sink: InputSink = { onIntent: (i) => got.push(i), exitMode: 'hold', captureKeys: true, ...extra };
  return { sink, got, remove: hub.push(sink) };
}

/** Wali klawiszami po kolei co `intervalMs` przez `totalMs`. */
function mash(keys: string[], intervalMs: number, totalMs: number) {
  for (let t = 0, i = 0; t < totalMs; t += intervalMs, i++) {
    tap(keys[i % keys.length] as string);
    wait(intervalMs);
  }
}

describe('inputHub — odpowiedzi i strażnik walenia (Z-21)', () => {
  it('odpowiedź dociera po 300 ms, tylko do wierzchniego odbiorcy', () => {
    const game = gameSink();
    tap('a');
    wait(299);
    expect(game.got).toEqual([]);
    wait(1);
    expect(game.got).toEqual([{ type: 'letter', value: 'A' }]);

    tap('b');
    const overlay = gameSink({ exitMode: 'press', captureKeys: false });
    wait(1000);
    expect(game.got).toHaveLength(1);
    expect(overlay.got).toEqual([]);
  });

  it('spokojne odpowiedzi docierają wszystkie, także ta sama litera co 250 ms', () => {
    const game = gameSink();
    for (const k of ['a', 'b', 'c']) {
      tap(k);
      wait(600);
    }
    tap('d');
    wait(250);
    tap('d');
    wait(1000);
    expect(game.got.map((i) => (i.type === 'letter' ? i.value : '?')).join('')).toBe('ABCDD');
  });

  it('walenie dłonią: 3 różne klawisze w < 300 ms → cała wstrzymana seria przepada', () => {
    const game = gameSink();
    tap('a');
    wait(100);
    tap('s');
    wait(100);
    tap('d');
    wait(2000);
    expect(game.got).toEqual([]);
  });

  it.each([7, 10, 20])('walenie przez 5 s z tempem %i naciśnięć/s → nic się nie zalicza', (hz) => {
    const game = gameSink();
    mash(['a', 's', 'd', 'f', 'j', 'k', '1', ' '], 1000 / hz, 5000);
    wait(2000);
    expect(game.got).toEqual([]);
  });

  it('bębnienie dwoma klawiszami przez 3 s → nic się nie zalicza', () => {
    const game = gameSink();
    mash(['a', 's'], 70, 3000);
    wait(2000);
    expect(game.got).toEqual([]);
  });

  it('pierwsza odpowiedź po waleniu i chwili spokoju dociera', () => {
    const game = gameSink();
    mash(['a', 's', 'd', 'f', 'j', 'k'], 60, 500);
    wait(750);
    tap('m');
    wait(300);
    expect(game.got).toEqual([{ type: 'letter', value: 'M' }]);
  });

  it('stukanie w strzałkę co 250 ms: każdy krok dociera od razu', () => {
    const game = gameSink();
    for (let i = 1; i <= 8; i++) {
      tap('ArrowRight');
      expect(game.got).toHaveLength(i);
      wait(250);
    }
  });

  it('odbicie strzałki liczy się od przyjętego naciśnięcia', () => {
    const game = gameSink();
    tap('ArrowRight');
    wait(150);
    tap('ArrowRight'); // odbicie
    wait(150);
    tap('ArrowRight'); // 300 ms od przyjętego → krok
    expect(game.got).toHaveLength(2);
  });

  it('blokuje domyślne działanie przeglądarki wg odbiorcy', () => {
    gameSink();
    expect(down('Tab').preventDefault).toHaveBeenCalled();
    expect(down('a').preventDefault).toHaveBeenCalled();
    expect(down('c', { ctrlKey: true }).preventDefault).not.toHaveBeenCalled();
    gameSink({ exitMode: 'press', captureKeys: false });
    expect(down('Tab').preventDefault).not.toHaveBeenCalled();
    expect(down('/').preventDefault).toHaveBeenCalled();
  });
});

describe('inputHub — Escape (Z-28)', () => {
  it('gra zamyka się po przytrzymaniu Escape 1,5 s', () => {
    const onExit = vi.fn();
    const onExitHold = vi.fn();
    gameSink({ onExit, onExitHold });
    down('Escape');
    expect(onExitHold).toHaveBeenLastCalledWith(true);
    wait(EXIT_HOLD_MS - 1);
    expect(onExit).not.toHaveBeenCalled();
    wait(1);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('krótsze przytrzymanie nie zamyka gry', () => {
    const onExit = vi.fn();
    const onExitHold = vi.fn();
    gameSink({ onExit, onExitHold });
    down('Escape');
    wait(1000);
    up('Escape');
    expect(onExitHold).toHaveBeenLastCalledWith(false);
    wait(2000);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('Escape działa także w blokadzie po waleniu', () => {
    const onExit = vi.fn();
    gameSink({ onExit });
    mash(['a', 's', 'd'], 50, 300);
    down('Escape');
    wait(EXIT_HOLD_MS);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('okno zamyka się od razu', () => {
    const onExit = vi.fn();
    gameSink({ exitMode: 'press', captureKeys: false, onExit });
    down('Escape');
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe('inputHub — powolne powtarzanie ruchu', () => {
  it('przytrzymana strzałka powtarza ruch co MOVE_REPEAT_MS, do puszczenia', () => {
    const game = gameSink({ moveRepeat: () => true });
    down('ArrowUp');
    expect(game.got).toHaveLength(1);
    wait(MOVE_REPEAT_MS - 1);
    down('ArrowUp', { repeat: true }); // auto-repeat systemu nic nie zmienia
    expect(game.got).toHaveLength(1);
    wait(1);
    expect(game.got).toHaveLength(2);
    wait(MOVE_REPEAT_MS);
    expect(game.got).toHaveLength(3);
    up('ArrowUp');
    wait(2000);
    expect(game.got).toHaveLength(3);
  });

  it('bez włączonego powtarzania przytrzymanie daje jeden ruch', () => {
    const game = gameSink();
    down('ArrowUp');
    wait(2000);
    expect(game.got).toHaveLength(1);
  });

  it('dPad (repeatMove) używa tego samego mechanizmu i zatrzymuje się przy oknie', () => {
    const game = gameSink({ moveRepeat: () => true });
    const stop = hub.repeatMove(game.sink, 'left');
    wait(MOVE_REPEAT_MS * 2);
    expect(game.got).toEqual([
      { type: 'move', dir: 'left' },
      { type: 'move', dir: 'left' },
    ]);
    stop();
    wait(2000);
    expect(game.got).toHaveLength(2);

    hub.repeatMove(game.sink, 'left');
    gameSink({ exitMode: 'press' });
    wait(2000);
    expect(game.got).toHaveLength(2);
  });
});

describe('gameInput', () => {
  function setup() {
    const root = { ...fakeTarget(), contains: (el: { inRoot?: boolean }) => el.inRoot === true, getBoundingClientRect: () => ({ left: 10, top: 20 }) };
    const onExit = vi.fn();
    const input = createGameInput({ hub, mode: 'touch', root: root as unknown as HTMLElement, onExit, onExitHold: () => {} });
    const got: Intent[] = [];
    input.on((i) => got.push(i));
    const hit = { inRoot: true, getAttribute: () => 'jajko' };
    const pointer = (pointerId: number, isPrimary: boolean, extra: Record<string, unknown> = {}) =>
      root.fire('pointerdown', {
        button: 0, pointerId, isPrimary, pointerType: 'touch', width: 10, height: 10,
        clientX: 50, clientY: 60, target: { closest: () => hit }, ...extra,
      });
    const lift = (pointerId: number) => win.fire('pointerup', { pointerId });
    return { input, got, onExit, pointer, lift };
  }

  it('dotyk elementu data-target → intencja pointer z pozycją względem root', () => {
    const { got, pointer } = setup();
    pointer(1, true);
    expect(got).toEqual([{ type: 'pointer', target: 'jajko', x: 40, y: 40 }]);
  });

  it('liczy się tylko pierwszy palec, do jego podniesienia; dłoń jest ignorowana', () => {
    const { got, pointer, lift } = setup();
    pointer(1, true);
    pointer(2, false);
    expect(got).toHaveLength(1);
    lift(1);
    pointer(3, true);
    expect(got).toHaveLength(2);
    lift(3);
    pointer(4, true, { width: 60, height: 60 });
    expect(got).toHaveLength(2);
  });

  it('zgubiony koniec dotyku nie blokuje następnych dotknięć', () => {
    const { got, pointer } = setup();
    pointer(1, true); // przeglądarka nie przysłała pointerup
    pointer(2, true);
    expect(got).toHaveLength(2);
  });

  it('klawiatura dociera do gry, Escape przytrzymany 1,5 s ją zamyka', () => {
    const { got, onExit } = setup();
    tap('a');
    wait(300);
    expect(got).toEqual([{ type: 'letter', value: 'A' }]);
    down('Escape');
    wait(EXIT_HOLD_MS);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('repeatMove (dPad) powtarza ruch w czasie rzeczywistym tylko po włączeniu powtarzania', () => {
    const { input, got } = setup();
    input.repeatMove('down');
    wait(2000);
    expect(got).toEqual([]);

    input.setMoveRepeat(true);
    const stop = input.repeatMove('down');
    wait(MOVE_REPEAT_MS * 3);
    expect(got).toHaveLength(3);
    stop();
    wait(2000);
    expect(got).toHaveLength(3);
  });

  it('po destroy nic nie dociera', () => {
    const { input, got, pointer } = setup();
    input.destroy();
    tap('a');
    wait(300);
    pointer(1, true);
    input.emit({ type: 'confirm' });
    expect(got).toEqual([]);
  });
});

describe('Spacja i Enter na linku poza grą (hub)', () => {
  const link = () => Object.assign(new (globalThis.HTMLAnchorElement as unknown as new () => object)(), { click: vi.fn() });

  it('Spacja na kafelku-linku otwiera go jak Enter i nie przewija strony', () => {
    const { got } = gameSink({ captureKeys: false, exitMode: 'press' });
    const target = link();
    const event = down(' ', { target });
    expect(target.click).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
    wait(400);
    expect(got).toEqual([]);
  });

  it('Enter na linku zostaje przeglądarce', () => {
    gameSink({ captureKeys: false, exitMode: 'press' });
    const target = link();
    const event = down('Enter', { target });
    expect(target.click).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

describe('data-last-input', () => {
  it('klawisz ustawia „keyboard”, tapnięcie „pointer”', () => {
    const root = { dataset: {} as Record<string, string> };
    vi.stubGlobal('document', { documentElement: root });
    gameSink();
    tap('ArrowLeft');
    expect(root.dataset.lastInput).toBe('keyboard');
    win.fire('pointerdown', { pointerType: 'touch' });
    expect(root.dataset.lastInput).toBe('pointer');
  });

  /** Ramkę wyboru odsłaniają tylko klawisze nawigacji — litera, cyfra czy przypadkowy klawisz nie. */
  function setupRoot() {
    const root = { dataset: { lastInput: 'pointer' } as Record<string, string> };
    vi.stubGlobal('document', { documentElement: root });
    return root;
  }

  it.each(['a', 'ą', '1', 'Backspace', ',', 'Shift', 'F5'])('klawisz „%s” nie zmienia trybu na „keyboard”', (k) => {
    const root = setupRoot();
    gameSink();
    tap(k);
    wait(1000);
    expect(root.dataset.lastInput).toBe('pointer');
  });

  it('litera dociera do gry, ale tryb zostaje „pointer”', () => {
    const root = setupRoot();
    const game = gameSink();
    tap('m');
    wait(300);
    expect(game.got).toEqual([{ type: 'letter', value: 'M' }]);
    expect(root.dataset.lastInput).toBe('pointer');
  });

  it.each(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])('strzałka „%s” od razu ustawia „keyboard”', (k) => {
    const root = setupRoot();
    gameSink();
    tap(k);
    expect(root.dataset.lastInput).toBe('keyboard');
  });

  it.each([' ', 'Enter'])('„%s” w grze ustawia „keyboard” dopiero po doręczeniu', (k) => {
    const root = setupRoot();
    const game = gameSink();
    tap(k);
    expect(root.dataset.lastInput).toBe('pointer');
    wait(300);
    expect(game.got).toEqual([{ type: 'confirm' }]);
    expect(root.dataset.lastInput).toBe('keyboard');
  });

  it('Tab: w grze (zablokowany) nie zmienia trybu; poza grą (przenosi fokus) ustawia „keyboard”', () => {
    const root = setupRoot();
    const game = gameSink();
    tap('Tab');
    expect(root.dataset.lastInput).toBe('pointer');
    game.remove();
    gameSink({ exitMode: 'press', captureKeys: false });
    tap('Tab');
    expect(root.dataset.lastInput).toBe('keyboard');
  });

  it('Enter i Spacja na linku poza grą (hub) ustawiają „keyboard”', () => {
    const root = setupRoot();
    gameSink({ captureKeys: false, exitMode: 'press' });
    const link = Object.assign(new (globalThis.HTMLAnchorElement as unknown as new () => object)(), { click: vi.fn() });
    down('Enter', { target: link });
    expect(root.dataset.lastInput).toBe('keyboard');
    root.dataset.lastInput = 'pointer';
    down(' ', { target: link });
    expect(root.dataset.lastInput).toBe('keyboard');
  });
});
