# Jak pracować z agentem — przewodnik dla rodzica

Masz pomysł na grę albo zmianę w istniejącej grze. Ten przewodnik mówi, co wpisać w Claude Code,
czego się spodziewać i co zrobić, gdy coś pójdzie nie tak.

## Kilka pojęć na start

- **Agent** — Claude Code: czyta i zmienia pliki w projekcie, uruchamia komendy, rozmawia z Tobą.
- **Komenda z ukośnikiem** (np. `/grill-me`) — uruchamia **skill**, czyli zapisany w repo przepis
  na jeden etap pracy (`.claude/skills/`). Wpisujesz ją w okno rozmowy jak zwykłą wiadomość.
- **Rozmowa (kontekst)** — wszystko, co agent „pamięta” w bieżącej sesji. Im dłuższa rozmowa,
  tym agent jest mniej dokładny. `/clear` czyści rozmowę; to, co ważne, i tak jest w plikach.
- **PRD** (dokument wymagań) — plik `docs/prd/<slug>.md`: po co jest gra, jak się w nią gra,
  jakie decyzje podjęliśmy, czego nie robimy. Pamięć projektu zamiast długiej rozmowy.
- **Ticket** — jedno zadanie dla agenta na jedną sesję, plik `docs/tickets/<slug>/NN-nazwa.md`.
  Po każdym tickecie da się coś zobaczyć albo zagrać.
- **Slug** — krótka nazwa bez polskich znaków, np. `kolory` albo `labirynt-skorka-kot`.
- **Test** — mały program, który sam sprawdza reguły gry (np. „każdy poziom da się przejść”).
- **Commit** — zapisanie zmian w historii projektu (git). Pozwala wrócić do wcześniejszej wersji.
- **Subagent** — pomocniczy agent z czystą rozmową. Używamy go głównie jako recenzenta.

## Ścieżka w skrócie

```
/grill-me  →  /to-prd  →  /to-tickets  →  /clear + /implement  (powtarzasz dla każdego ticketu)
 rozmowa       plan         zadania          budowa, jedno zadanie na raz
```

Dla nowej gry trzy pierwsze kroki robi za Ciebie skrót **`/nowa-gra <pomysł>`** — pyta
o potwierdzenie po każdym etapie. Dla zmiany w istniejącej grze albo w platformie wpisuj
komendy po kolei.

## Krok po kroku

### 1. `/grill-me <pomysł>` — rozmowa

Wpisz np. `/grill-me gra w dopasowywanie kolorów dla 3-latka`. Agent najpierw sam przegląda
projekt, potem zadaje po 1–3 pytania naraz. **Przy każdym pytaniu podaje swoją propozycję** —
odpowiedź „tak” ją przyjmuje. Możesz odpisać krótko: „1 tak, 2 nie — wolę zwierzątka”.
Agent pilnuje zasad miłego designu: jeśli zaproponujesz np. licznik czasu, zaproponuje coś
łagodniejszego. Na końcu pokazuje podsumowanie w punktach — przeczytaj je uważnie i popraw,
co trzeba. Trwa to zwykle 10–20 minut.

### 2. `/to-prd <slug>` — plan na piśmie

**W tej samej rozmowie** (nie czyść jej!). Agent spisuje ustalenia do `docs/prd/<slug>.md`,
zapyta jeszcze o to, co mają sprawdzać testy, i pokaże skrót. Możesz otworzyć plik i poprawić go
sam. Po Twoim „OK” plan jest zatwierdzony.

### 3. `/to-tickets <slug>` — podział na zadania

Agent pokaże numerowaną listę ticketów, np. „01. Grywalny szkielet — agent”, „06. Test
z dzieckiem — rodzic”. Pierwszy ticket nowej gry to zawsze najprostsza grywalna wersja
z jednym poziomem. Możesz poprosić o połączenie lub rozdzielenie zadań. Pliki powstają
dopiero po Twojej akceptacji.

### 4. `/clear`, potem `/implement <slug>` — budowa

Agent bierze **jeden** ticket: pisze testy i kod, uruchamia sprawdzenia, ogląda grę
w przeglądarce (klawiaturą i jak na telefonie), prosi recenzenta o ocenę, zapisuje notatki
w tickecie i zmienia jego status. Na końcu powie, jak obejrzeć wynik, i zapyta:
„Zapisać zmiany (commit)?”. Potem znów `/clear` i `/implement <slug>` — aż do końca listy.

Gdy przyjdzie kolej na ticket oznaczony **„kto: rodzic”** (np. test z dzieckiem), agent nie
programuje, tylko daje Ci instrukcję: co otworzyć, co dać dziecku, na co patrzeć. Odpisz mu,
jak poszło („OK” albo co poprawić) — jeśli trzeba poprawek, sam zaproponuje nowy ticket.

## Przykład 1: zmiana w istniejącej grze — nowa skórka „Spadających literek”

```
Ty:    /grill-me nowa skórka do literek: listki spadają z drzewa
Agent: (przegląda folder src/games/literki/) Rozumiem: zmiana istniejącej gry — nowy wygląd,
       te same poziomy. 1. Czy listki mają być czwartą skórką obok kurczaczków, rybek
       i kasztanów? Polecam: tak. 2. Czy po otwarciu listka ma się pokazać obrazek z gotowych
       obrazków platformy? Polecam: tak, bez rysowania nowych.
Ty:    tak, tak
Agent: (jeszcze jedna runda, potem podsumowanie, slug: literki-skorka-listki) Zgadza się?
Ty:    tak
Ty:    /to-prd literki-skorka-listki      → docs/prd/literki-skorka-listki.md
Ty:    /to-tickets literki-skorka-listki  → 01 skórka listków (agent), 02 odbiór wyglądu (rodzic)
Ty:    /clear  →  /implement literki-skorka-listki   (ticket 01: agent zmienia tylko src/games/literki/)
Ty:    /clear  →  /implement literki-skorka-listki   (ticket 02: oglądasz i odpisujesz „OK”)
```

## Przykład 2: nowa gra „kolory”

```
Ty:    /nowa-gra dziecko dopasowuje kolorowe kulki do takich samych koszyczków
Agent: (wywiad: cel — rozpoznaje 3 kolory; ruch — wybór 1 z kilku: dotknięcie albo strzałki
       + Spacja; błąd — kulka łagodnie się kołysze, potem podpowiedź; poziomy — od 2 do 5 kolorów)
       … podsumowanie → Twoje „tak” → PRD → Twoje „OK” → lista ticketów:
       01. Grywalny szkielet: 1 poziom, 2 kolory, klawiatura i dotyk — agent
       02. Poziomy 2–5 — agent
       03. Skórka i grafika — agent
       04. Test z dzieckiem — rodzic
Ty:    tak
Ty:    /clear  →  /implement kolory
Agent: (ticket 01) tworzy grę z gotowego szablonu: npm run nowa-gra -- kolory "Kolorowe kulki" logika,
       potem zmienia reguły, wygląd i sprawdza w przeglądarce … „Zapisać zmiany (commit)?”
Ty:    tak
Ty:    /clear  →  /implement kolory   … i tak dalej, ticket po tickecie.
```

Podpowiedzi po błędach (poświata, paluszek, „zróbmy razem”) i koniec rundy daje platforma —
nie trzeba ich planować jako osobnych ticketów.

## Jak obejrzeć efekt i jak wypuścić grę

Uruchomienie podglądu i publikacja na serwerze: `README.md` (sekcje „Uruchomienie” i „Publikacja”).
Widok telefonu w przeglądarce: **F12** → ikonka telefonu/tabletu → rozmiar 375×812; kliknięcia myszką
działają wtedy jak dotyk. W aplikacji Claude desktop agent sam otwiera podgląd w panelu przeglądarki.

Co warto sprawdzić samemu na telefonie, tablecie i z dzieckiem: `docs/OTWARTE-SPRAWY.md`.

## Gdy coś pójdzie nie tak

| Sytuacja | Co zrobić |
|---|---|
| Agent zadaje za dużo pytań albo używa trudnych słów | Napisz: „prościej, po jednym pytaniu” albo „co znaczy …?”. |
| Zmieniłeś zdanie w trakcie wywiadu | Po prostu napisz — agent zaktualizuje ustalenia. |
| Zmieniłeś zdanie po PRD | Popraw plik PRD sam albo `/grill-me <slug>`, a potem `/to-prd <slug>`. |
| `/to-prd` mówi, że nie widzi rozmowy | Rozmowa została wyczyszczona — wróć do `/grill-me`. |
| Agent chce robić kilka ticketów naraz | Zatrzymaj go (Esc) i przypomnij: jeden ticket na sesję. |
| Agent „zapomina” zasad, myli się coraz częściej | Rozmowa jest za długa: `/clear` i zacznij krok od nowa — plany są w plikach. |
| Sesja przerwała się w trakcie `/implement` | Wpisz znów `/implement <slug>` — agent znajdzie ticket „w toku” i zapyta, czy go dokończyć. |
| `npm run check` jest czerwony | Poproś: „`npm run check` nie przechodzi — napraw i wyjaśnij, co było nie tak”. |
| Gry nie ma na liście gier | Poproś: „uruchom `npm run sprawdz-gre -- <id>` i popraw błędy” — zwykle to błąd w opisie gry (manifeście). |
| `npm run nowa-gra` odmawia | Czytaj komunikat: id ma być bez polskich znaków i spacji (np. `kolory`), nie może być zajęte. |
| Gra nie działa w przeglądarce | Napisz agentowi, co widzisz (najlepiej zrzut ekranu i błędy z konsoli F12 → Console). |
| Chcesz cofnąć zmiany z ticketu przed commitem | Poproś: „cofnij niezapisane zmiany z tego ticketu”. |
| Chcesz cofnąć zmiany po commicie | Poproś: „cofnij ostatni commit przez git revert”. |
| Ticket jest „zablokowany” | Przeczytaj notatki w pliku ticketu — zwykle czeka na Twoją decyzję. |
| Komendy nie ma w menu po wpisaniu `/` | Sprawdź, czy jesteś w folderze projektu; uruchom Claude Code ponownie. |

## Małe zmiany bez całego flow

Literówkę, inny kolor z palety albo oczywisty błąd w jednym miejscu możesz zlecić zwykłym
zdaniem, np. „popraw literówkę w opisie gry kolory”. Agent i tak uruchomi `npm run check`
i sprawdzi wynik. Jeśli zmiana zmienia to, jak dziecko gra, agent zaproponuje `/grill-me`.
