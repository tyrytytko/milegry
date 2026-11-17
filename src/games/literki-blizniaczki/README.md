# Literki bliźniaczki (`literki-blizniaczki`)

Wiewiórka trzyma liść z literą-wzorem w jednym kroju, niżej leżą 2–4 żołędzie z literami w drugim kroju —
dziecko wybiera żołądź z tą samą literą (litera **pisana** ↔ **drukowana**). Gra „wybierz 1 z N” na `runRound`.

## Cel rozwojowy

Rozpoznawanie tej samej litery w dwóch krojach — budowanie pojęcia litery niezależnego od kroju.
Oswaja dziecko z pismem pisanym (szkolnym) obok drukowanego, który zna z klawiatury i książeczek.

**Dla rodzica:** gra uczy *rozpoznawać* litery pisane, nie uczy ich *pisać* ani czytać. Poziomy 9–16
mają sens dopiero wtedy, gdy dziecko zna małe litery albo jest gotowe je poznawać.

## Mechanika

- Scena stoi przez całą rundę (Z-02); między zadaniami wymieniają się tylko litery (przenikanie).
  Nic się nie porusza (Z-01).
- **Pytanie** (poświata po 1. błędzie): liść ze wzorem.
- **Sukces:** na liściu staje obok wzoru ta sama litera w drugim kroju (obie formy obok siebie, w tym samym
  rozmiarze — to właściwy moment nauki), trafiony żołądź dostaje tło „dobrze”, pozostałe przygasają (Z-20).
- Runda: 8 zadań (Z-23).
- Wielkość liter: wysokość wersalika obu krojów jest wyrównana (krój pisany jest w tym samym `font-size` dużo
  wyższy). Małe litery na żołędziu mają „brzuszek” (wysokość litery x) ≥ 32 px na telefonie 375 × 812.
- **Wyższe żołędzie na poziomach z małymi literami na żołędziach** (9–13 i 16): 1,4 × szerokość zamiast 1,2 ×,
  bo pętle pisanych f, g, j, y inaczej wychodziłyby poza żołądź lub pod czapeczkę. Wysokość jest stała
  na poziom, więc scena się nie przesuwa (Z-02).
- Układ (Z-34): pionowo trzy żołędzie w rzędzie, cztery jako kwadrat 2 × 2. Poziomo wiewiórka z liściem
  po lewej, żołędzie po prawej; cztery żołędzie to kwadrat 2 × 2, a w bardzo szerokiej scenie (np. telefon
  812 × 375) rząd. Żołędzie mają zawsze ≥ 80 px i odstęp ≥ 16 px (Z-33).

## Poziomy (`logic.ts` → `LEVELS`)

W = wielkie obu krojów; M = małe obu krojów; MOST = wzór mała pisana, żołędzie WIELKIE drukowane
(w zadaniach `dp` odwrotnie: wzór WIELKA drukowana, żołędzie małe pisane).
Kierunek: `pd` — wzór pisany, żołędzie drukowane; `mix` — zadania na przemian `pd`, `dp`.

| Nr | Wielkość | Litery-cele | Żołędzie | Podpowiedź | Kierunek |
|---|---|---|---|---|---|
| 1 | W | O C S U Z P | 2 | stała | pd |
| 2 | W | B D R W T I F | 2 | stała | pd |
| 3 | W | O C S U Z P B D R W T I F | 3 | po chwili | pd |
| 4 | W | A E M N | 2 | stała | pd |
| 5 | W | H K L Ł | 2 | stała | pd |
| 6 | W | G Y J (zmyłki także T I U) | 3 | stała | pd |
| 7 | W | A E M N H K L Ł G Y J | 3 | po chwili | pd |
| 8 | W | cały alfabet (32) | 4 | po błędzie | mix |
| 9 | M | o c a d e i u | 2 | stała | pd |
| 10 | M | l t h k m n j y g | 3 | po chwili | pd |
| 11 | M | b p f w ł | 2 | stała | pd |
| 12 | M | r s z (zmyłki także n c) | 3 | stała | pd |
| 13 | M | cały alfabet (32) | 4 | po błędzie | mix |
| 14 | MOST | o c u w z k p y i j t | 3 | po chwili | pd |
| 15 | MOST | a b d e f g h l m n r s | 3 | stała | pd |
| 16 | MOST | cały alfabet (32) | 4 | po błędzie | mix |

Polskie znaki (Ą, Ć…) są tylko na poziomach z całym alfabetem — poza Ł, które jest też w zestawach poziomów
5, 7 i 11. Wybór strzałkami nie wymaga AltGr (Z-31).

Generator rundy: zestaw ≤ 8 liter — każda litera co najmniej raz (kolejne przetasowane „okrążenia”
zestawu, więc np. G, Y, J po 2–3 razy); większy — 8 różnych liter. Ta sama litera nigdy dwa razy z rzędu.
Zmyłki: inne litery z puli poziomu, co najmniej jedna z par łatwych do pomylenia (`CONFUSABLE`), jeśli jest
w puli. Pary dotyczą liter pisanych; most zawsze pokazuje małą pisaną (jako wzór albo jako żołędzie), więc
w obu kierunkach bierze tabelę małych. Miejsce dobrego żołędzia losowe, najwyżej 3 razy z rzędu to samo.

**Podpowiedź „stała”**: przy wzorze widać od początku małą „bliźniaczkę” (40% wielkości) w kroju
żołędzi — zadanie staje się dopasowaniem identycznych kształtów (bezbłędny start). Poziomy „po chwili”
i „po błędzie” nie mają własnej podpowiedzi (`constantHint: false`) — działa sama drabina rdzenia.

## Sterowanie

- Standard wyboru 1 z N: ramka na strzałkach + Spacja/Enter albo stuknięcie żołędzia (Z-32, Z-33).
- **Klawisz litery** wybiera żołądź z tą literą, tak jak stuknięcie; wielkość i krój litery na żołędziu nie
  mają znaczenia (klawisz „M” wybiera żołądź z pisanym „m”). Litera z innego żołędzia kołysze ten żołądź,
  litera spoza żołędzi kołysze liść; oba przypadki to zwykły błąd z drabiną podpowiedzi (Z-19).
  Litery z ogonkiem wymagają AltGr, ale nigdy nie są konieczne — strzałki ze Spacją zostają (Z-31).

## Krój pisany

Gra **zawsze** pokazuje oba kroje i nie zależy od ustawień „Krój liter” / „Wielkość liter” rodzica:
litery idą przez `ctx.ui.letter(ch, { script, case })` z jawnymi wartościami. `RoundSpec.cursive: true`
— runda czeka na wczytanie kroju pisanego przed pierwszą sceną (bez mignięcia innym krojem).
Gdy krój się nie wczyta, runda **nie startuje**: rdzeń zapisuje błąd w konsoli, sprząta scenę i nie zalicza
poziomu — bo z drukowanymi literami w miejsce pisanych zadania byłyby trywialne (wzór = odpowiedź).
Rozmiary liczą się od kroju faktycznie narysowanego (`data-script` na miejscu litery).

## Znane ograniczenia

- Na niskiej scenie poziomej (≤ 296 px wysokości) cztery wyższe żołędzie mają 1,28 × szerokość zamiast 1,4 ×,
  bo kwadrat 2 × 2 nie zmieściłby się nad dolnym pasem; litery w nich są odpowiednio mniejsze.
- Rdzeń nie daje postępu rundy, więc w grze nie ma licznika postępu; zadania
  po „zróbmy razem” wracają, więc zadań bywa więcej niż 8.
