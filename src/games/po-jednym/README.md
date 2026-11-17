# Każdemu po jednym (`po-jednym`)

Jeżyki czekają na jabłka. Najpierw dziecko daje każdemu jeżykowi po jednym jabłku, potem szuka tacki, na której
jest tyle jabłek, ilu jest jeżyków albo ile pokazuje cyfra. Dwa tryby wybierane poziomem: rozdawanie na `createCoach`
(`deal.ts`) i wybór tacki na `runRound` „wybierz 1 z N” (`game.ts`).

## Cel rozwojowy

Odpowiedniość jeden-do-jednego jako podstawa porównywania zbiorów („tyle samo”), potem dopasowanie zbioru do zbioru
w innym układzie i zbioru do cyfry (Z-37: liczba zawsze obok konkretu; zakresy do 3 → do 5 → do 10).

## Mechanika

**Rozdawanie (poziomy 1–2).** U góry koszyk z jabłkami, niżej jeżyki (każdy z talerzykiem). Stuknięcie jeżyka
(albo ramka + Spacja) — jabłko z koszyka przelatuje na jego talerzyk, a miejsce jeżyka robi się jasnozielone
(kolor nie jest jedyną wskazówką — widać jabłko, Z-15).

- **Błąd:** jedyny błąd to stuknięcie jeżyka, który już ma jabłko — łagodnie się kołysze („każdemu po jednym”).
  Podpowiedzi wskazują pierwszego głodnego jeżyka; „zróbmy razem” daje mu jabłko.
- **Nie błąd:** ponowne stuknięcie jeżyka, który przed chwilą dostał jabłko (do 0,7 s czasu gry, `isRepeatTap`)
  — gra je pomija.
- **Sukces:** stolik jest gotowy, gdy każdy jeżyk ma jabłko; po krótkiej przerwie następny stolik.
  Na poziomie 2 czasem jedno jabłko zostaje w koszyku (jabłek więcej niż jeżyków — widać to bez słów).
  Jabłek nigdy nie brakuje.

**Wybór tacki (poziomy 3–5).** U góry kafelek pytania: rząd jeżyków (poziom 3) albo cyfra (poziomy 4–5); niżej
trzy jednakowe tacki z jabłkami. Dziecko wybiera tackę, na której jabłek jest tyle samo.

- **Pytanie** (poświata po 1. błędzie): kafelek z jeżykami albo cyfrą.
- **Sukces:** tacka robi się jasnozielona, a przy rzędzie jeżyków każdy jeżyk dostaje jabłko (para 1:1, Z-20).
- Tacki mają zawsze ten sam rozmiar, a jabłka jeden kolor — liczebność widać tylko z liczby jabłek. Zmyłki różnią się
  od odpowiedzi o 1–3. Na poziomie 5 każda tacka ma jabłka innej wielkości, a najliczniejsza nigdy nie ma największych
  („duży ≠ więcej”).

## Poziomy (`logic.ts` → `LEVELS`)

| Poziom | Tryb | Zakres | Szczegóły | Zadań |
|---|---|---|---|---|
| 1 | rozdawanie | 2–3 jeżyki | jabłek tyle samo co jeżyków | 5 stolików |
| 2 | rozdawanie | 3–5 jeżyków | na 2 stolikach z 5 jedno jabłko zostaje | 5 stolików |
| 3 | wybór: jeżyki ↔ tacka | 2–5 | jabłka rozsypane (od 3 w obu rzędach tacki), jeżyki w rzędzie | 6 |
| 4 | wybór: cyfra ↔ tacka | 1–5 | rząd albo rozsypane | 6 |
| 5 | wybór: cyfra ↔ tacka | 3–10 | ramka (5 + reszta) albo rozsypane, jabłka różnej wielkości | 7 |

## Układ

- Pion: koszyk nad jeżykami (po 3 w rzędzie, 4 = 2 × 2); w wyborze kafelek pytania nad kolumną trzech tacek.
  Koszyk stoi w tym samym miejscu przez całą rundę (Z-02): gdy w rundzie bywa więcej niż 3 jeżyki, stolik zawsze
  zajmuje miejsce dwóch rzędów (`data-max` z `deal.ts`), a szerokość koszyka liczy się z największej liczby jabłek
  przy stoliku w rundzie (`--g-po-jednym-apples`). Jabłka stoją pośrodku, a miejsca po zabranych jabłkach zostają.
- Poziom (`@container (min-aspect-ratio: 1/1)`): jeżyki w jednym rzędzie; w wyborze siatka 2 × 2 — pytanie
  w lewym górnym polu, tacki w pozostałych.
- Tacka to siatka 5 × 2 pól (`logic.ts`), jabłka ustawione procentami tacki, nigdy się nie stykają.

## Decyzje właściciela

- **Poziom 2 bez pytania „tyle samo / więcej / mniej?”** — bez lektora i bez czytania (Z-10) nie da się go zadać.
  Zostające jabłko jest zatwierdzonym zastępstwem, dopóki platforma nie ma trybu mówionego.
- **Poziomy 4–5 bez pokazu „jabłko do jeżyka” po dobrej odpowiedzi** — cyfra stoi obok konkretu (jabłka na tackach,
  Z-37); dokładanie do 10 jeżyków zmieniałoby scenę w trakcie rundy (Z-02) i wydłużało reakcję na sukces (Z-20).
- **Kontrast jabłka do tacki ok. 2,2:1 zostaje** — celem stuknięcia jest cała tacka (Z-14), jabłko ma ciemny ogonek
  i listek, a paleta nie ma mocnej czerwieni (Z-12). Gdyby na urządzeniu jabłka były blade — ciemniejszy obrys jabłka.

## Znane ograniczenia

- Telefon 667 × 375 poziomo, poziom 5: najmniejsze jabłko ma ok. 31 px. Tackę ogranicza wysokość sceny; większej
  nie da się zmieścić bez psucia układu, a celem dotyku jest cała tacka.
- Szybkie stuknięcie dwóch jeżyków (< 0,4 s) daje przez chwilę dwa lecące jabłka.
