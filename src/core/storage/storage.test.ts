import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GameManifest } from '../types';
import { createMemoryStorage, createStore, getBrowserStorage, type StorageLike } from './storage';
import { DEFAULT_SETTINGS, loadSettings, sanitizeChildName, saveSettings } from './settings';
import { loadProgress, markCompleted, saveProgress } from './progress';
import { addPlayTime, EMPTY_SESSION, isSessionOver, NEW_SESSION_AFTER_MS, parseSession } from './sessionTime';

const manifest: GameManifest = {
  id: 'test',
  title: 'Test',
  description: 'Test',
  area: 'litery',
  input: ['keyboard'],
  age: [3, 5],
  icon: '<svg></svg>',
  levels: 5,
  skins: [
    { id: 'a', title: 'A' },
    { id: 'b', title: 'B' },
  ],
  order: 1,
};

/** Storage, który rzuca przy każdej operacji (jak Safari w trybie prywatnym). */
function brokenStorage(): StorageLike {
  const fail = () => {
    throw new Error('QuotaExceededError');
  };
  return { getItem: fail, setItem: fail, removeItem: fail, key: fail, length: 0 };
}

/** Trwały magazyn (bez znacznika `persistent`), jak prawdziwy localStorage. */
function durableStorage(): StorageLike {
  const memory = createMemoryStorage();
  return {
    getItem: memory.getItem,
    setItem: memory.setItem,
    removeItem: memory.removeItem,
    key: memory.key,
    get length() {
      return memory.length;
    },
  };
}

describe('createStore', () => {
  it('zapisuje i odczytuje wartości z prefiksem i wersją', () => {
    const backend = createMemoryStorage();
    const store = createStore(backend);
    store.set('x', { a: 1 });
    expect(store.get('x', null)).toEqual({ a: 1 });
    expect(backend.getItem('milegry:x')).toBe('{"v":1,"d":{"a":1}}');
  });

  it('zwraca fallback dla brakującego klucza i uszkodzonego JSON', () => {
    const backend = createMemoryStorage();
    const store = createStore(backend);
    expect(store.get('missing', 7)).toBe(7);
    backend.setItem('milegry:bad', '{oops');
    expect(store.get('bad', 'fb')).toBe('fb');
    backend.setItem('milegry:null', 'null');
    expect(store.get('null', 'fb')).toBe('fb');
    backend.setItem('milegry:nod', '{"v":1}');
    expect(store.get('nod', 'fb')).toBe('fb');
  });

  it('odczyt nie zależy od wersji koperty (inna wersja nie kasuje danych)', () => {
    const backend = createMemoryStorage();
    const store = createStore(backend);
    backend.setItem('milegry:old', '{"v":0,"d":123}');
    backend.setItem('milegry:new', '{"v":99,"d":456}');
    expect(store.get('old', 'fb')).toBe(123);
    expect(store.get('new', 'fb')).toBe(456);
  });

  it('zapisy w innej wersji koperty nie kasują ustawień ani postępu', () => {
    const backend = createMemoryStorage();
    backend.setItem('milegry:settings', '{"v":7,"d":{"tempo":"lively","childName":"Ola"}}');
    backend.setItem('milegry:progress:test', '{"v":7,"d":{"completed":[2],"lastLevel":3,"lastSkin":"b"}}');
    const store = createStore(backend);
    expect(loadSettings(store)).toEqual({ ...DEFAULT_SETTINGS, tempo: 'lively', childName: 'Ola' });
    expect(loadProgress(store, manifest)).toEqual({ completed: [2], lastLevel: 3, lastSkin: 'b' });
  });

  it('nie rzuca, gdy localStorage rzuca', () => {
    const store = createStore(brokenStorage());
    expect(() => store.set('x', 1)).not.toThrow();
    expect(store.get('x', 'fb')).toBe('fb');
    expect(() => store.remove('x')).not.toThrow();
    expect(() => store.clearAll()).not.toThrow();
  });

  it('clearAll() nie rzuca, gdy key() rzuca w trakcie przeglądania kluczy', () => {
    const removed: string[] = [];
    const backend: StorageLike = {
      getItem: () => null,
      setItem: () => {},
      removeItem: (k) => void removed.push(k),
      key: () => {
        throw new Error('SecurityError');
      },
      length: 3,
    };
    const store = createStore(backend);
    expect(() => store.clearAll()).not.toThrow();
    expect(removed).toEqual([]);
  });

  it('persistent: false dla pamięci i po nieudanym zapisie, true dla trwałego magazynu', () => {
    expect(createStore(createMemoryStorage()).persistent).toBe(false);
    expect(createStore(durableStorage()).persistent).toBe(true);

    const backend = durableStorage();
    const realSet = backend.setItem;
    let full = false;
    const store = createStore({
      ...backend,
      setItem: (k, v) => {
        if (full) throw new Error('QuotaExceededError');
        realSet(k, v);
      },
    });
    store.set('a', 1);
    expect(store.persistent).toBe(true);
    full = true;
    store.set('a', 2);
    expect(store.persistent).toBe(false);
    full = false;
    store.set('a', 3);
    expect(store.persistent).toBe(true);
  });

  it('scope() dzieli przestrzeń nazw', () => {
    const store = createStore(createMemoryStorage());
    const a = store.scope('game:a');
    const b = store.scope('game:b');
    a.set('k', 1);
    b.set('k', 2);
    expect(a.get('k', 0)).toBe(1);
    expect(b.get('k', 0)).toBe(2);
  });

  it('scope() nie myli klucza z dwukropkiem z inną przestrzenią nazw', () => {
    const store = createStore(createMemoryStorage());
    const outer = store.scope('game:a');
    const inner = store.scope('game:a:b');
    outer.set('b:c', 'zewnętrzny');
    inner.set('c', 'wewnętrzny');
    expect(outer.get('b:c', '')).toBe('zewnętrzny');
    expect(inner.get('c', '')).toBe('wewnętrzny');
    outer.remove('b:c');
    expect(inner.get('c', '')).toBe('wewnętrzny');
  });

  it('clearAll() usuwa wszystko poza wskazanymi kluczami i obcymi kluczami', () => {
    const backend = createMemoryStorage();
    backend.setItem('inna-aplikacja', 'zostaje');
    const store = createStore(backend);
    store.set('settings', 1);
    store.set('progress:a', 2);
    store.clearAll(['settings']);
    expect(store.get('settings', 0)).toBe(1);
    expect(store.get('progress:a', 0)).toBe(0);
    expect(backend.getItem('inna-aplikacja')).toBe('zostaje');
  });
});

describe('getBrowserStorage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('bez window daje zamiennik w pamięci', () => {
    expect(createStore(getBrowserStorage()).persistent).toBe(false);
  });

  it('gdy dostęp do localStorage rzuca, daje zamiennik w pamięci', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new Error('SecurityError');
      },
    });
    expect(createStore(getBrowserStorage()).persistent).toBe(false);
  });

  it('gdy zapis próbny się nie udaje, daje zamiennik w pamięci', () => {
    vi.stubGlobal('window', { localStorage: brokenStorage() });
    expect(createStore(getBrowserStorage()).persistent).toBe(false);
  });

  it('używa localStorage, gdy działa', () => {
    const ls = durableStorage();
    vi.stubGlobal('window', { localStorage: ls });
    const store = createStore(getBrowserStorage());
    store.set('x', 1);
    expect(store.persistent).toBe(true);
    expect(ls.getItem('milegry:x')).toBe('{"v":1,"d":1}');
  });
});

describe('settings', () => {
  it('zwraca domyślne przy braku zapisu i naprawia błędne pola', () => {
    const store = createStore(createMemoryStorage());
    expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    store.set('settings', { muted: 'tak', tempo: 'lively', inputMode: 'mysz', effectsVolume: 7, sessionLimit: 12 });
    expect(loadSettings(store)).toEqual({ ...DEFAULT_SETTINGS, tempo: 'lively', effectsVolume: 1 });
  });

  it('każde pole z osobna wraca do domyślnej wartości, gdy jest błędne', () => {
    const store = createStore(createMemoryStorage());
    const load = (patch: Record<string, unknown>) => {
      store.set('settings', patch);
      return loadSettings(store);
    };
    expect(load({ muted: 1 }).muted).toBe(DEFAULT_SETTINGS.muted);
    expect(load({ muted: true }).muted).toBe(true);
    expect(load({ tempo: 'turbo' }).tempo).toBe('calm');
    expect(load({ inputMode: null }).inputMode).toBe('auto');
    expect(load({ letterScript: 'gothic' }).letterScript).toBe('print');
    expect(load({ letterCase: 'title' }).letterCase).toBe('upper');
    expect(load({ sessionLimit: '15' }).sessionLimit).toBe(15);
    expect(load({ sessionLimit: 0 }).sessionLimit).toBe(0);
    expect(load({ sessionLimit: 25 }).sessionLimit).toBe(15);
    expect(load({ childName: 42 }).childName).toBe('');
    for (const v of [NaN, 'głośno', null, Infinity]) {
      expect(load({ effectsVolume: v }).effectsVolume).toBe(DEFAULT_SETTINGS.effectsVolume);
    }
    expect(load({ effectsVolume: -3 })).toMatchObject({ muted: true, effectsVolume: DEFAULT_SETTINGS.effectsVolume });
    expect(load({ effectsVolume: 0.25 }).effectsVolume).toBe(0.25);
    expect(load({ effectsVolume: 0.6 }).effectsVolume).toBe(0.6);
  });

  it('zapis z głośnością 0 to wyciszenie i głośność domyślna', () => {
    const store = createStore(createMemoryStorage());
    store.set('settings', { ...DEFAULT_SETTINGS, muted: false, effectsVolume: 0, tempo: 'medium' });
    expect(loadSettings(store)).toEqual({ ...DEFAULT_SETTINGS, muted: true, tempo: 'medium' });
    store.set('settings', { ...DEFAULT_SETTINGS, muted: true, effectsVolume: 0 });
    expect(loadSettings(store)).toEqual({ ...DEFAULT_SETTINGS, muted: true });
  });

  it('domyślna głośność to wartość przycisku „Średnio” (0,7)', () => {
    expect(DEFAULT_SETTINGS.effectsVolume).toBe(0.7);
  });

  it('zapis ustawień, który nie jest obiektem, daje ustawienia domyślne', () => {
    const store = createStore(createMemoryStorage());
    for (const junk of ['tekst', [1, 2], 42, true, null]) {
      store.set('settings', junk);
      expect(loadSettings(store)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('domyślnie: najwolniejsze tempo, drukowane WIELKIE, limit 15 min', () => {
    expect(DEFAULT_SETTINGS.tempo).toBe('calm');
    expect(DEFAULT_SETTINGS.letterScript).toBe('print');
    expect(DEFAULT_SETTINGS.letterCase).toBe('upper');
    expect(DEFAULT_SETTINGS.sessionLimit).toBe(15);
  });

  it('zapis i odczyt', () => {
    const store = createStore(createMemoryStorage());
    const s = { ...DEFAULT_SETTINGS, muted: true, tempo: 'medium' as const, inputMode: 'touch' as const, letterScript: 'both' as const, childName: 'Ola', sessionLimit: 30 as const };
    saveSettings(store, s);
    expect(loadSettings(store)).toEqual(s);
  });

  it('imię dziecka: tylko litery, krótkie, bez spacji na końcu', () => {
    expect(sanitizeChildName('  Łucja <b>  ')).toBe('Łucja b');
    expect(sanitizeChildName(42)).toBe('');
    expect(sanitizeChildName('a'.repeat(50))).toHaveLength(20);
    expect(sanitizeChildName(`${'a'.repeat(19)} bcd`)).toBe('a'.repeat(19));
  });
});

describe('czas sesji', () => {
  it('sumuje czas gry i kończy sesję po limicie', () => {
    let s = EMPTY_SESSION;
    s = addPlayTime(s, 0, 1_000);
    s = addPlayTime(s, 14 * 60_000, 2_000);
    expect(isSessionOver(s, 15, 3_000)).toBe(false);
    s = addPlayTime(s, 60_000, 4_000);
    expect(isSessionOver(s, 15, 5_000)).toBe(true);
    expect(isSessionOver(s, 0, 5_000)).toBe(false);
  });

  it('po długiej przerwie liczy od nowa', () => {
    let s = addPlayTime(EMPTY_SESSION, 20 * 60_000, 1_000);
    expect(isSessionOver(s, 15, 1_000 + NEW_SESSION_AFTER_MS + 1)).toBe(false);
    s = addPlayTime(s, 1_000, 1_000 + NEW_SESSION_AFTER_MS + 1);
    expect(s.playedMs).toBe(1_000);
  });

  it('parseSession odrzuca śmieci', () => {
    expect(parseSession({ playedMs: -5, lastActiveAt: 'x' })).toEqual(EMPTY_SESSION);
    expect(parseSession({ playedMs: NaN, lastActiveAt: Infinity })).toEqual(EMPTY_SESSION);
    for (const junk of [null, undefined, 'x', 7, [1]]) expect(parseSession(junk)).toEqual(EMPTY_SESSION);
    expect(parseSession({ playedMs: 5, lastActiveAt: 9 })).toEqual({ playedMs: 5, lastActiveAt: 9 });
  });

  it('limit liczy się od równego progu, a przerwa równa 30 min jeszcze należy do sesji', () => {
    const limit = 15 * 60_000;
    const s = { playedMs: limit, lastActiveAt: 1_000 };
    expect(isSessionOver({ ...s, playedMs: limit - 1 }, 15, 1_000)).toBe(false);
    expect(isSessionOver(s, 15, 1_000)).toBe(true);
    expect(isSessionOver(s, 15, 1_000 + NEW_SESSION_AFTER_MS)).toBe(true);
    expect(isSessionOver(s, 15, 1_001 + NEW_SESSION_AFTER_MS)).toBe(false);
    expect(addPlayTime(s, 500, 1_000 + NEW_SESSION_AFTER_MS).playedMs).toBe(limit + 500);
    expect(addPlayTime(s, 500, 1_001 + NEW_SESSION_AFTER_MS).playedMs).toBe(500);
  });

  it('znacznik z przyszłości (przestawiony zegar) nie blokuje gry — to nowa sesja', () => {
    const future = { playedMs: 60 * 60_000, lastActiveAt: 10_000_000 };
    expect(isSessionOver(future, 15, 1_000)).toBe(false);
    const next = addPlayTime(future, 2_000, 1_000);
    expect(next).toEqual({ playedMs: 2_000, lastActiveAt: 1_000 });
    expect(isSessionOver(next, 15, 2_000)).toBe(false);
  });

  it('przerwa przez północ krótsza niż 30 min nie zaczyna nowej sesji', () => {
    const before = new Date(2026, 5, 1, 23, 55).getTime();
    const after = new Date(2026, 5, 2, 0, 5).getTime();
    const s = addPlayTime(EMPTY_SESSION, 10 * 60_000, before);
    expect(addPlayTime(s, 6 * 60_000, after).playedMs).toBe(16 * 60_000);
  });

  it('nieskończony lub ujemny czas gry nie psuje sumy', () => {
    const s = { playedMs: 1_000, lastActiveAt: 1_000 };
    expect(addPlayTime(s, NaN, 2_000).playedMs).toBe(1_000);
    expect(addPlayTime(s, -50, 2_000).playedMs).toBe(1_000);
  });
});

describe('progress', () => {
  it('domyślnie: poziom 1, pierwsza skórka', () => {
    const store = createStore(createMemoryStorage());
    expect(loadProgress(store, manifest)).toEqual({ completed: [], lastLevel: 1, lastSkin: 'a' });
  });

  it('markCompleted dodaje poziom i przesuwa start na następny; ostatni poziom nie zmienia startu', () => {
    let p = loadProgress(createStore(createMemoryStorage()), manifest);
    p = markCompleted(p, 1, 5);
    p = markCompleted(p, 1, 5);
    expect(p.completed).toEqual([1]);
    expect(p.lastLevel).toBe(2);
    p = markCompleted(p, 5, 5);
    expect(p.completed).toEqual([1, 5]);
    expect(p.lastLevel).toBe(2);
    expect(markCompleted(p, 0, 5)).toEqual(p);
  });

  it('odrzuca śmieci z zapisu', () => {
    const store = createStore(createMemoryStorage());
    saveProgress(store, 'test', { completed: [1, 1, 99, -1, 3], lastLevel: 42, lastSkin: 'nie-ma' });
    expect(loadProgress(store, manifest)).toEqual({ completed: [1, 3], lastLevel: 1, lastSkin: 'a' });
  });

  it('odrzuca błędne typy pól i zapis, który nie jest obiektem', () => {
    const store = createStore(createMemoryStorage());
    const fresh = { completed: [], lastLevel: 1, lastSkin: 'a' };
    store.set('progress:test', { completed: 'x', lastLevel: '3', lastSkin: 7 });
    expect(loadProgress(store, manifest)).toEqual(fresh);
    store.set('progress:test', { completed: [1.5, '2', null, 4], lastLevel: 2.5 });
    expect(loadProgress(store, manifest)).toEqual({ ...fresh, completed: [4] });
    for (const junk of ['x', 3, [1], null]) {
      store.set('progress:test', junk);
      expect(loadProgress(store, manifest)).toEqual(fresh);
    }
  });

  it('gra bez poziomów i bez skórek: poziom 0, pusta skórka', () => {
    const store = createStore(createMemoryStorage());
    saveProgress(store, 'test', { completed: [1], lastLevel: 1, lastSkin: 'a' });
    expect(loadProgress(store, { ...manifest, levels: 0, skins: undefined })).toEqual({ completed: [], lastLevel: 0, lastSkin: '' });
  });
});
