import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPath, createRouter, normalizeBase, parsePath, type Route } from './router';

describe('normalizeBase', () => {
  it('zawsze daje /…/', () => {
    expect(normalizeBase('/')).toBe('/');
    expect(normalizeBase('')).toBe('/');
    expect(normalizeBase('gry')).toBe('/gry/');
    expect(normalizeBase('/gry')).toBe('/gry/');
    expect(normalizeBase('/a/b/')).toBe('/a/b/');
  });
});

describe('parsePath', () => {
  it('rozpoznaje trasy przy base /', () => {
    expect(parsePath('/', '/')).toEqual({ name: 'hub' });
    expect(parsePath('/index.html', '/')).toEqual({ name: 'hub' });
    expect(parsePath('/literki/', '/')).toEqual({ name: 'game', id: 'literki' });
    expect(parsePath('/literki', '/')).toEqual({ name: 'game', id: 'literki' });
    expect(parsePath('/literki/index.html', '/')).toEqual({ name: 'game', id: 'literki' });
    expect(parsePath('/rodzice/', '/')).toEqual({ name: 'parents' });
  });

  it('respektuje base', () => {
    expect(parsePath('/gry/', '/gry/')).toEqual({ name: 'hub' });
    expect(parsePath('/gry', '/gry/')).toEqual({ name: 'hub' });
    expect(parsePath('/gry/literki/', '/gry/')).toEqual({ name: 'game', id: 'literki' });
    expect(parsePath('/gry/rodzice/', '/gry/')).toEqual({ name: 'parents' });
    expect(parsePath('/literki/', '/gry/')).toBeNull();
  });

  it('odrzuca dziwne ścieżki', () => {
    expect(parsePath('/a/b/', '/')).toBeNull();
    expect(parsePath('/Literki/', '/')).toBeNull();
    expect(parsePath('/../x/', '/')).toBeNull();
    expect(parsePath('/%E0/', '/')).toBeNull();
  });
});

describe('buildPath', () => {
  it('buduje ścieżki z końcowym slashem i jest odwrotnością parsePath', () => {
    const routes: Route[] = [{ name: 'hub' }, { name: 'parents' }, { name: 'game', id: 'literki' }];
    for (const base of ['/', '/gry/']) {
      for (const route of routes) {
        const path = buildPath(route, base);
        expect(path.endsWith('/')).toBe(true);
        expect(parsePath(path, base)).toEqual(route);
      }
    }
    expect(buildPath({ name: 'game', id: 'literki' }, '/gry/')).toBe('/gry/literki/');
  });
});

/** Podstawiony `window`: pasek adresu, historia i nasłuch popstate. */
function fakeWindow(pathname: string, search = '') {
  const location = { pathname, search };
  const listeners: (() => void)[] = [];
  const setPath = (_state: unknown, _title: string, url: string) => {
    const [path = '', query = ''] = url.split('?');
    location.pathname = path;
    location.search = query ? `?${query}` : '';
  };
  const history = { pushState: vi.fn(setPath), replaceState: vi.fn(setPath) };
  const win = {
    location,
    history,
    addEventListener: (type: string, fn: () => void) => {
      if (type === 'popstate') listeners.push(fn);
    },
  };
  vi.stubGlobal('window', win);
  return {
    location,
    history,
    /** Przycisk wstecz: przeglądarka zmienia adres i wysyła popstate. */
    back(path: string) {
      location.pathname = path;
      listeners.forEach((fn) => fn());
    },
  };
}

describe('createRouter', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  const isKnown = (id: string) => id === 'literki';

  it('dopisuje końcowy slash z zachowaniem base i parametrów', () => {
    const w = fakeWindow('/gry/literki', '?x=1');
    const router = createRouter('/gry/', isKnown, () => {});
    expect(router.current).toEqual({ name: 'game', id: 'literki' });
    expect(w.history.replaceState).toHaveBeenCalledWith(null, '', '/gry/literki/?x=1');
    expect(w.location.pathname).toBe('/gry/literki/');
  });

  it('parametry poziomu zostają w adresie i są czytelne po kanonizacji', () => {
    const w = fakeWindow('/gry/literki', '?poziom=5&obrazki=owoce');
    createRouter('/gry/', isKnown, () => {});
    expect(w.location.pathname).toBe('/gry/literki/');
    expect(w.location.search).toBe('?poziom=5&obrazki=owoce');
    const canonical = fakeWindow('/gry/literki/', '?poziom=5');
    createRouter('/gry/', isKnown, () => {});
    expect(canonical.history.replaceState).not.toHaveBeenCalled();
    expect(canonical.location.search).toBe('?poziom=5');
  });

  it('nie przepisuje adresu, który już jest kanoniczny', () => {
    const w = fakeWindow('/gry/rodzice/');
    expect(createRouter('/gry/', isKnown, () => {}).current).toEqual({ name: 'parents' });
    expect(w.history.replaceState).not.toHaveBeenCalled();
  });

  it('nieznana gra i zepsuty adres prowadzą do huba z przepisaniem adresu', () => {
    for (const path of ['/gry/nie-ma-takiej/', '/gry/%E0/', '/inne/']) {
      const w = fakeWindow(path);
      expect(createRouter('/gry/', isKnown, () => {}).current).toEqual({ name: 'hub' });
      expect(w.location.pathname).toBe('/gry/');
    }
  });

  it('navigate dodaje wpis historii tylko przy zmianie adresu, ale zawsze woła onChange', () => {
    const w = fakeWindow('/');
    const onChange = vi.fn();
    const router = createRouter('/', isKnown, onChange);
    router.navigate({ name: 'game', id: 'literki' });
    expect(w.history.pushState).toHaveBeenCalledWith(null, '', '/literki/');
    expect(router.current).toEqual({ name: 'game', id: 'literki' });
    router.navigate({ name: 'game', id: 'literki' });
    expect(w.history.pushState).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('przycisk wstecz zmienia trasę i woła onChange', () => {
    const w = fakeWindow('/literki/');
    const onChange = vi.fn();
    const router = createRouter('/', isKnown, onChange);
    w.back('/');
    expect(router.current).toEqual({ name: 'hub' });
    expect(onChange).toHaveBeenLastCalledWith({ name: 'hub' });
    w.back('/nie-ma-takiej/');
    expect(onChange).toHaveBeenLastCalledWith({ name: 'hub' });
  });
});
