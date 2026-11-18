# Matematyczne zagadki (`konkurs-matematyczny`)

Dziecko czyta krótkie polecenie, patrzy na zadanie z „?” na kartce i wybiera jedną z czterech kart
z odpowiedzią. Gra „wybierz 1 z 4” na `runRound`; zadania są ułożone ręcznie i zapisane jako dane
w `logic.ts`, rysunki zadań powstają z tych danych w `figures.ts`.

## Cel rozwojowy

Spokojne oswojenie dziecka w wieku 5–7 lat z typami zadań z konkursu matematycznego dla klasy 1:
brakująca liczba w działaniu, kostki, ciągi, piramidki, brakujące płytki, kody literowe, tarcza, rosnące
figury, litery zamiast liczb, szachownica — bez punktów ujemnych i bez zegara.

## Mechanika

- Scena stoi przez całą rundę: kartka (u góry polecenie, pośrodku rysunek zadania z „?”) i rząd czterech
  kart z odpowiedziami (liczby, słowa, zestawy znaków albo pary liczb szachownicy). Między zadaniami
  wymieniają się tylko polecenie, rysunek i karty; nowe wchodzą przenikaniem (Z-02). Ruchu nie ma — tylko
  przenikanie i zmiana koloru, więc przy ograniczonym ruchu nic się nie zmienia.
- Każde zadanie ma w danych cztery różne karty i jedną dobrą odpowiedź. Kolejność kart jest mieszana
  przy każdym pokazaniu zadania i nigdy nie jest rosnąca (słowa — nie alfabetycznie).
- **Pytanie** (poświata po 1. błędzie): kartka.
- **Sukces** (także przy „zróbmy razem”): od razu „?” zamienia się w dobrą odpowiedź (obrys z kreskowanego
  robi się ciągły), a kartka w 400 ms zmienia tło na „dobrze” (Z-20).
- **Błąd:** wybór złej karty.
- Runda to 7 różnych zadań z puli poziomu; typy zadań są brane po kolei, więc w rundzie jest tyle
  różnych typów, ile się da (co najmniej 4).
- Litery (kod literowy, „ta sama litera”, „dwie litery”, także litera w poleceniu „Ile to A?”) rysuje
  platforma (`ctx.ui.letter`), zawsze WIELKIE, w kroju wybranym przez rodzica. Polecenie z literą składa
  widok z części (`promptParts` w `logic.ts`).
- Karta w zadaniu „znaki” to zestaw znaków + i − (różnią się kształtem, kolor ten sam). Przy trzech
  liczbach karty to wszystkie cztery zestawy dwóch znaków, przy czterech — cztery z ośmiu zestawów trzech
  znaków; karty mają tę samą długość, a pasuje dokładnie jedna. Przy każdej karcie (nie tylko dobrej)
  wynik po każdym kroku i na końcu mieści się w zakresie poziomu — przy trzech liczbach a ? b ? c to
  znaczy a ≥ b + c i a + b + c ≤ max (pilnuje test).
- Karta szachownicy to dwie liczby jedna pod drugą, każda przy małym kwadraciku pola (ciemny z paskami,
  jasny). Kolor pola szachownicy wyznacza jedna funkcja `isDarkCell` (lewy górny róg ciemny).
- Informacji nie niesie sam kolor (Z-15): „?” i brakujące pola mają kreskowany obrys, trafienia na tarczy
  to ciemne kropki z jasną obwódką, pierścienie tarczy są opisane liczbami, ciemne pola szachownicy mają
  jasne ukośne paski.

### Czytnik ekranu

- Kartka jest grupą nazwaną poleceniem (zwykły tekst z `promptOf`, także „Ile to A?”).
- Rysunek jest obrazkiem z opisem, który pozwala rozwiązać zadanie: działanie słowami, oczka kostek,
  liczby ciągu, rzędy piramidki, liczba brakujących pól w kolejnych rzędach muru i podłogi, położenie
  brakujących pól szachownicy (rząd i numer pola, `missingCells` w `logic.ts`) z regułą kolorów,
  pierścienie i trafienia tarczy, liczby pól rosnących figur, tabelka kodu. Po rozwiązaniu „ile?”
  w opisie zamienia się w odpowiedź.
- Każda karta ma nazwę równą swojej treści: liczba, słowo, zestaw znaków słowami („plus, minus”), para
  szachownicy („5 ciemnych i 4 jasne”, `pairLabel` w `logic.ts`).

### Typy zadań

| Typ (`kind`) | Co widać na kartce | Polecenie |
|---|---|---|
| brakująca liczba (`missing`) | działanie z „?”, np. „? + 3 = 7” | Jaka liczba pasuje? |
| kostki (`dice`) | 2–3 kostki z oczkami, „= ?” | Ile oczek jest razem? |
| ciąg liczb (`sequence`) | rząd liczb z przecinkami (poziom 3: o rosnącym kroku, np. 1, 2, 4, 7, 11), na końcu „?” | Jaka liczba będzie następna? |
| piramidka dodawania (`pyramid`) | kółka z liczbami połączone kreskami; kółko nad dwoma to ich suma; jedno kółko to „?”. Jedno dodawanie: 1 kółko nad 2; dwa dodawania: 2 kółka nad 3; trzy dodawania: „?” na górze, pod nim dwa puste kółka do policzenia po drodze, na dole 3 liczby. Po rozwiązaniu puste kółka też dostają liczby | Jaka liczba pasuje? |
| brakujące pola (`tiles`) | mur z cegieł albo podłoga z płytek; brakujące pola mają kreskowany obrys; obok „?” | Ile cegieł brakuje? / Ile płytek brakuje? |
| kod literowy — jakie to słowo (`codeWord`) | tabelka „litera nad liczbą”, rząd liczb i pod nim szerokie pole „?”, w którym po rozwiązaniu litery stają pod swoimi liczbami | Jakie to słowo? |
| ta sama litera (`sameLetter`) | „A + A + A = 12”, pod spodem „A = ?” | Ile to A? (litera z zadania, literą platformy) |
| znaki (`signs`) | „9 ? 5 ? 3 = 11” — puste pola na znaki między liczbami, liczone od lewej | Jakie znaki pasują? |
| tarcza (`target`) | pierścienie opisane liczbami (u góry tarczy, liczba środka w środku), trafienia to kropki leżące wyraźnie w jednym pierścieniu; obok „?” | Ile punktów zdobył strzelec? |
| rosnące figury (`growing`) | trzy coraz większe układy kółek albo kwadratów, pod każdym liczba pól; „?” stoi w rzędzie tych liczb, na miejscu liczby czwartego układu. Poziom 2: każdy układ zawiera poprzedni i rośnie o tyle samo. Poziom 3: trzy kolejne wielkości nazwanej figury — trójkąta-schodków, kwadratu albo krzyżyka (`outline`) | Z ilu kółek będzie następna figura? / Z ilu kwadratów będzie następna figura? / Z ilu kółek będzie następny trójkąt? (kwadrat?) / Z ilu kwadratów będzie następny krzyżyk? |
| kod literowy — ile razem (`codeSum`) | tabelka „litera nad liczbą”, pod nią słowo z plusami między literami, np. „K + O + T = ?” | Ile razem są warte litery? |
| dwie litery (`twoLetters`) | zapisy jeden pod drugim, np. „A + A = 12”, „A + B = 10”, na dole „B = ?”; w jednym zapisie stoją obie litery, układ ma jedno rozwiązanie | Ile to B? (litera z zadania, literą platformy) |
| szachownica (`chess`) | szachownica z brakującymi polami (kreskowany obrys; lewy górny róg ciemny), obok dwa „?”: przy ciemnym i przy jasnym kwadraciku | Ile ciemnych i ile jasnych pól brakuje? |

Tabela ma 13 wierszy, bo trzy z dziesięciu typów z PRD mają w kodzie po dwa rodzaje: kod literowy
(`codeWord`, `codeSum`), ta sama litera (`sameLetter`, `twoLetters`) i brakujące pola (`tiles`, `chess`).

## Poziomy (`logic.ts` → `LEVELS`)

| Poziom | Zakres liczb | Typy zadań | Zadań w puli | Zadań w rundzie |
|---|---|---|---|---|
| 1 | do 10 | brakująca liczba (jedno działanie), kostki (2–3 kostki), ciąg liczb (co 1, co 2), piramidka z jednym dodawaniem, brakujące pola (do 6 brakujących), kod literowy „jakie to słowo” (słowa 3–4 litery) | 17 | 7 |
| 2 | do 20 | brakująca liczba z działaniem po obu stronach „=”, piramidka z dwoma dodawaniami (2 kółka nad 3), ta sama litera (2–4 razy), znaki przy trzech liczbach, tarcza (3 pierścienie, 2–3 trafienia), rosnące figury (stały przyrost), kod literowy „ile razem”, brakujące pola (do 12 brakujących) | 17 | 7 |
| 3 | do 30 | ciągi o rosnącym kroku (5 liczb), rosnące figury (trójkąt, kwadrat, krzyżyk), piramidka 1–2–3 z „?” na górze, dwie litery, znaki przy czterech liczbach (w tym odpowiedź z dwoma minusami), tarcza (3–4 pierścienie, 4–5 trafień), szachownica | 16 | 7 |

Pula całej gry: 50 zadań. Zakres poziomu 3 („do około 30” w PRD) to dokładnie 0..30 — także na kartach,
w piramidce po drodze i w wynikach pośrednich „znaków” przy każdej karcie.

## Sterowanie i układ sceny

Standard wyboru 1 z N: ramka na strzałkach + Spacja/Enter albo stuknięcie karty. Klawisze cyfr i liter nie
wybierają kart (Z-32). Układ sceny:
- wąska scena (telefon w pionie): kartka nad kartami, karty 2 × 2;
- szeroka scena (od 480 px): kartka nad kartami, cztery karty w jednym rzędzie;
- niska i szeroka scena (proporcje od 4 : 3 i do 420 px wysokości, np. telefon w poziomie): kartka po
  lewej na całą wysokość, karty 2 × 2 po prawej w polu o stałej szerokości (na karty-słowa).

We wszystkich układach kartka i rząd kart mają ten sam rozmiar i miejsce przy każdym zadaniu (Z-02).
Wszystkie karty są tak samo szerokie (szersze niż wysokie, żeby zmieściło się słowo z kodu literowego),
także w zadaniach z liczbami.
W układach „kartka nad kartami” polecenie ma zawsze miejsce na dwa wiersze, a rysunek — stałą wysokość
pięciu czcionek rysunku; na niskiej scenie ta wysokość i czcionki rysunku maleją tak, żeby kartka z kartami
zmieściły się nad pasem przy dolnej krawędzi. W układzie poziomym wysokie rysunki (tarcza, szachownica,
piramidka 1–2–3, figury nazwane) mają całą wysokość, która zostaje w kartce pod poleceniem w dwóch
wierszach — nie nachodzą na polecenie.

Wielkość rysunku:
- Długi rząd (np. „15 − 3 = 4 + ? + 2”, ciąg pięciu liczb, „K + O + T = ?”) i szeroki obrazek (mur,
  podłoga, rosnące figury, szachownica) dostają mniejszą czcionkę, gdy nie mieszczą się w szerokości
  kartki (`fitRow`/`fitWidth`/`fitInnerRow` w `figures.ts`; szerokości cyfr, przecinków i znaków
  w em zmierzone dla kroju platformy). Kartka ma z boków mały odstęp (8 px), żeby szerokie rysunki były
  jak największe.
- Rosnące figury mają małe odstępy między układami, kwadraty prawie się stykają (jak w krzyżyku
  z kartek), a kółka mają przerwę, żeby dało się je policzyć.
- Położenie pierścieni, liczb i kropek tarczy liczy czysta funkcja `targetLayout` w `logic.ts`: kropki
  pierścienia leżą w równych odstępach na łuku omijającym jego liczbę u góry, kropki środka — łukiem pod
  liczbą środka. Przy 4 i więcej pierścieniach środkowe koło jest mniejsze, żeby liczby pierścieni były
  duże. Test sprawdza, że kropki leżą w pasie swojego pierścienia i nie nachodzą na siebie ani na liczby,
  dla 3–5 pierścieni i do 5 trafień w pierścieniu (w środku do 3, przy 4–5 pierścieniach do 2).

## Decyzje właściciela

- **Polecenie tekstem (wyjątek od Z-10, zapisany w `docs/ZASADY-DESIGNU.md`):** na konkursie dziecko też
  czyta polecenia; rodzic może je przeczytać na głos. Gra nie jest w pełni zrozumiała bez czytania —
  rysunek z „?” i cztery karty podpowiadają, że trzeba wybrać brakującą rzecz, ale co policzyć, mówi
  polecenie.
- **Liczby jako sam zapis, bez konkretów (wyjątek od Z-37, zapisany w `docs/ZASADY-DESIGNU.md`):** liczby
  do 20 (na poziomie 3 do 30) występują jako sam zapis; gra przygotowuje do konkursu dla klasy 1. Poziom 1
  także pokazuje działania do 10 samym zapisem.
- **Wiek 6–7 w manifeście:** hub pokazuje grę tylko przy wieku „5–7 lat”.
- **Zadania własne:** wzorowane na typach zadań konkursowych, z innymi liczbami i rysunkami; gra nie
  używa nazwy konkursu ani treści arkuszy.
- **Postęp:** zapisują się tylko ukończone poziomy; gra nie pamięta, które zadania już były.

## Znane ograniczenia

- Najmniejsze elementy na telefonie: kwadraciki krzyżyka (poziom 3) mają ok. 14 px w pionie 375 × 812
  i ok. 13 px w poziomie 667 × 375 — rysunek ma 15 kolumn trzech układów i jest ograniczony szerokością
  kartki. Pod każdym układem stoi liczba pól, więc dziecko nie musi liczyć kwadracików.
- Liczby pierścieni tarczy z 4 pierścieniami mają w poziomie 667 × 375 ok. 15 px (w pionie ok. 20 px) —
  liczba musi zmieścić się w pasie pierścienia.
- „?” rosnących figur ma wielkość liczb pod układami, więc jest mniejsze niż „?” w innych zadaniach.
- Polecenie to zwykły tekst bez lektora (platforma nie ma trybu mówionego).
