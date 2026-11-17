import type { GameStorage } from '../types';

/**
 * Magazyn na localStorage, odporny na wyjątki
 * (tryb prywatny, przepełnienie, zablokowane ciasteczka, uszkodzony JSON).
 *
 * Klucze w localStorage: `milegry:<nazwa>`, wartość: `{"v":<wersja koperty>,"d":<dane>}`.
 * `v` to tylko znacznik formatu na przyszłość (nic go dziś nie czyta; test pilnuje literalnego JSON-a).
 * Odczyt nie sprawdza wersji koperty i nie waliduje kształtu `d` — za kształt danych odpowiada ich
 * czytelnik (`loadSettings`, `loadProgress`, gra), który waliduje każde pole i podstawia wartości
 * domyślne. Dzięki temu zmiana formatu jednego klucza nie kasuje ustawień ani postępu pozostałych.
 */
export const STORAGE_PREFIX = 'milegry:';
const ENVELOPE_VERSION = 1;

/** Minimalny interfejs Storage — pozwala testować bez przeglądarki. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
  /** `false` — dane znikną po zamknięciu strony (zamiennik w pamięci). Brak pola = trwały. */
  readonly persistent?: boolean;
}

export interface Store extends GameStorage {
  /** `false`, gdy zapis nie przeżyje odświeżenia strony (brak localStorage lub ostatni zapis się nie udał; udany zapis przywraca `true`). */
  readonly persistent: boolean;
  /** Magazyn w podprzestrzeni nazw: klucze `<namespace>:<key>`. */
  scope(namespace: string): GameStorage;
  /** Usuwa wszystkie klucze Miłych Gier poza podanymi (pełne nazwy bez prefiksu). */
  clearAll(keep?: string[]): void;
}

/** Zwykły słownik w pamięci — gdy localStorage niedostępny. */
export function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    persistent: false,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

/** Bezpieczny dostęp do window.localStorage (sam dostęp potrafi rzucić wyjątek). */
export function getBrowserStorage(): StorageLike {
  try {
    const ls = window.localStorage;
    const probe = `${STORAGE_PREFIX}__probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return ls;
  } catch {
    return createMemoryStorage();
  }
}

export function createStore(backend: StorageLike): Store {
  const fullKey = (key: string) => STORAGE_PREFIX + key;
  const backendPersistent = backend.persistent !== false;
  // Flaga opisuje OSTATNI zapis: udany zapis po serii nieudanych przywraca `true` (świadomie — liczy się,
  // czy bieżący stan da się zapisać; utraconych wcześniej wartości i tak nie ma jak odtworzyć).
  // Panel rodzica czyta ją przy renderowaniu, więc ostrzega o stanie z chwili wejścia.
  let persistent = backendPersistent;

  function get<T>(key: string, fallback: T): T {
    try {
      const raw = backend.getItem(fullKey(key));
      if (raw === null) return fallback;
      const parsed = JSON.parse(raw) as { d?: unknown } | null;
      if (!parsed || typeof parsed !== 'object' || !('d' in parsed)) return fallback;
      return parsed.d as T;
    } catch {
      return fallback;
    }
  }

  function set<T>(key: string, value: T): void {
    try {
      backend.setItem(fullKey(key), JSON.stringify({ v: ENVELOPE_VERSION, d: value }));
      persistent = backendPersistent;
    } catch {
      // brak miejsca / tryb prywatny — gra działa dalej bez zapisu
      persistent = false;
    }
  }

  function remove(key: string): void {
    try {
      backend.removeItem(fullKey(key));
    } catch {
      // ignorujemy
    }
  }

  function scope(namespace: string): GameStorage {
    // Klucz kodowany, by „:” w kluczu nie wchodziło w przestrzeń nazw innego scope'u.
    const k = (key: string) => `${namespace}:${encodeURIComponent(key)}`;
    return {
      get: (key, fallback) => get(k(key), fallback),
      set: (key, value) => set(k(key), value),
      remove: (key) => remove(k(key)),
    };
  }

  function clearAll(keep: string[] = []): void {
    try {
      const keepFull = new Set(keep.map(fullKey));
      const toRemove: string[] = [];
      for (let i = 0; i < backend.length; i++) {
        const key = backend.key(i);
        if (key && key.startsWith(STORAGE_PREFIX) && !keepFull.has(key)) toRemove.push(key);
      }
      toRemove.forEach((key) => backend.removeItem(key));
    } catch {
      // ignorujemy
    }
  }

  return {
    get persistent() {
      return persistent;
    },
    get,
    set,
    remove,
    scope,
    clearAll,
  };
}
