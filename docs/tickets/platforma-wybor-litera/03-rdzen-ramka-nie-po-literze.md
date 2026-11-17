---
status: zrobione
kto: agent
zalezy-od: []
prd: docs/prd/platforma-wybor-litera.md
historyjki: [3, 4]
---

# 03 — Rdzeń: ramka wyboru nie pojawia się po literze

## Co zbudować

Ramkę wyboru odsłaniają tylko strzałka albo Spacja/Enter; klawisz litery jej nie odsłania (PRD, sekcja 4:
„Ramka wyboru”). Zacznij od odtworzenia w podglądzie stanu dzisiejszego: w `literki-blizniaczki` pierwszy
naciśnięty klawisz litery pokazuje ramkę na środkowym żołędziu. Jeśli przyczyna „podświetlenia przypadkowej
litery” okaże się inna, zatrzymaj się i zapytaj rodzica. Gdy ramka jest już widoczna (dziecko użyło strzałek),
zachowuje się jak dotąd. Zmiana dotyczy wszystkich gier z wyborem i huba, więc po niej trzeba sprawdzić, że
nawigacja strzałkami nigdzie się nie zmieniła.

Zmienia się zachowanie opisane w komentarzach rdzenia: w tym samym commicie zaktualizuj komentarze przy ramce
wyboru i akapit „Wejście” w `docs/ARCHITEKTURA.md`.

## Kryteria akceptacji

- [x] Test (PRD, sekcja 5: „Test ramki wyboru”): klawisz litery nie odsłania ramki; strzałka i Spacja
      odsłaniają ją jak dotąd — najpierw test, potem kod.
- [x] W `literki-blizniaczki` po naciśnięciu klawisza litery na początku rundy nie widać ramki na żadnym żołędziu.
- [x] W `okienka`, `po-jednym` i w hubie strzałki ze Spacją/Enterem działają jak dotąd (pierwsze naciśnięcie
      odsłania ramkę, następne ją przesuwa albo wybiera).
- [x] Komentarze rdzenia i `docs/ARCHITEKTURA.md` opisują, co odsłania ramkę.
- [x] `npm run check` przechodzi.

## Jak sprawdzić

Automatycznie:
- `npx vitest run src/core/ui src/core/input`
- `npm run check`

Ręcznie (`npm run dev`):
- http://localhost:5173/literki-blizniaczki/ — odśwież stronę, naciśnij klawisz litery: ramki nie ma. Naciśnij
  strzałkę: ramka pojawia się na środkowym żołędziu; kolejna strzałka ją przesuwa, Spacja wybiera.
- http://localhost:5173/okienka/ i http://localhost:5173/po-jednym/ — po jednym zadaniu strzałkami i Spacją.
- http://localhost:5173/ — wybór gry strzałkami i Enterem, dojście do przycisku „Dla rodziców”.
- Dotyk (widok telefonu 375×812): jedno zadanie w `literki-blizniaczki`, ramki nie widać.
- Konsola bez błędów.

## Notatki z realizacji

**2026-11-17**

Krok zerowy (przed zmianami, podgląd na :5173 z tego folderu, serwuje bieżące pliki): w `/literki-blizniaczki/`
po odświeżeniu klawisz „K” (litera spoza żołędzi) ustawił `data-last-input="keyboard"` na `<html>` i ramka
pojawiła się na środkowym żołędziu „E”. Przyczyna zgodna z PRD: hub wejścia przełączał tryb na „klawiatura”
po każdym klawiszu (odpowiedź — po doręczeniu), a CSS pokazuje ramkę `.mg-focused` właśnie w tym trybie.

Co zrobiono:
- `src/core/input/inputHub.ts`: `data-last-input="keyboard"` ustawiają tylko klawisze nawigacji (`NAV_KEYS`:
  strzałki, Enter, Spacja; Enter/Spacja w grze — po doręczeniu, jak dotąd) i Tab, gdy przenosi fokus
  przeglądarki (odbiorca bez `captureKeys`, czyli poza grą). Litery, cyfry, Backspace i przypadkowe klawisze
  trybu nie zmieniają.
- `src/core/styles/base.css`: obrys `:focus-visible` gaszony, gdy tryb nie jest „keyboard” (wcześniej tylko przy
  „pointer”). Bez tego w hubie klawisz litery tuż po wczytaniu strony (tryb jeszcze nieustawiony) i tak
  pokazywał obrys na kafelku z fokusem — przeglądarka po dowolnym klawiszu włącza `:focus-visible`.
- `src/core/round/runRound.ts`: wybór literą (z `letters`) przenosi zaznaczenie ramki na wybrany element jak
  stuknięcie (PRD: „przeskakuje na wybrany element”; ticket 01 zostawił to temu ticketowi). Tylko gdy wybór się
  liczy (nie w pauzie ani blokadzie po błędzie); litera spoza elementów zaznaczenia nie rusza.
- Testy: `inputHub.test.ts` (blok `data-last-input`: litery, cyfra, Backspace, „,”, Shift, F5 nie zmieniają trybu;
  strzałki od razu, Spacja/Enter po doręczeniu; Tab w grze nie, poza grą tak; Enter/Spacja na linku huba),
  `focusGrid.test.ts` (litera nie odsłania ramki, potem pierwsza strzałka/Spacja tylko ją odsłania; widoczna ramka
  zostaje po literze), `runRound.test.ts` (zaznaczenie idzie za wyborem literą). Wszystkie najpierw czerwone.
- Dokumenty: komentarze w `inputHub.ts` (`LastInput`), `focusGrid.ts`, `ChooseView.letters` (`round/index.ts`),
  `base.css`; akapit „Wejście” w `docs/ARCHITEKTURA.md`; pułapka „Ramka wyboru” w `docs/DODAWANIE-GRY.md`.

Decyzje w trakcie:
- Lista dozwolonych klawiszy zamiast wyłączenia samych liter: ticket mówi „tylko strzałka albo Spacja/Enter”,
  więc cyfra czy przypadkowy klawisz (np. „,”) też nie odsłania ramki. Tab poza grą zostaje, bo służy do
  przechodzenia po przyciskach i linkach (obrys fokusu musi być widoczny). Escape nie przełącza trybu.
- Cyfry (`digits: true` w `focusGrid`) traktowane jak litery — żadna gra dziś ich nie używa.
- Zaznaczenie po wyborze literą przesuwa się także przy ukrytej ramce (jak po stuknięciu); po złej literze
  pierwsza strzałka odsłoni ramkę na wybranym (złym) żołędziu, nie na środku — tak samo jak po złym stuknięciu.

Sprawdzenia:
- `npx vitest run src/core/ui src/core/input src/core/round`: 11 plików, 180 testów — zielono.
- `npm run check`: 39 plików, 1186 testów, typy, build — zielono (także po zmianie CSS).
- Podgląd (klawiatura, :5173): `/literki-blizniaczki/` — po odświeżeniu „K” i „A”: brak ramki; strzałka odsłania
  ramkę na środkowym żołędziu, kolejne ją przesuwają, Spacja wybrała „L” (zaliczone). `/okienka/` — litera bez
  ramki, strzałka odsłania, druga przesuwa, Spacja zalicza, następne zadanie z ramką na środku. `/po-jednym/` —
  to samo, zadanie zaliczone strzałkami i Spacją. Hub `/` — litera bez obrysu; pierwsza strzałka odsłania,
  następna przesuwa; strzałkami w górę dojście do „Dla rodziców (przytrzymaj)” (z obrysem); Enter na kafelku
  otworzył grę; po kliknięciu w tło Tab pokazuje obrys na „Dla rodziców”.
- Dotyk 375 × 812: `/literki-blizniaczki/` — złe stuknięcie i dobre, zadanie zaliczone, ramki nie widać.
  Rozmiar okna przywrócony. Konsola bez błędów.
- Nie sprawdzano: otwarcia panelu „Dla rodziców” przytrzymaniem i pracy klawiaturą w jego polach.
- Recenzji `recenzent-gry` w tej sesji nie uruchamiano (zlecona osobno).

Wskazówki dla ticketów 02 i 04:
- Gra nic nie robi z ramką: po podaniu `letters` klawisz litery nie odsłania ramki, a zaznaczenie samo przechodzi
  na wybrany element. W podglądzie sprawdź: litera → brak ramki; strzałka → ramka (na środku albo na ostatnio
  wybranym literą żołędziu/kafelku).

Pytania do rodzica:
- Po złej literze (ramka ukryta) pierwsza strzałka pokaże ramkę na żołędziu wybranym literą, a nie na środku —
  tak jak po złym stuknięciu. Czy tak może zostać?

### Recenzja (2026-11-17, `recenzent-gry`)

Wynik: gotowe, bez ustaleń KRYTYCZNYCH i WAŻNYCH; `npm run check` potwierdzony niezależnie. Ustalenia DROBNE,
zostawione bez zmian:
- obrys fokusu jest ukryty, dopóki nie padnie strzałka, Spacja/Enter albo Tab — kto przenosi fokus bez klawisza
  (czytnik ekranu, urządzenie przełączające), obrysu nie zobaczy; Home/End/PageUp/PageDown nie przełączają trybu;
- praca klawiaturą w polach panelu rodzica nie była sprawdzona w podglądzie — do obejrzenia przy odbiorze;
- brak testu na Tab bez żadnego odbiorcy wejścia i na Shift+Tab;
- to, co odsłania ramkę, opisuje kilka komentarzy naraz; głównym miejscem jest komentarz `LastInput` w `inputHub.ts`.
