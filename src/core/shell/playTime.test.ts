import { describe, expect, it } from 'vitest';
import { createMemoryStorage, createStore } from '../storage/storage';
import { NEW_SESSION_AFTER_MS, SESSION_KEY } from '../storage/sessionTime';
import { createPlayTime, SAVE_EVERY_MS, sessionTimeText } from './playTime';

function setup() {
  const store = createStore(createMemoryStorage());
  let writes = 0;
  const set = store.set;
  store.set = (key, value) => {
    writes++;
    set(key, value);
  };
  return { store, playTime: createPlayTime(store), writes: () => writes };
}

describe('czas gry', () => {
  it('zapisuje rzadko, nie przy każdym tyknięciu', () => {
    const { playTime, writes } = setup();
    for (let i = 0; i < 14; i++) playTime.record(1000, 1000 + i);
    expect(writes()).toBe(0);
    playTime.record(1000, 2000);
    expect(writes()).toBe(1);
    for (let i = 0; i < 14; i++) playTime.record(1000, 3000 + i);
    expect(writes()).toBe(1);
  });

  it('flush zapisuje zaległy czas raz, a bez zmian nic nie zapisuje', () => {
    const { store, playTime, writes } = setup();
    playTime.record(3000, 5000);
    playTime.flush();
    playTime.flush();
    expect(writes()).toBe(1);
    expect(store.get(SESSION_KEY, null)).toEqual({ playedMs: 3000, lastActiveAt: 5000 });
  });

  it('limit liczy też zaległy czas z pamięci, a nowa instancja czyta tylko zapisany', () => {
    const { store, playTime } = setup();
    const limitMin = (SAVE_EVERY_MS + 1000) / 60_000;
    playTime.record(SAVE_EVERY_MS, 1000);
    playTime.record(1000, 2000);
    expect(playTime.isOver(limitMin, 2000)).toBe(true);
    expect(createPlayTime(store).isOver(limitMin, 2000)).toBe(false);
    expect(createPlayTime(store).isOver(SAVE_EVERY_MS / 60_000, 2000)).toBe(true);
  });

  it('elapsedMs: naliczony czas bieżącej sesji, także niezapisany', () => {
    const { playTime } = setup();
    expect(playTime.elapsedMs(1000)).toBe(0);
    playTime.record(3000, 5000);
    expect(playTime.elapsedMs(5000)).toBe(3000);
    expect(playTime.elapsedMs(5000 + NEW_SESSION_AFTER_MS)).toBe(3000);
  });

  it('elapsedMs: po pół godzinie przerwy (albo zegarze cofniętym) sesja liczy się od zera', () => {
    const { playTime } = setup();
    playTime.record(3000, 5000);
    expect(playTime.elapsedMs(5001 + NEW_SESSION_AFTER_MS)).toBe(0);
    expect(playTime.elapsedMs(4000)).toBe(0);
  });

  it('elapsedMs: po resecie zero', () => {
    const { playTime } = setup();
    playTime.record(SAVE_EVERY_MS, 1000);
    playTime.reset();
    expect(playTime.elapsedMs(1000)).toBe(0);
  });

  it('tekst czasu sesji: poniżej minuty „mniej niż minuta”, dalej zaokrąglone minuty', () => {
    expect(sessionTimeText(0)).toBe('W tej sesji: mniej niż minuta');
    expect(sessionTimeText(59_999)).toBe('W tej sesji: mniej niż minuta');
    expect(sessionTimeText(60_000)).toBe('W tej sesji: ok. 1 min');
    expect(sessionTimeText(89_999)).toBe('W tej sesji: ok. 1 min');
    expect(sessionTimeText(90_000)).toBe('W tej sesji: ok. 2 min');
    expect(sessionTimeText(215_714)).toBe('W tej sesji: ok. 4 min');
  });

  it('reset zeruje czas w pamięci i na dysku', () => {
    const { store, playTime } = setup();
    playTime.record(SAVE_EVERY_MS, 1000);
    playTime.reset();
    expect(playTime.isOver(0.25, 1000)).toBe(false);
    expect(store.get(SESSION_KEY, null)).toEqual({ playedMs: 0, lastActiveAt: 0 });
  });
});
