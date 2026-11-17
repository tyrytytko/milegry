---
name: grill-me
description: Prowadzi z rodzicem wywiad o pomyśle na nową grę, zmianie w istniejącej grze albo zmianie w platformie, rundami po 1-3 pytania z rekomendowaną odpowiedzią, aż nie zostanie żadna otwarta decyzja. Nie pisze kodu ani plików. Pierwszy krok flow (następny to /to-prd).
argument-hint: "[pomysł na grę albo id istniejącej gry]"
disable-model-invocation: true
---

# /grill-me — wspólne zrozumienie, zanim powstanie kod

Temat od rodzica: $ARGUMENTS
Jeśli temat jest pusty, poproś jednym zdaniem: „Opowiedz w 2–3 zdaniach, co chcesz zrobić”.

(Na podstawie idei z mattpocock/skills, licencja MIT; uproszczone dla Miłych Gier.)

## Najważniejsze zasady

1. **Nie piszesz kodu ani plików.** Wynikiem jest potwierdzone podsumowanie w tej rozmowie.
2. **Rundy po 1–3 pytania**, ponumerowane. Każde pytanie ma **rekomendowaną odpowiedź** i jest
   sformułowane tak, żeby „tak” ją przyjmowało, np. „1. Czy na start wystarczą 3 kolory
   (czerwony, żółty, niebieski)? Polecam tak, bo…”. Rodzic może odpisać „tak”, „1 tak, 2 nie, wolę…”.
3. **Fakty sprawdzasz sam, decyzje należą do rodzica.** Nie pytaj o nic, co da się przeczytać
   w repo (czy nazwa jest wolna, jakie kontrolki i dźwięki daje platforma, jakie są obrazki).
4. **Język rodzica, bez żargonu.** Mów „dziecko dotyka obrazka”, nie „intencja pointer”; „co sprawdzą
   automatyczne testy”, nie „seam”. Gdy termin jest potrzebny, wyjaśnij go w pół zdania.
5. **Strzeż miłego designu.** Gdy pomysł łamie `docs/ZASADY-DESIGNU.md` (licznik czasu, przegrana,
   punkty ujemne, ranking, miganie, krzykliwe kolory), nazwij to łagodnie, powiedz dlaczego
   i zaproponuj zamiennik. Reguły z `docs/ARCHITEKTURA.md` („Reguły kodu gier”) nie podlegają
   negocjacji — wyjaśnij je, nie łam.
6. **Koniec dopiero**, gdy nie ma otwartych decyzji i rodzic potwierdził podsumowanie.

## Krok 1. Rozpoznanie (bez pytania rodzica)

Przeczytaj (brak pliku odnotuj i działaj dalej):
- `docs/ZASADY-DESIGNU.md`, `docs/DODAWANIE-GRY.md` (sekcja 2: co platforma robi za grę),
  `docs/KATALOG-GIER.md`; nowa gra — także `docs/TLO.md` (co potrafi dziecko 3/4/5 lat, opisy gier z kolejki);
  zmiana platformy — także `docs/ARCHITEKTURA.md`;
- `src/games/*/manifest.ts` i `src/games/*/README.md` (istniejące gry), `docs/prd/` (wcześniejsze plany);
- `src/core/round/index.ts` (warianty odpowiedzi i drabina podpowiedzi), `src/core/types.ts`
  (kontrolki, dźwięki) i `src/core/art/index.ts` (gotowe obrazki).

Ustal sam:
- **rodzaj pracy**: nowa gra / zmiana istniejącej gry / zmiana w platformie (hub, panel rodzica, rdzeń);
- czy pomysł jest w katalogu gier — jeśli tak, potraktuj jego opis w `docs/TLO.md` jako punkt wyjścia;
- czy proponowane id jest wolne; które podobne gry już istnieją.

Przy dużym przeglądzie użyj subagenta Explore i przekaż mu w poleceniu najważniejsze reguły
z `CLAUDE.md` (Explore go nie czyta). Nie wstrzymuj pierwszej rundy pytań, jeśli od niego nie zależy.

Napisz rodzicowi 2–4 zdania: co zrozumiałeś, jaki to rodzaj pracy, co już wiesz z repo. Potem runda 1.

## Krok 2. Wywiad według drzewa decyzji

Każda decyzja otwiera kolejne. Pytaj tylko o te, których przesłanki są już ustalone. Pomijaj
gałęzie, na które odpowiedź już padła albo wynika z repo. Co 2–3 rundy pokaż krótki stan:
„Ustalone: … Zostało do ustalenia: …”.

### Nowa gra (kolejność orientacyjna)

1. **Cel rozwojowy** — jedna konkretna umiejętność („dobiera takie same kolory”, nie „kolory”),
   obszar (litery, liczby, kształty, logika, pamięć), wiek: 3, 4 czy 5 lat.
2. **Mechanika i wariant odpowiedzi** — jak wygląda jedno zadanie i co jest sukcesem. Ustal, który
   z czterech wariantów pasuje (sam zaproponuj; to decyduje, ile platforma zrobi za grę):
   - **wybór 1 z kilku** rzeczy na ekranie (2–4 karty, okienka, koszyczki),
   - **liczba wpisana cyframi** (np. „ile jest orzeszków?”),
   - **litera** (dziecko naciska albo dotyka literę),
   - **gra ciągła** — rzeczy się ruszają, dziecko chodzi po planszy albo robi kilka kroków
     (spadające literki, labirynt, pary). Tu więcej decyzji należy do gry.
   Runda to 5–10 zadań.
3. **Reakcja na błąd** — platforma robi to sama i tak samo w każdej grze: zła odpowiedź łagodnie się
   kołysze (cichy, neutralny ton), po 1. błędzie spokojnie świeci „pytanie”, po 2. paluszek albo klawisz
   wskazuje dobrą odpowiedź, po 3. „zróbmy razem” — gra pokazuje rozwiązanie, a zadanie wraca później.
   Zapytaj tylko: co na scenie jest „pytaniem” i co scena pokazuje, gdy zadanie jest rozwiązane.
   Potwierdź: bez przegranej, bez odejmowania punktów, bez limitu czasu.
4. **Zrozumiałość bez czytania** — gdy dziecko nic nie robi, platforma po kilku sekundach pokazuje
   paluszek albo klawisz przy dobrej odpowiedzi. Czy to wystarczy, czy scena ma coś pokazać sama?
5. **Poziomy i progresja** — ile, co rośnie z poziomem (liczba rzeczy, zakres), stałe czy losowane.
   Poziom 1 ma być do przejścia za pierwszym razem.
6. **Sterowanie** — rekomendacja domyślna: oba tryby. W wariantach z punktu 2 platforma daje gotowe
   sterowanie: wybór — strzałki + Spacja albo stuknięcie; cyfry — klawisze cyfr albo klawiatura
   na ekranie; litera — klawisz litery albo przyciski z literami. Gra ciągła: ustal klawisze (czy
   3-latek w nie trafi) i co dziecko dotyka (duże rzeczy na scenie, strzałki na ekranie).
7. **Skórka i świat** — bohater, sceneria, czy potrzebne wymienne skórki. Kolory tylko z palety platformy.
8. **Nagroda i rytm** — spokojny ekran końca rundy platformy (jeżyk i bohater gry — inna postać niż
   jeżyk), długość rundy (cel 1–3 minuty), naturalny koniec.
9. **Dźwięk** — które łagodne dźwięki platformy; gra musi mieć sens przy wyciszonym tablecie.
10. **Zgodność z zasadami designu** — przejdź checklistę z `docs/ZASADY-DESIGNU.md` i potwierdź
    ją jednym pytaniem („Gra spełnia wszystkie te zasady — zgadza się?”).
11. **Rodzic** — czy coś ustawia lub ogląda (zwykle wystarczą ustawienia platformy: tempo, dźwięk).
12. **Zakres i odbiór** — co NIE wchodzi do pierwszej wersji; po czym poznamy, że gra jest gotowa;
    czy rodzic zrobi test z dzieckiem (rekomendacja: tak).

### Zmiana w istniejącej grze (np. nowa skórka, nowe poziomy)

Przeczytaj folder gry i jej PRD (`docs/prd/<id>.md`, jeśli jest). Pytaj tylko o: co ma się zmienić
oczami dziecka, czego nie ruszamy, czy zapisany postęp dziecka ma przetrwać, wpływ na oba tryby
sterowania, zgodność z zasadami designu, co poza zakresem, po czym poznamy, że gotowe.
Mała zmiana to zwykle 1–2 rundy.

### Zmiana w platformie (hub, panel rodzica, rdzeń)

Pytaj o: kogo dotyczy (dziecko, rodzic, autor gry), co ma się zmienić, zgodność z zasadami, co poza
zakresem, po czym poznamy, że gotowe. Sam sprawdź, czy zmienia się kontrakt gra ↔ rdzeń
(`src/core/types.ts`, `src/core/round/index.ts`); jeśli tak, powiedz rodzicowi wprost, że zmiana może dotknąć
wszystkie gry (a `docs/ARCHITEKTURA.md` trzeba będzie zaktualizować razem z nią).

## Krok 3. Podsumowanie i potwierdzenie

Gdy nie ma już otwartych decyzji, podsumuj w 8–12 punktach (nowa gra) albo 4–8 (zmiana):
- rodzaj pracy i **proponowany slug** (krótka nazwa ASCII, patrz niżej);
- cel, jak się gra oczami dziecka, poziomy, sterowanie, reakcja na błąd, skórka, dźwięk;
- zgodność z zasadami designu, co poza zakresem, po czym poznamy, że gotowe;
- **założenia**, które przyjąłeś bez pytania („Zakładam, że…”) — żeby rodzic mógł je skorygować.

Zapytaj: „Czy to się zgadza? Popraw, co chcesz.” Po poprawkach pokaż tylko zmienione punkty
i zapytaj ponownie.

**Slug** (małe litery, cyfry, myślniki, bez polskich znaków):
- nowa gra: id gry, np. `kolory` (będzie też nazwą folderu i adresem `/kolory/`);
- zmiana gry: `<id>-<zmiana>`, np. `labirynt-skorka-kot`;
- platforma: `platforma-<zmiana>`, np. `platforma-panel-postepu`.

## Definicja ukończenia

- [ ] Każda gałąź drzewa ma odpowiedź albo jest jawnie „poza zakresem”.
- [ ] Rodzic potwierdził podsumowanie (wprost: „tak”, „zgadza się”).
- [ ] Nie zmieniono żadnych plików.

## Co dalej

Powiedz rodzicowi: „Następny krok: wpisz `/to-prd <slug>` **w tej samej rozmowie** — nie czyść jej,
bo dokument powstanie właśnie z niej.”
