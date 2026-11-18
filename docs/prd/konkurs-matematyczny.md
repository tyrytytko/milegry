---
slug: konkurs-matematyczny
rodzaj: nowa-gra
dotyczy: konkurs-matematyczny
status: zatwierdzony
data: 2026-11-18
---

# Matematyczne zagadki

## 1. Problem — po co to robimy

Dziecko w wieku 5–7 lat, które ma wystartować w konkursie matematycznym dla klasy 1, powinno
wcześniej spokojnie poznać typy zadań, jakie tam spotka: brakującą liczbę w działaniu, ciągi, kody
literowe, liczenie brakujących płytek. Dzisiejsze gry kończą się na dodawaniu i odejmowaniu do 10 na
patyczkach. Brakuje gry, w której dziecko oswaja się z zadaniami konkursowymi bez punktów ujemnych
i bez zegara.

## 2. Rozwiązanie — jak to wygląda oczami dziecka

Dziecko otwiera „Matematyczne zagadki” i widzi spokojną kartkę. U góry jest krótkie polecenie, na
przykład „Jaka liczba pasuje?”. Pośrodku kartki jest zadanie — działanie, rysunek kostek, mur
z dziurą — a w miejscu, którego brakuje, stoi „?”. Pod kartką leżą cztery karty z odpowiedziami.

Dziecko stuka kartę (albo przesuwa ramkę strzałkami i naciska Spację). Gdy wybierze dobrze, „?” na
kartce zamienia się we właściwą odpowiedź, kartka na chwilę zmienia tło na „dobrze” i po krótkiej
pauzie pojawia się następne zadanie na tej samej kartce.

Gdy się pomyli, wybrana karta łagodnie się kołysze i można próbować dalej. Po pierwszym błędzie
zadanie spokojnie świeci, po drugim paluszek wskazuje dobrą kartę, po trzecim gra sama pokazuje
rozwiązanie, a to zadanie wraca jeszcze raz na końcu rundy. Nie ma punktów, przegranej ani zegara.

Po siedmiu zadaniach jest spokojny ekran końca rundy z jeżykiem i wiewiórką: jeszcze raz, dalej albo
do domu. Przy kolejnej rundzie zadania są inne, a karty leżą w innej kolejności.

## 3. Historyjki użytkownika

1. Jako dziecko chcę zobaczyć zadanie z „?” w miejscu odpowiedzi i cztery karty, żeby wybrać tę,
   która pasuje.
2. Jako dziecko chcę, żeby po dobrej odpowiedzi „?” zamieniło się we właściwą liczbę, żeby zobaczyć
   zadanie rozwiązane.
3. Jako dziecko, które się pomyliło, chcę spróbować jeszcze raz i dostać podpowiedź, żeby nie utknąć
   i nie czuć się ukarane.
4. Jako dziecko chcę spotkać różne rodzaje zadań w jednej rundzie, żeby na konkursie nic mnie nie
   zaskoczyło.
5. Jako dziecko chcę w kolejnej rundzie dostać inne zadania, żeby nie odpowiadać z pamięci.
6. Jako rodzic chcę przeczytać dziecku polecenie nad zadaniem (albo dziecko czyta je samo), żeby
   ćwiczyło też rozumienie poleceń, jak na konkursie.
7. Jako rodzic chcę wybrać jeden z trzech poziomów trudności, żeby zacząć od łatwych zadań.
8. Jako rodzic chcę, żeby gra była widoczna tylko po ustawieniu wieku 5–7, żeby młodsze dziecko na
   nią nie trafiło.
9. Jako dziecko grające na komputerze chcę wybierać kartę strzałkami i Spacją, żeby nie potrzebować
   myszy.

## 4. Decyzje implementacyjne

- **Folder:** `src/games/konkurs-matematyczny/`. Poza nim zmienia się tylko wiersz gry
  w `docs/KATALOG-GIER.md`.
- **Manifest:** tytuł „Matematyczne zagadki”; obszar „Liczby”; wiek od 6 do 7 lat (tak podany,
  żeby hub pokazywał grę tylko w przedziale „5–7” — reguła w `docs/prd/platforma-wiek.md`); oba tryby
  sterowania; 3 poziomy; bez skórek.
- **Mechanika i sukces:** jedno zadanie = polecenie, rysunek zadania z „?” i cztery karty odpowiedzi,
  z których dokładnie jedna jest dobra. Runda to 7 zadań losowanych bez powtórzeń z puli poziomu, tak
  żeby w rundzie były co najmniej 4 różne typy zadań. Kolejność kart jest mieszana przy każdym
  pokazaniu zadania. Koniec rundy: ekran końca rundy platformy.
- **Wariant odpowiedzi:** wybór 1 z 4 (runda platformy „rozwiąż zadania po kolei”). Karty nie mają
  liter A–D; klawisze liter i cyfr nie wybierają kart (Z-32).
- **Pula zadań:** 50 zadań ułożonych ręcznie i zapisanych jako dane w logice gry: 17 na poziomie 1,
  17 na poziomie 2, 16 na poziomie 3. Zadania są własne — wzorowane na typach z arkuszy konkursowych,
  z innymi liczbami, słowami i rysunkami; gra nie używa nazwy konkursu ani treści arkuszy.
- **Typy zadań** (rysunek każdego typu powstaje z danych zadania, bez ręcznie rysowanych obrazków):

  | Typ | Co widać na kartce | Polecenie |
  |---|---|---|
  | brakująca liczba | działanie z pustym polem, np. „? + 3 = 7” albo „4 + 5 = 3 + ? + 1” | Jaka liczba pasuje? |
  | piramidka dodawania | kółka z liczbami łączone klamrą w sumę; jedno kółko to „?” | Jaka liczba pasuje? |
  | kostki | 2–3 kostki z oczkami | Ile oczek jest razem? |
  | ciąg liczb | rząd liczb, na końcu „?” | Jaka liczba będzie następna? |
  | rosnące figury | 3 coraz większe układy kółek lub kwadratów podpisane liczbą, czwarty to „?” | Z ilu kółek będzie następna figura? |
  | ta sama litera | zapis typu „A + A + A + A = 12” | Ile to A? |
  | kod literowy | tabelka litera = liczba i słowo albo rząd liczb | Ile razem są warte litery? / Jakie to słowo? |
  | znaki | działanie z pustymi polami między liczbami | Jakie znaki pasują? |
  | tarcza | tarcza z pierścieniami opisanymi liczbami i kropki trafień | Ile punktów zdobył strzelec? |
  | brakujące pola | mur, podłoga z płytek albo szachownica z brakującymi polami | Ile cegieł brakuje? / Ile płytek brakuje? |

- **Poziomy:**

  | Poziom | Zakres liczb | Typy zadań | Zadań w puli |
  |---|---|---|---|
  | 1 | do 10 | brakująca liczba (jedno działanie), kostki (2–3 kostki), ciąg liczb (co 1, co 2), piramidka z jednym dodawaniem, brakujące pola (do 6 pól), kod literowy „jakie to słowo” — do przejścia za pierwszym razem | 17 |
  | 2 | do 20 | brakująca liczba po obu stronach znaku „=”, piramidka z dwoma dodawaniami, ta sama litera, kod literowy „ile razem”, znaki, tarcza (2–3 trafienia), rosnące figury, brakujące pola (do 12 pól) | 17 |
  | 3 | do około 30 | ciągi o rosnącym kroku, rosnące figury (trójkąt, kwadrat, krzyżyk), piramidka z niewiadomą na górze, dwie litery w jednym zapisie, znaki przy czterech liczbach, tarcza (4–5 trafień), szachownica | 16 |

- **Błędne karty:** liczby bliskie dobrej odpowiedzi (jak w arkuszach: cztery kolejne albo co dwa),
  zawsze cztery różne. Karty leżą w kolejności wymieszanej, nie rosnącej.
- **Sterowanie — klawiatura:** strzałki przesuwają ramkę po kartach, Spacja albo Enter wybiera.
- **Sterowanie — dotyk:** stuknięcie karty. Karty mają co najmniej 80 px z odstępem 16 px: cztery
  w rzędzie, gdy się mieszczą, a na wąskim ekranie (375 px) w układzie 2 × 2.
- **Reakcja na błąd i podpowiedź:** drabina platformy. „Pytaniem” na scenie jest kartka z zadaniem
  (to ona świeci po pierwszym błędzie). Po rozwiązaniu „?” zamienia się w dobrą odpowiedź, a kartka
  zmienia tło na „dobrze” — tak samo po dobrej odpowiedzi i przy „zróbmy razem”, w czasie do 800 ms.
- **Scena:** stała przez całą rundę: tło, kartka, miejsce na polecenie i rząd kart. Między zadaniami
  wymienia się tylko polecenie, rysunek i karty; nowe wchodzą przenikaniem (Z-02). Nic się nie
  porusza poza reakcjami platformy.
- **Tekst i litery:** polecenie to jedno krótkie zdanie zwykłym pismem platformy, bez własnego kroju.
  Litery będące treścią zadania (kod literowy, „A + A”) — WIELKIE, przez litery platformy (Z-35).
  Polecenie jest też nazwą zadania dla czytników ekranu, a każda karta ma nazwę równą swojej treści.
- **Skórki i grafika:** rysunki zadań z prostych kształtów w kolorach z palety; informacji nie niesie
  sam kolor (trafienia na tarczy to kropki, brakujące pola mają kreskowany obrys). Bez czerwieni.
- **Dźwięk i nagroda:** tylko standardowe łagodne dźwięki platformy (dobra odpowiedź, neutralny ton
  błędu). Gra jest w pełni zrozumiała przy wyciszonym urządzeniu. Bohater ekranu końca rundy: wiewiórka.
- **Zapisywany postęp / ustawienia rodzica:** tylko ukończone poziomy, tak jak w innych grach. Gra nie
  zapamiętuje, które zadania już były, i nie zapisuje wyników.
- **Wyjątki od zasad designu** (decyzje rodzica, zapisywane w `docs/ZASADY-DESIGNU.md` przez zmianę
  `platforma-wiek`): polecenie tekstem (Z-10) oraz liczby powyżej 10 jako sam zapis, bez konkretów
  (Z-37). Poza nimi gra spełnia wszystkie zasady.

## 5. Decyzje testowe

- Testy logiki (`src/games/konkurs-matematyczny/logic.test.ts`):
  - każde zadanie z puli ma cztery różne karty, dokładnie jedna jest dobrą odpowiedzią, a dobra
    odpowiedź zgadza się z wynikiem policzonym z danych zadania (np. suma oczek, wartość liter słowa);
  - pula ma 50 zadań (17, 17, 16), a liczby w zadaniach mieszczą się w zakresie swojego poziomu;
  - runda każdego poziomu ma 7 różnych zadań co najmniej 4 typów, a dla tego samego ziarna losowości
    wychodzi ta sama runda.
- Testy globalne platformy (manifest, zakazane API) muszą przechodzić.
- Ręcznie w przeglądarce: runda każdego poziomu klawiaturą i dotykiem (ekran 375 × 812), także
  w poziomie; trzy błędy pod rząd; konsola bez błędów.

## 6. Definicja ukończenia

- [ ] Trzy poziomy z tabeli działają w obu trybach sterowania; każdy typ zadania z tabeli występuje
      w puli i rysuje się czytelnie na 375 × 812 i 667 × 375.
- [ ] Pula ma 50 własnych zadań; trzy testy z sekcji 5 istnieją i przechodzą.
- [ ] Po dobrej odpowiedzi „?” zamienia się w odpowiedź; trzy błędy pod rząd kończą się „zróbmy
      razem”, a zadanie wraca na koniec rundy.
- [ ] W przedziale wieku „3–5” gry nie ma w hubie, w „5–7” jest.
- [ ] `npm run check` przechodzi; `README.md` gry opisuje mechanikę, poziomy i oba wyjątki od zasad.
- [ ] `docs/KATALOG-GIER.md` ma wiersz gry ze statusem `gotowa`.
- [ ] Dziecko w wieku 5–7 lat przechodzi rundę poziomu 1 (test z dzieckiem — ticket rodzica).

## 7. Poza zakresem

- Zadania z klockami 3D, rozcinanymi figurami, kostkami w rzucie i drogą po kratkach.
- „Tryb konkursowy”: cały arkusz naraz, punkty, czas.
- Podsumowanie wyników i śledzenie postępów dla rodzica.
- Lektor czytający polecenia.
- Zadania tworzone losowo przez grę (pula jest stała).
- Odpowiedź wpisywana cyframi.

## 8. Uwagi

- Wymaga wcześniejszego wdrożenia `platforma-wiek` (ustawienie wieku i reguła widoczności w hubie).
- Arkusze konkursowe w folderze `konkurs/` są materiałem poglądowym rodzica, objętym prawem autorskim
  organizatora; nie są częścią gry ani builda.
- Dziesiąta gra mieści się w hubie bez przewijania (układ dla 10–12 gier).
- Pomysły na później: kolejne typy zadań z listy „Poza zakresem”, większa pula.
