# Pary pod liśćmi (`pary`)

Spokojne memory: na polanie leżą liście, pod każdym obrazek. Dziecko odkrywa dwa liście; para zostaje odkryta,
a nietrafione liście po chwili same wracają na miejsce. Bez licznika ruchów, czasu i wyniku (Z-17, Z-22).
Gra wielokrokowa na `createCoach`.

## Cel rozwojowy

Pamięć wzrokowo-przestrzenna i uwaga; na poziomach 6–7 także łączenie WIELKIEJ i małej litery oraz cyfry
z liczebnością zbioru (do 5, Z-37).

## Mechanika

- Odkrycie liścia: liść odchyla się w bok, pod nim obrazek. Pierwszy liść czeka na drugi.
- **Sukces — para:** obie karty zostają odkryte, tło karty zmienia się na „dobrze” z obwódką, obrazek raz łagodnie
  podskakuje (Z-20). Po ostatniej parze planszy przychodzą nowe liście albo koniec rundy.
- **Nie para:** obie karty leżą odkryte 2100 ms czasu gry (`CLOSE_MS`, skalowane tempem), potem liście powoli
  wracają. Przez ten czas wejście jest wstrzymane (ramka nie rusza się, stuknięcia nic nie robią), więc szybkie
  stukanie nie odkrywa więcej niż w zwykłym memory (Z-21).
- **Zwykłe nietrafienie** (druga karta jeszcze niewidziana) to normalny przebieg gry, nie błąd: bez `coach.miss`,
  bez kołysania i bez dźwięku „jeszcze nie”.
- **Błąd = „pomyłka pamięci”** (`logic.ts` → `slip`): dziecko widziało już parę pierwszej karty **i** drugą kartę,
  a mimo to wybrało źle. To jedyny `coach.miss`: kołysze się druga karta, **pytaniem** (poświata) jest pierwsza
  odkryta karta, paluszek wskazuje liść z jej parą, a „zróbmy razem” odkrywa tę parę (źle wybrana druga karta leży
  wtedy odkryta jeszcze przez czas zakrywania i wraca pod liść sama — to nie błąd). Drabina trwa przez kolejne
  ruchy i zeruje się przy każdej znalezionej parze.
- **Bezczynność** (`suggest`): paluszek (także na klawiaturze) przy liściu wartym odkrycia — przy jednej odkrytej
  karcie jej para; bez odkrytych — karta z pary, której oba miejsca dziecko już widziało; inaczej pierwsza
  niewidziana karta.
- Liście różnią się odcieniem i obrotem zależnie od miejsca — to punkty orientacyjne dla pamięci.

## Poziomy (`logic.ts` → `LEVELS`)

| Poziom | Pary | Par na planszy × plansz | Razem par (Z-23) |
|---|---|---|---|
| 1 | obrazek–obrazek | 2 × 3 | 6 |
| 2 | obrazek–obrazek | 3 × 2 | 6 |
| 3 | obrazek–obrazek | 4 × 2 | 8 |
| 4 | obrazek–obrazek | 6 × 1 | 6 |
| 5 | obrazek–obrazek | 8 × 1 | 8 |
| 6 | WIELKA–mała litera (A E M O T L K D) | 4 × 2 | 8 |
| 7 | cyfra–tyle samo żołędzi (1–5) | 4 × 2 | 8 |

Obrazki: wiewiórka, kurczaczek, rybka, jajko, kasztan, żołądź, łupina kasztana, drzewo (`core/art`;
bez jeżyka — Z-16). Kolejne plansze rundy mają w miarę możliwości inne obrazki. Litery mają wymuszoną
wielkość, krój wg ustawień rodzica (Z-35).

Poziomy 4–5 (6 i 8 par) korzystają z wyjątku opisanego w Z-38 dla tej gry (`docs/ZASADY-DESIGNU.md`).

**Mały ekran:** karty mają zawsze ≥ 80 px z odstępem 16 px (Z-33), więc przy starcie rundy liczba par na planszy
jest przycinana do miejsca na scenie (`fitPairs`). Gdy po przycięciu w rundzie byłoby mniej niż 5 par, gra dokłada
planszę (Z-23, `createBoards`).

**Wyjątek od 80 px — obrót ekranu w trakcie rundy:** liczba par się wtedy nie zmienia, tylko układ
(`ResizeObserver`). Gdy karty nie mieszczą się w 80 px, gra je zmniejsza tak, żeby cała plansza była widoczna
w scenie bez przewijania (`bestLayout(…, min = 1)`). Nowa runda znów liczy pary dla bieżącego ekranu.

## Sterowanie

- **Klawiatura:** strzałki przesuwają ramkę (`ctx.ui.focusGrid`), Spacja albo Enter odkrywa liść (Z-32).
- **Dotyk/mysz:** stuknięcie liścia (`data-target` → `ctx.input`; liczy się pierwszy palec).

## Decyzje właściciela

- **Odcienie liści po obrocie ekranu zostają.** Liście mają cztery odcienie na zmianę, więc przy 8 kolumnach
  (poziom 5 zaczęty w pionie i obrócony w trakcie rundy) całe kolumny mają ten sam odcień, a liście różni tylko obrót.
  Zostaje, bo przypadek jest rzadki, a miejsce w rzędzie i kolumnie nadal odróżnia kartę.
