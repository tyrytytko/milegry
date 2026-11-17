# Patyczki jeżyka (`patyczki`)

Jeżyk ma dwie kupki patyczków i znak „+” między nimi. Dziecko liczy wszystkie i wpisuje cyfrę, ile ich jest razem;
na ostatnich poziomach część patyczków jest „zabrana” (przekreślona) i trzeba policzyć, ile zostało. Gra na `runRound`
z odpowiedzią cyframi (wariant `digits`).

## Cel rozwojowy

Dodawanie przez łączenie zbiorów („licz wszystko”) na konkretach, potem odejmowanie przez zabieranie. Liczba zawsze
stoi przy patyczkach, które można policzyć; zapis „2 + 3 =” jest tylko towarzyszem obrazka i pojawia się dopiero
od poziomu 3 (Z-37). Zakresy: do 3 → do 5 → do 10.

## Mechanika

- Podłoże (mata) z patyczkami: dwie kupki rozdzielone dużym „+”. Patyczki stoją pionowo w rzędzie, **w piątkach**
  (grupy po 5 wyraźnie rozsunięte, jak na liczydle). Pod podłożem: jeżyk, zapis działania zakończony „=” (od poziomu 3)
  i pole odpowiedzi.
- Scena stoi przez całą rundę co do piksela, także przy „10”: podłoże ma stałą szerokość na cały poziom, a pole
  odpowiedzi zostawia miejsce na dwie kratki przez cały poziom z „10”. Wymienia się tylko treść zadania, nowe kupki
  wchodzą przenikaniem (Z-02).
- **Odejmowanie** to jedna kupka z `a` patyczków; ostatnie `b` jest „zabranych”: sam obrys kreskowany, przekreślenie
  ukośną kreską i brak wypełnienia — nie tylko kolor (Z-15), zrozumiałe bez słów (Z-10). Dziecko liczy te, które zostały.
- **Sukces** (≤ 800 ms, Z-20): przy dodawaniu druga kupka dosuwa się do pierwszej w 600 ms (jedyny ruch w scenie, Z-01),
  znak „+” gaśnie, a kupki zmieniają tło na „dobrze”; przy odejmowaniu zabrane patyczki znikają przenikaniem. Mieści się
  w pauzie rdzenia po dobrej odpowiedzi. Przy `prefers-reduced-motion` kupka nie jedzie — zmienia się tylko tło i znak (Z-05).
- Kolejne zadania są różne i mają różne odpowiedzi. Na poziomie z sumą do 10 „10” pada raz w rundzie, nigdy na początku.
- `logic.ts` liczy szerokość zadania w „szczebelkach” (rozstaw patyczków), a `game.ts` przekazuje te liczby do `style.css`
  jako zmienne `--g-patyczki-…` — liczby układu stoją w jednym miejscu.

## Poziomy (`logic.ts` → `LEVELS`)

| Poziom | Działanie | Zakres | Zapis | Zadań | Klawisze (dotyk) |
|---|---|---|---|---|---|
| 1 | dodawanie | suma 2–3 | brak | 5 | 1–3 |
| 2 | dodawanie | suma 2–5 | brak | 6 | 1–5 |
| 3 | dodawanie | suma 3–5 | „2 + 3 =” | 6 | 1–5 |
| 4 | dodawanie | suma 4–8, piątki | tak | 7 | 1–8 |
| 5 | dodawanie | suma 5–10 (raz „10”) | tak | 8 | 1–9, 0 |
| 6 | odejmowanie | było 3–5 | „5 − 2 =” | 6 | 1–4 |
| 7 | odejmowanie | było 5–8 | tak | 7 | 1–7 |
| 8 | odejmowanie | było 6–10 | tak | 8 | 1–9 |

## Sterowanie

Na klawiaturze klawisz-podpowiedź stoi z prawej strony pola odpowiedzi. Na dotyku klawiatura ekranowa ma tylko cyfry,
które mogą paść na danym poziomie.

## Znane ograniczenia

- **Odejmowanie bez „straty”:** zamiast wiatru czy kogoś, kto zabiera patyczek, jest obraz przekreślonych patyczków —
  nikt nikomu niczego nie odbiera.
- **Bez zera:** składniki i wynik są zawsze ≥ 1, bo „0 patyczków” to pojęcie abstrakcyjne, za trudne dla 3–5 lat.
- **Dosuwanie kupek jest reakcją, nie zadaniem:** rdzeń nie ma wariantu rundy „licz po jednym, potem odpowiedz cyfrą”
  (czeka w kolejce platformy, `docs/KATALOG-GIER.md`). Dlatego zakres „do 5” ma dwa poziomy (2 i 3), różniące się tylko
  zapisem działania.
- **Bez „doliczania”** (pierwsza kupka schowana pod liściem z cyfrą): to osobna mechanika.
- Rozmiar patyczków jest stały na poziom, liczony z najszerszego zadania poziomu (na niższych poziomach są grubsze).
  Rozstaw nie spada poniżej 14 px, bo wtedy kreskowany obrys zabranego patyczka się zlewa (Z-15); tyle ma poziom 5
  na telefonie poziomo 667 × 375, najciaśniejszym wspieranym układzie.
- Na scenach węższych niż 300 px (telefon poziomo), a na poziomie z „10” węższych niż 420 px (telefon pionowo),
  jeżyk z zapisem stoi nad polem odpowiedzi, nie obok niego.
