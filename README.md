# Miłe Gry

Spokojne gry przeglądarkowe dla dzieci w wieku 3–7 lat: litery, liczby, kształty, logika, pamięć.
Domyślny przedział wieku to 3–5 lat; przedział 5–7 lat rodzic wybiera w panelu „Dla rodziców”.
Działają w przeglądarce na komputerze (klawiatura) i na tablecie lub telefonie (dotyk), po polsku.
Projekt rozwijają rodzice razem z agentem AI (Claude Code).

## Zasady

Gra nie ma przegranej, punktów, liczników czasu ani migających efektów — błąd to łagodna podpowiedź
i kolejna próba. Gra jest zrozumiała bez czytania i przy wyciszonym dźwięku. Nie ma reklam, analityki
ani zapytań do sieci: wszystko jest w plikach strony, a dane (postęp, ustawienia) zostają w przeglądarce.

Pełne reguły: `docs/ZASADY-DESIGNU.md`.

## Wymagania

- Node.js 22 (co najmniej 22.12) i npm.

## Uruchomienie

```
npm install        # raz, po pobraniu projektu
npm run dev        # podgląd: http://localhost:5173/ (lista gier), http://localhost:5173/<id>/ (gra)
npm run check      # typy + testy + build — musi przejść przed każdym commitem
```

Panel rodzica (ustawienia, limit czasu gry) otwiera się z listy gier przytrzymaniem przycisku
„Dla rodziców” i prostym działaniem do rozwiązania.

## Publikacja

1. `npm run build` — gotowa strona powstaje w folderze `dist/`.
2. Wgraj **zawartość** `dist/` (nie sam folder) na serwer, np. przez FTP, do katalogu strony
   (zwykle `public_html/`). Razem z plikami idzie ukryty plik `.htaccess` (Apache: cache, typy plików,
   strona 404) — upewnij się, że klient FTP go nie pomija.
3. Gry w podkatalogu, np. `domena.pl/gry/`? Zbuduj z adresem bazowym i wgraj do `public_html/gry/`:
   - PowerShell: `$env:MILEGRY_BASE="/gry/"; npm run build`
   - macOS / Linux: `MILEGRY_BASE=/gry/ npm run build`
   - Git Bash na Windows: `MSYS_NO_PATHCONV=1 MILEGRY_BASE=/gry/ npm run build`
4. Sprawdź na telefonie: wejdź w grę, wróć do listy gier.

Każda gra ma własny plik `dist/<id>/index.html`, więc adresy gier działają bez reguł przepisywania.

## Jak dodać lub zmienić grę

- Rodzic: `docs/FLOW.md` — krok po kroku, co wpisać w Claude Code (`/nowa-gra`, `/grill-me`, `/implement`).
- Agent lub programista: `docs/DODAWANIE-GRY.md` (start: `npm run nowa-gra -- <id> "<Tytuł>"`).
- Mapa projektu i decyzje techniczne: `docs/ARCHITEKTURA.md`; plan gier: `docs/KATALOG-GIER.md`;
  instrukcja dla agenta: `CLAUDE.md`.

## Licencje krojów pisma

Kroje są w buildzie (bez pobierania z sieci) z paczek `@fontsource`:
- **Andika** — SIL International, SIL Open Font License 1.1;
- **Playwrite PL** — The Playwrite Project Authors (TypeTogether), SIL Open Font License 1.1.

Teksty licencji trafiają przy buildzie do `dist/licencje/`.

Sposób pracy z agentem (skille w `.claude/skills/`) to adaptacja idei z mattpocock/skills (licencja MIT).
