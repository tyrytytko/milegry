import { describe, expect, it } from 'vitest';
// @ts-expect-error — skrypt narzędziowy bez typów
import { assertReserved, CSP, htaccess, withMeta } from './postbuild.mjs';

const TEMPLATE = '<head><title>Miłe Gry</title><meta name="description" content="Opis huba." /></head>';

describe('withMeta', () => {
  it('podmienia tytuł i opis, escapując HTML', () => {
    const html = withMeta(TEMPLATE, 'A & B — Miłe Gry', 'Opis "gry" <b>');
    expect(html).toContain('<title>A &amp; B — Miłe Gry</title>');
    expect(html).toContain('<meta name="description" content="Opis &quot;gry&quot; &lt;b&gt;" />');
    expect(html).not.toContain('Opis huba.');
  });

  it('rzuca czytelny błąd, gdy w szablonie brak <title> albo opisu', () => {
    expect(() => withMeta('<head><meta name="description" content="x" /></head>', 't', 'd')).toThrow(/brak <title>/);
    expect(() => withMeta('<head><title>x</title><meta content="x" name="description" /></head>', 't', 'd')).toThrow(
      /meta name="description"/,
    );
  });
});

describe('assertReserved', () => {
  it('przechodzi, gdy katalogi budowania są zarezerwowane', () => {
    expect(() => assertReserved(['rodzice', 'assets', 'licencje', 'index'], ['rodzice', 'assets', 'licencje'])).not.toThrow();
  });

  it('rzuca z listą brakujących katalogów', () => {
    expect(() => assertReserved(['rodzice', 'assets'], ['rodzice', 'assets', 'licencje'])).toThrow(/licencje/);
  });
});

describe('htaccess', () => {
  const text = htaccess('/gry/');
  const directives = (policy: string) =>
    new Map(policy.split(';').map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values.join(' ')] as const;
    }));

  it('nie zawiera typów dla plików dźwiękowych (dźwięk powstaje w Web Audio)', () => {
    expect(text).not.toMatch(/\.mp3|audio\//);
  });

  it('wysyła nagłówek CSP z polityką „tylko własny adres” (Z-26)', () => {
    expect(text).toContain(`Header set Content-Security-Policy "${CSP}"`);
    const csp = directives(CSP);
    expect(csp.get('default-src')).toBe("'self'");
    expect(csp.get('script-src')).toBe("'self'");
    expect(csp.get('style-src-elem')).toBe("'self'");
    expect(csp.get('img-src')).toBe("'self'");
    expect(csp.get('font-src')).toBe("'self'");
    expect(csp.get('connect-src')).toBe("'self'");
    expect(csp.get('object-src')).toBe("'none'");
    expect(csp.get('base-uri')).toBe("'self'");
    expect(csp.get('form-action')).toBe("'self'");
    expect(csp.get('frame-ancestors')).toBe("'none'");
    // Żadnych obcych adresów, schematów ani eval.
    expect(CSP).not.toMatch(/https?:|\*|data:|blob:|unsafe-eval/);
    // Nagłówek w bloku mod_headers, żeby brak modułu nie wywracał serwera.
    const headers = /<IfModule mod_headers\.c>([\s\S]*?)<\/IfModule>/.exec(text)?.[1] ?? '';
    expect(headers).toContain('Content-Security-Policy');
  });

  it('zachowuje dotychczasowe ustawienia i adres strony 404', () => {
    expect(text).toContain('ErrorDocument 404 /gry/404.html');
    expect(text).toContain('Header set X-Content-Type-Options "nosniff"');
    expect(text).toContain('Header set Referrer-Policy "no-referrer"');
    expect(text).toContain('Header set Cache-Control "no-cache, must-revalidate"');
    expect(text).toContain('AddType font/woff2 .woff2');
    expect(text).toContain('AddType image/svg+xml .svg');
    expect(text).toContain('AddType text/plain .txt');
    expect(text).toContain('<IfModule mod_deflate.c>');
    expect(text).toContain('ExpiresByType text/html "access plus 0 seconds"');
  });
});
