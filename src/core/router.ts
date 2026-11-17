/**
 * Routing na History API. Adresy (względem base):
 *   /            → hub
 *   /<id>/       → gra
 *   /rodzice/    → panel rodzica
 * Każdy z tych adresów istnieje w dist/ jako prawdziwy plik index.html (scripts/postbuild.mjs).
 */
export type Route = { name: 'hub' } | { name: 'game'; id: string } | { name: 'parents' };

export const PARENTS_SEGMENT = 'rodzice';

/** Normalizuje base do postaci '/…/' (zawsze ze slashem na początku i końcu). */
export function normalizeBase(base: string): string {
  const trimmed = base.trim().replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? '/' : `/${trimmed}/`;
}

/**
 * Zamienia ścieżkę z paska adresu na trasę. Nieznane ścieżki → null
 * (wołający decyduje: zwykle przekierowanie do huba).
 */
export function parsePath(pathname: string, base: string): Route | null {
  const b = normalizeBase(base);
  let path = pathname;
  // '/gry' (bez końcowego slasha) też traktujemy jak base.
  if (path === b.slice(0, -1)) path = b;
  if (!path.startsWith(b)) return null;
  const rest = path.slice(b.length).replace(/index\.html$/, '');
  const segments = rest.split('/').filter((s) => s !== '');
  if (segments.length === 0) return { name: 'hub' };
  if (segments.length > 1) return null;
  let segment: string;
  try {
    segment = decodeURIComponent(segments[0] as string);
  } catch {
    return null;
  }
  if (segment === PARENTS_SEGMENT) return { name: 'parents' };
  if (/^[a-z0-9-]+$/.test(segment)) return { name: 'game', id: segment };
  return null;
}

/** Trasa → ścieżka (zawsze z końcowym slashem, zgodnie z plikami w dist/). */
export function buildPath(route: Route, base: string): string {
  const b = normalizeBase(base);
  switch (route.name) {
    case 'hub':
      return b;
    case 'parents':
      return `${b}${PARENTS_SEGMENT}/`;
    case 'game':
      return `${b}${route.id}/`;
  }
}

export interface Router {
  readonly current: Route;
  navigate(route: Route): void;
}

/**
 * Router przeglądarkowy. `onChange` dostaje trasę po każdej zmianie (także wstecz/dalej).
 * `isKnownGame` pozwala przekierować nieznane gry do huba.
 */
export function createRouter(base: string, isKnownGame: (id: string) => boolean, onChange: (route: Route) => void): Router {
  const resolve = (): Route => {
    const route = parsePath(window.location.pathname, base);
    if (!route || (route.name === 'game' && !isKnownGame(route.id))) return { name: 'hub' };
    return route;
  };

  let current = resolve();
  const canonical = buildPath(current, base);
  if (window.location.pathname !== canonical) {
    window.history.replaceState(null, '', canonical + window.location.search);
  }

  window.addEventListener('popstate', () => {
    current = resolve();
    onChange(current);
  });

  return {
    get current() {
      return current;
    },
    navigate(route) {
      const path = buildPath(route, base);
      if (path !== window.location.pathname) window.history.pushState(null, '', path);
      current = route;
      onChange(route);
    },
  };
}
