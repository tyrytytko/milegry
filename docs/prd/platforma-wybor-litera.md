---
slug: platforma-wybor-litera
rodzaj: platforma
dotyczy: platforma
status: zatwierdzony
data: 2026-11-17
---

# Wybór żołędzia klawiszem litery

## 1. Problem — po co to robimy

W grze „Literki bliźniaczki” dziecko przy komputerze widzi litery na żołędziach i naturalnie naciska
klawisz z tą literą — a gra nie reaguje wcale: ani zaliczenia, ani łagodnego błędu, ani podpowiedzi.
Co gorsza, każde takie naciśnięcie odsuwa pomoc, bo gra uznaje, że dziecko „coś robi”. Pierwszy naciśnięty
klawisz odsłania też ramkę wyboru na środkowym żołędziu, co wygląda jak podświetlenie przypadkowej litery.
To samo milczenie spotyka dziecko w grze „Literki z imienia”, gdy przy kafelkach „Ł / L / inna” naciśnie „L”.

## 2. Rozwiązanie — jak to wygląda oczami dziecka

Dziecko gra w „Literki bliźniaczki” na komputerze. Wiewiórka trzyma liść z literą, niżej leżą żołędzie
z literami. Dziecko naciska na klawiaturze literę, którą widzi na właściwym żołędziu — żołądź zostaje
wybrany tak samo, jakby dziecko go stuknęło: obie formy litery stają obok siebie na liściu i po chwili
przychodzi następne zadanie.

Gdy dziecko naciśnie literę z innego żołędzia, ten żołądź łagodnie się kołysze i słychać cichy, neutralny
ton. Gdy naciśnie literę, której nie ma na żadnym żołędziu, kołysze się liść ze wzorem. W obu przypadkach
pomoc przychodzi jak zawsze: po pierwszej pomyłce liść spokojnie świeci, po drugiej paluszek wskazuje
właściwy żołądź, po trzeciej gra pokazuje rozwiązanie („zróbmy razem”), a zadanie wraca na koniec rundy.
Nie ma przegranej, punktów ani limitu czasu.

Ramka wyboru nie pojawia się po naciśnięciu litery. Widać ją dopiero wtedy, gdy dziecko użyje strzałki
albo Spacji — wtedy działa jak dotąd. Strzałki ze Spacją i stuknięcie palcem zostają bez zmian.

W „Literkach z imienia”, gdy pod kratkami stoją trzy kafelki (na przykład „Ł / L / K”), naciśnięcie „L”
łagodnie kołysze kafelek „L” i uruchamia tę samą pomoc, zamiast ciszy. Kto umie wpisać „Ł” (AltGr + L),
ten wybiera właściwy kafelek; nikt nie musi tego umieć, bo strzałki ze Spacją zostają.

## 3. Historyjki użytkownika

1. Jako dziecko chcę nacisnąć klawisz z literą, którą widzę na żołędziu, żeby wybrać ten żołądź.
2. Jako dziecko, które nacisnęło złą literę, chcę zobaczyć łagodną reakcję i po kilku próbach dostać
   podpowiedź, żeby nie utknąć przed ekranem, który milczy.
3. Jako dziecko, które odpowiada literami, nie chcę widzieć ramki na żołędziu, którego nie wybrałem, żeby
   nie myśleć, że gra coś zaznaczyła.
4. Jako dziecko, które używa strzałek i Spacji albo palca, chcę grać dokładnie tak jak dotąd.
5. Jako dziecko układające imię z literą „Ł” chcę, żeby naciśnięcie „L” dało łagodną reakcję i pomoc,
   żeby dowiedzieć się, że trzeba wybrać inny kafelek.
6. Jako rodzic chcę, żeby walenie w klawisze nadal niczego nie zaliczało, żeby dziecko nie przechodziło
   rundy przypadkiem.
7. Jako autor gry chcę jednym polem powiedzieć platformie, jaka litera jest na którym elemencie wyboru,
   żeby gra nie budowała własnego nasłuchu klawiszy; gra, która tego pola nie poda, działa jak dotąd.

## 4. Decyzje implementacyjne

- **Moduły:** warstwa rundy w rdzeniu (`src/core/round/` — wariant „wybór 1 z N” w `runRound`) oraz ramka
  wyboru i wiedza o tym, czym dziecko steruje (`src/core/ui/`, `src/core/input/`). Gry: `literki-blizniaczki`
  i `imie` — każda w osobnym tickecie, tylko we własnym folderze.
- **Zmiana kontraktu gra ↔ rdzeń:** wariant „wybór 1 z N” dostaje nowe, opcjonalne pole: litera przypisana
  do każdego elementu wyboru. Komentarze typów w `src/core/round/index.ts`, akapity „Warstwa rundy”
  i „Wejście” w `docs/ARCHITEKTURA.md` oraz — jeśli gra może się na tym potknąć — pułapki
  w `docs/DODAWANIE-GRY.md` aktualizujemy w tym samym commicie co zmianę rdzenia.
- **Wpływ na istniejące gry:** gry bez tego pola (`okienka`, `po-jednym`) zachowują się jak dotąd — litery
  nadal nic w nich nie robią. Zmiana ramki wyboru (niżej) dotyczy wszystkich gier z wyborem, ale widać ją
  tylko tam, gdzie dziecko naciska litery.
- **Litera wybiera element:** gdy gra podała litery, klawisz litery działa jak wybranie elementu z tą literą
  — tą samą drogą co stuknięcie i Spacja (ta sama ocena, ta sama blokada po błędzie, ta sama pauza między
  zadaniami). Wielkość i krój litery na ekranie nie mają znaczenia: klawisz „M” wybiera żołądź z małym
  pisanym „m”. „A” i „Ą” to różne litery (Z-31).
- **Zła litera = łagodny błąd (decyzja rodzica):** litera z innego elementu — kołysze się ten element;
  litera, której nie ma na żadnym elemencie — kołysze się obiekt pytania (liść). Oba przypadki liczą się
  w drabinie podpowiedzi (Z-19) tak jak błędny wybór.
- **Podpowiedzi bez zmian (decyzja rodzica):** po 2. błędzie i z bezczynności paluszek przy poprawnym
  elemencie, także na klawiaturze. Paluszek z bezczynności może stać razem z poświatą po 1. błędzie —
  to zachowanie zamierzone.
- **Ramka wyboru (decyzja rodzica):** odsłaniają ją tylko strzałka albo Spacja/Enter; klawisz litery jej
  nie odsłania. Gdy ramka jest już widoczna, po wyborze literą przeskakuje na wybrany element, jak przy
  stuknięciu. Początek pracy nad tym punktem to odtworzenie w podglądzie, że dziś klawisz litery odsłania
  ramkę na środkowym elemencie; jeśli przyczyna „podświetlenia przypadkowej litery” okaże się inna, ticket
  wraca do rodzica z pytaniem.
- **Litery z ogonkiem:** działają przez AltGr, ale nigdy nie są wymagane — strzałki i Spacja zostają (Z-31).
  Zgodność z Z-32: litera jest tu treścią zadania, więc wolno ją przypisać do elementu wyboru.
- **`literki-blizniaczki`:** gra podaje platformie litery żołędzi; README gry (sekcja „Sterowanie”) opisuje
  wybór klawiszem litery zamiast jego braku. Poziomy, zadania i wygląd bez zmian.
- **`imie`:** przy trzech kafelkach dla litery z ogonkiem gra podaje platformie litery kafelków. README gry
  („Sterowanie” i „Decyzje właściciela”) opisuje nowe zachowanie klawisza „L” przy „Ł”. Poziomy, zadania
  i wariant literowy pozostałych liter bez zmian.
- **Dotyk i zapis:** bez zmian; zapisany postęp dziecka zostaje nietknięty.
- **Katalog:** ticket rdzenia usuwa z „Platforma — kolejka” w `docs/KATALOG-GIER.md` pozycję pilną o wyborze
  klawiszem litery; ticket gry `imie` — pozycję „opcjonalne” o klawiszu „L” przy kafelkach.

## 5. Decyzje testowe

- Testy warstwy rundy (obok modułu, na atrapie `ctx`), wariant „wybór 1 z N” z podanymi literami:
  - klawisz poprawnej litery zalicza zadanie;
  - klawisz litery z innego elementu kołysze ten element i daje 1. szczebel drabiny;
  - klawisz litery spoza elementów kołysze obiekt pytania i też liczy się jako błąd;
  - trzy błędy literami dają „zróbmy razem”, a zadanie wraca na koniec rundy;
  - w czasie blokady po błędzie i w pauzie między zadaniami litera nic nie zmienia;
  - bez podanych liter klawisz litery nic nie robi (jak dotąd).
- Test ramki wyboru: klawisz litery nie odsłania ramki; strzałka i Spacja odsłaniają ją jak dotąd.
- Testy globalne platformy (manifest, zakazane API, skaner reguł) muszą przechodzić.
- Ręcznie w przeglądarce: runda `literki-blizniaczki` i runda `imie` z imieniem zawierającym „Ł” —
  klawiaturą (litery oraz strzałki ze Spacją) i dotykiem 375 × 812; konsola bez błędów. Do tego po jednym
  zadaniu w `okienka` i `po-jednym` klawiaturą, żeby potwierdzić brak zmian.

## 6. Definicja ukończenia

- [ ] W `literki-blizniaczki` klawisz litery z właściwego żołędzia zalicza zadanie na każdym poziomie.
- [ ] Zła litera kołysze właściwy element (żołądź albo liść) i uruchamia drabinę podpowiedzi; nic nie „karze”.
- [ ] Klawisz litery nie odsłania ramki wyboru; strzałki, Spacja i dotyk działają jak dotąd.
- [ ] W `imie` klawisz „L” przy kafelkach „Ł / L / inna” daje łagodny błąd z podpowiedzią, a AltGr + L zalicza.
- [ ] Walenie w klawisze przez 5 s niczego nie zalicza (Z-21).
- [ ] Testy z sekcji 5 istnieją i przechodzą; `npm run check` przechodzi.
- [ ] Komentarze typów i `docs/ARCHITEKTURA.md` opisują nowe pole; README obu gier opisują nowe sterowanie;
      obie pozycje zniknęły z kolejki w `docs/KATALOG-GIER.md`.
- [ ] Rodzic zrobił test z dzieckiem na klawiaturze w `literki-blizniaczki` (ticket rodzica).

## 7. Poza zakresem

- Rysunek klawisza z literą jako podpowiedź w wariancie wyboru (zostaje paluszek).
- Zmiana chwili, w której przychodzi podpowiedź z bezczynności, i jej współwystępowania z poświatą.
- Zmiany na dotyku.
- Zmiany poziomów, zadań i wyglądu w `literki-blizniaczki` i `imie`.
- Gry `okienka` i `po-jednym` oraz wybór cyframi.
- Pozostałe pozycje wyboru 1 z N z kolejki platformy (odpowiedź „żadne”, wybór dwukrokowy).

## 8. Uwagi

- Źródło: zgłoszenie rodzica zapisane jako pozycja pilna w „Platforma — kolejka” (`docs/KATALOG-GIER.md`).
- Kolejność prac: najpierw rdzeń, potem obie gry (zależą od nowego pola), na końcu test rodzica z dzieckiem.
