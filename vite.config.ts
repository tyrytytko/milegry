import { defineConfig } from 'vitest/config';
import { normalizeBase } from './src/core/router.ts';

/**
 * Adres bazowy aplikacji na serwerze: MILEGRY_BASE, domyślnie `/` (gry w korzeniu domeny).
 * Przykład: `MILEGRY_BASE=/gry/ npm run build` → gry pod https://domena.pl/gry/
 * Zawsze normalizowany do postaci `/coś/` (absolutna ścieżka ze slashem na końcu),
 * bo każda gra ma własny katalog `dist/<id>/index.html`, a względne ścieżki by się w nich psuły.
 */
export default defineConfig({
  base: normalizeBase(process.env.MILEGRY_BASE ?? '/'),
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        // Leniwy plik gry nazwany od folderu: assets/game-literki-<hash>.js (łatwiej szukać w dist/).
        chunkFileNames: (chunk) => {
          const match = /\/games\/([^/]+)\/game\.ts$/.exec(chunk.facadeModuleId ?? '');
          return match ? `assets/game-${match[1]}-[hash].js` : 'assets/[name]-[hash].js';
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
