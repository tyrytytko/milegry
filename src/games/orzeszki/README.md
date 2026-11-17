# Liczymy orzeszki (`orzeszki`)

Na polanie leży kilka orzeszków; dziecko je liczy i odpowiada cyfrą na pytanie „ile jest?”. Gra na `runRound`
z odpowiedzią cyframi (wariant `digits`).

## Cel rozwojowy

Liczenie z przyporządkowaniem 1:1 i **kardynalność** (ostatni liczebnik = ile jest) na konkretach (Z-37):
liczba zawsze stoi przy rzeczach, które można policzyć. Fundament pod dodawanie.

## Mechanika

- Polana (stała proporcja 5 : 3) z orzeszkami; pod nią (na szerokiej scenie obok) wiewiórka i pole odpowiedzi.
  Nic się nie rusza (Z-01, Z-13); nowe orzeszki wchodzą przenikaniem, tło i polana stoją (Z-02).
- Odpowiedź to **cyfry**: rdzeń ocenia sam po wpisaniu kompletu cyfr, bez Entera. „10” to dwie cyfry (dwie kratki,
  na dotyku przycisk „cofnij”). Miejsce na odpowiedź ma stałą szerokość, więc polana ani wiewiórka nie przesuwają się,
  gdy zamiast jednej cyfry pojawia się „10”.
- **Pytanie** (poświata po 1. błędzie): polana.
- **Sukces:** pod orzeszkami po kolei od lewej zapala się jasna poświata (jakby policzone). Całość trwa ≤ 800 ms
  (Z-20): krok między orzeszkami maleje z ich liczbą (`countStepMs` w `logic.ts`).
- Odpowiedzi kolejnych zadań są różne; na poziomach do 10 „10” pada raz w rundzie, nigdy na początku.
- Orzeszek (i ikona kafelka) to żołądź z rdzenia, `art.acorn()`, bez buzi.

## Poziomy (`logic.ts` → `LEVELS`)

| Poziom | Zakres | Układ | Orzeszki | Zadań | Cyfry na ekranie (dotyk) |
|---|---|---|---|---|---|
| 1 | 1–3 | w rzędzie | równe | 5 | 1 2 3 |
| 2 | 1–5 | rząd albo kostka do gry | równe | 6 | 1–5 |
| 3 | 2–5 | rozsypane (od 3 orzeszków w co najmniej dwóch rzędach) | różnej wielkości | 6 | 1–5 |
| 4 | 3–10 | ramka (5 + reszta w drugim rzędzie) | równe | 7 | 1–9, 0 |
| 5 | 4–10 | rozsypane | różnej wielkości + 1–4 liści-dystraktorów (liczymy tylko orzeszki) | 8 | 1–9, 0 |

Rozmiary orzeszków na poziomach rozsypanych: 62 %, 70 % i 78 % boku pola siatki, a w każdym zadaniu od 2 orzeszków
są co najmniej dwa różne (pułapka „duży ≠ więcej”). Rozsypany element może się przesunąć ze środka pola tylko tak,
by został we własnym polu (`jitterFor` w `logic.ts`): mniejsze orzeszki rozsypują się szerzej, a żadne dwa elementy
się nie stykają.

## Sterowanie

- **Klawiatura:** klawisze cyfr, Backspace kasuje ostatnią cyfrę.
- **Dotyk:** klawiatura numeryczna pod sceną z cyframi dopasowanymi do poziomu — na poziomach „do 3” i „do 5”
  są tylko potrzebne cyfry.

## Znane ograniczenia

- **Bez liczenia po jednym** (stuknięcie przenosi orzeszek, gra liczy na głos): rdzeń nie ma wariantu rundy
  „licz po jednym, potem odpowiedz cyfrą”, a własna obsługa obok pola cyfr byłaby obejściem rdzenia. Zamiast tego
  orzeszki zapalają się po kolei po dobrej odpowiedzi; rodzic może liczyć z dzieckiem na głos. Ten wariant rundy
  czeka w kolejce platformy (`docs/KATALOG-GIER.md`).
- **Bez poziomu „Daj wiewiórce 4”** (utworzenie zbioru): to osobna mechanika, nie „ile jest?”.
- Najciaśniejszy układ to telefon poziomo 667 × 375: polana ma tam ok. 230 px, więc najmniejszy orzeszek ma
  ok. 29 px — liczenie nadal jest możliwe.
