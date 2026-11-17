---
status: zrobione
kto: agent
zalezy-od: ["01"]
prd: docs/prd/platforma-hub-mobilny.md
historyjki: [2]
---

# 03 — Reakcja kafelka na dotyk

## Co zbudować

Kafelek gry łagodnie „wciska się”, gdy dziecko go dotknie, tak żeby było widać, że stuknięcie zostało
przyjęte, zanim ekran przeniknie do gry (PRD, sekcja 4, „Reakcja na dotyk”). Ruch jest spokojny, z czasem
z tokenów, bez sprężynowania i powiększania; przy ustawieniu „ogranicz ruch” zamiast ruchu jest sama
zmiana wyglądu. Przejście do gry pozostaje przenikaniem.

## Kryteria akceptacji

- [x] Dotknięcie kafelka daje widoczną reakcję na telefonie; po puszczeniu otwiera się gra.
- [x] Czas i krzywa ruchu pochodzą z tokenów (Z-03, Z-04); nic nie mruga ani nie odbija.
- [x] Przy „ogranicz ruch” kafelek się nie przesuwa, a reakcja nadal jest widoczna (Z-05).
- [x] Uniesienie kafelka pod myszą i ramka klawiatury działają jak dotąd.
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/):
- Dotyk (widok telefonu 375 × 812): przytrzymaj palec/wskaźnik na kafelku — widać „wciśnięcie”; puść —
  gra się otwiera przenikaniem.
- Włącz w przeglądarce emulację „ogranicz ruch” i powtórz — brak przesunięcia, reakcja widoczna.
- Klawiatura i mysz (okno komputera): ramka i uniesienie bez zmian.
- Konsola bez błędów.

## Notatki z realizacji

**2026-11-17**

Co zrobiono:
- `src/core/shell/pressFeedback.ts` (+ test, najpierw test, 5 przypadków): `addPressFeedback(el)` daje
  klasę `mg-pressed` od `pointerdown` (tylko pierwszy palec / lewy przycisk) do `pointerup`,
  `pointercancel` albo `pointerleave`. Nie przechwytuje wskaźnika i nie zmienia kliknięcia.
- `hub.ts`: wciśnięcie tylko na kafelku gry działającej w bieżącym trybie (przygaszony go nie ma).
- `hub.css`: wciśnięty kafelek opada o 2 px (`--mg-dur-fast`, `--mg-ease`), cień `--mg-shadow-pressed`,
  tło lekko ciemniejsze (`color-mix` z `--mg-ink`); przy „ogranicz ruch” `transform: none` — zostają
  cień i tło. Przejście do gry bez zmian (przenikanie).
- `docs/ARCHITEKTURA.md`: punkt o wciśnięciu w sekcji „Hub”, `pressFeedback` na liście modułów.

Decyzje w trakcie:
- Klasa z JS zamiast samego `:active` — na dotyku w Safari `:active` pojawia się zawodnie.
- Selektor `.mg-hub .mg-tile.mg-pressed` mocniejszy niż uniesienie pod myszą (-3 px) i ramka klawiatury,
  więc wciśnięcie myszą też wygrywa (+2 px).
- Do cienia dodane przyciemnienie tła, żeby reakcja była widoczna także bez ruchu.

Sprawdzenia:
- `npm run check`: zielony — 39 plików testów, 1147 testów, build OK.
- Podgląd (Browser pane, localhost:5173, style obliczone w trakcie przytrzymania + zrzuty):
  - 375 × 812 i 667 × 375: przytrzymanie → `translateY(2px)`, cień 1 px, ciemniejsze tło (widać na
    zrzucie); stuknięcie otwiera „Pary pod liśćmi” / „Labirynty”; powrót — 9 kafelków, żaden wciśnięty.
    Przeciągnięcie z kafelka poza siatkę — brak wciśnięcia, gra się nie otwiera. `pointercancel`
    i `pointerleave` puszczają. Strona bez przewijania (wysokość = ekran).
  - Przygaszony kafelek (manifest `okienka` zmieniony w pamięci strony na samą klawiaturę) — brak
    wciśnięcia, wygląd bez zmian.
  - „Ogranicz ruch”: narzędzie nie emuluje `prefers-reduced-motion` (`matchMedia` = false). Treść bloków
    `@media (prefers-reduced-motion)` wstawiona bez warunku → wciśnięty kafelek bez przesunięcia (ta sama
    wysokość co sąsiad), cień i tło zmienione. To symulacja, nie prawdziwa emulacja.
  - Okno komputera: uniesienie pod myszą -3 px, ramka klawiatury -3 px; strzałki do „Dla rodziców”,
    Enter → bramka; Enter na kafelku → gra. Konsola bez błędów.
- Nie sprawdzone: prawdziwy telefon i palec (Safari, Android, długie przytrzymanie), prawdziwe
  ustawienie „ogranicz ruch”, czy 2 px + przyciemnienie są dość widoczne dla dziecka (ticket 05).

Recenzja (`recenzent-gry`): GOTOWE, brak KRYTYCZNYCH i WAŻNYCH. DROBNE zostawione: test nie obejmuje
puszczenia bez wcześniejszego wciśnięcia (kod tego nie wymaga); wciśnięcie trwa 200 ms, powrót 400 ms
(`--mg-dur-base` kafelka) — łagodne, do oceny na telefonie.

**Wskazówki dla następnej sesji:**
- Ticket 04 (marginesy) nie dotyka wciśnięcia; pierwsze strzałki po użyciu myszy przełączają tryb
  i ramkę — w podglądzie naciskać pojedynczo.
- Ticket 05: sprawdzić palcem widoczność wciśnięcia i przesunięcie palca z kafelka (iOS, Android)
  oraz ustawienie „ogranicz ruch” w systemie.

Pytania do rodzica: brak.
