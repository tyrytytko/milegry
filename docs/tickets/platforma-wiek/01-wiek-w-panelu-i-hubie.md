---
status: zrobione
kto: agent
zalezy-od: []
prd: docs/prd/platforma-wiek.md
historyjki: [1, 2, 3, 4, 5, 6]
---

# 01 — Wiek dziecka w panelu i w hubie

## Co zbudować

Rodzic wybiera w panelu „Dla rodziców”, w nowej sekcji „Wiek dziecka”, jeden z dwóch przedziałów:
„3–5 lat” (domyślny) albo „5–7 lat”. Wybór zapisuje się jak pozostałe ustawienia, a brak zapisu albo
uszkodzona wartość daje „3–5”. Hub pokazuje tylko gry pasujące do wybranego przedziału według reguły
widoczności z sekcji 4 PRD, liczonej osobno od widoku; siatka i start ramki klawiatury liczą się
z gier widocznych. Gra ukryta w hubie nadal otwiera się pod swoim adresem. To zmiana kontraktu
gra ↔ rdzeń: komentarze typów i `docs/ARCHITEKTURA.md` opisują ją w tym samym commicie. Gier
w `src/games/` nie zmieniamy.

## Kryteria akceptacji

- [x] Panel rodzica ma sekcję „Wiek dziecka” z dwoma przyciskami i zdaniem wyjaśnienia; wybór
      przetrwa odświeżenie strony.
- [x] Test odczytu ustawień: brak pola wieku i wartość spoza listy dają „3–5”, zapisane „5–7” wraca
      jako „5–7”.
- [x] Test reguły widoczności: gra od 3 lat jest widoczna w obu przedziałach, gra od 6 lat tylko
      w „5–7”; test na prawdziwych manifestach: w „3–5” widać dokładnie dzisiejsze 9 gier.
- [x] Gra niewidoczna w hubie otwiera się pod swoim adresem; ramka klawiatury w hubie startuje od
      pierwszego kafelka, gdy ostatnio grana gra jest ukryta.
- [x] `docs/ARCHITEKTURA.md` i komentarze w `src/core/types.ts` opisują ustawienie wieku i regułę
      widoczności; `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npx vitest run src/core`
- `npm run check`

Ręcznie (`npm run dev`, potem http://localhost:5173/):
- Klawiatura: wejdź do panelu rodzica, przejdź Tabem do „Wiek dziecka”, wybierz „5–7 lat”, wróć do
  gier — hub pokazuje te same 9 gier; odśwież stronę i sprawdź w panelu, że wybór został.
- Dotyk (widok telefonu 375×812): to samo stuknięciami; przyciski sekcji mają co najmniej 80 px.
- Hub w pionie i w poziomie przy obu przedziałach; konsola bez błędów.
- Widoczność gry dla starszych sprawdzają testy (pierwsza taka gra powstaje w `konkurs-matematyczny`).

## Notatki z realizacji

**2026-11-18**

Co zrobiono:
- Ustawienia: typ `AgeGroup = '3-5' | '5-7'` i pole `Settings.ageGroup` (`src/core/types.ts`),
  `AGE_GROUPS` i walidacja w `loadSettings` (`src/core/storage/settings.ts`); domyślnie `'3-5'`.
- Reguła widoczności: czyste `isVisibleForAge(manifest, ageGroup)` i `visibleGames(list, ageGroup)`
  w `src/core/registry.ts`; start ramki klawiatury: czyste `hubStartIndex(visibleIds, lastGame)`
  w `src/core/shell/hubLayout.ts`.
- Hub (`src/core/shell/hub.ts`) buduje kafelki, siatkę i start ramki tylko z gier widocznych; router
  i wejście do gry bez zmian (`findGame` patrzy na wszystkie gry).
- Panel rodzica (`src/core/shell/parents.ts`): sekcja „Wiek dziecka” (zwykły `choiceGroup`, przyciski
  `.mg-btn` ≥ `--mg-frame-btn`) ze zdaniem wyjaśnienia.
- Kontrakt opisany w komentarzach `AgeGroup`, `Settings.ageGroup`, `GameManifest.age` i w sekcji „Hub”
  `docs/ARCHITEKTURA.md`.

Decyzje w trakcie:
- Wartości w kodzie to ASCII `'3-5'` / `'5-7'`; napisy na przyciskach „3–5 lat” / „5–7 lat” (z twardą
  spacją jak w sekcji „O Miłych Grach”).
- Sekcja „Wiek dziecka” stoi jako pierwsza w panelu (najpierw to, co zmienia ekran główny dziecka).
- Reguła widoczności mieszka w `registry.ts` (obok listy gier), test na prawdziwych manifestach
  w `registry.test.ts` wymienia 9 id wprost — nowa gra dla młodszych dopisuje tam swoje id.

Sprawdzenia: `npm run typecheck` zielony; `npx vitest run src/core` — 26 plików, 486 testów;
`npm run check` — 39 plików, 1202 testy, build z 9 grami, zielony.

Dla następnej sesji: niesprawdzone ręcznie (podgląd klawiaturą i dotykiem 375 × 812, odświeżenie
po wyborze wieku, wejście pod adres ukrytej gry — dziś żadna gra nie jest ukryta). Ticket 02 (zdanie
„3–7 lat” w panelu, `ZASADY-DESIGNU.md`, dokumenty produktu) nietknięty.

Podgląd (orkiestrator, 2026-11-18): klawiaturą — bramka, Tab do „5–7 lat”, Enter, wybór zapisany
i widoczny po odświeżeniu; dotykiem 375 × 812 — powrót na „3–5 lat”, przyciski 116 × 80 px; hub
w pionie i w poziomie (812 × 375) pokazuje 9 gier bez przewijania w obu przedziałach; gra `pary`
otwiera się pod adresem; konsola bez błędów. Wejścia pod adres gry ukrytej nie dało się obejrzeć
(dziś żadna gra nie jest ukryta) — potwierdza je kod: router i `findGame` patrzą na wszystkie gry.

Recenzja (`recenzent-gry`): GOTOWE, bez ustaleń krytycznych. Poprawione ważne:
- test na prawdziwych manifestach nie wymaga już równości z listą 9 id (nowa gra dla młodszych nie
  musi dotykać rdzenia): sprawdza, że 9 gier jest widocznych w „3–5”, że nie widać żadnej gry od
  6 lat i że żadna gra z wiekiem od ≤ 5 lat nie jest ukryta;
- komentarz pola `age` w szablonie `src/games-szablon/wzor/manifest.ts` opisuje wpływ na hub.
Poprawione drobne: znaki U+2060 i U+00A0 w napisach przycisków zapisane jawnie (`⁠`, ` `).
Zostawione drobne: reguła widoczności opisana i w `types.ts`, i w JSDoc `isVisibleForAge`, i w
`docs/ARCHITEKTURA.md`; dwa dłuższe wiersze w `docs/ARCHITEKTURA.md`.

Dla następnej sesji: pierwsza gra od 6 lat (`konkurs-matematyczny`) to okazja, żeby w przeglądarce
obejrzeć ukryty kafelek, wejście pod adres i start ramki od pierwszego kafelka.
