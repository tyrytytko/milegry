---
name: nowa-gra
description: Prowadzi rodzica przez cały flow tworzenia nowej gry w jednej rozmowie - wywiad (/grill-me), dokument wymagań (/to-prd) i podział na tickety (/to-tickets) - z potwierdzeniem po każdym etapie, a na końcu wskazuje, jak zacząć implementację. Skrót dla nowych gier.
argument-hint: "[krótki pomysł na grę]"
disable-model-invocation: true
---

# /nowa-gra — od pomysłu do listy ticketów

Pomysł rodzica: $ARGUMENTS

Ten skrót nie ma własnych reguł. Wykonuje kolejno trzy skille flow, czytając ich pliki — to one
są jedynym źródłem prawdy. (Skille flow może uruchomić tylko człowiek, więc nie wywołujesz ich
narzędziem Skill, tylko czytasz plik i wykonujesz jego instrukcje.)

## Najważniejsze zasady

1. **Etapy po kolei, z bramką po każdym.** Nie zaczynasz etapu, dopóki rodzic nie potwierdził
   wyniku poprzedniego.
2. **W przeczytanych plikach** `$ARGUMENTS` oznacza: w etapie 1 — pomysł rodzica powyżej,
   w etapach 2 i 3 — slug ustalony w etapie 1.
3. **Pomijasz sekcje „Co dalej”** etapów 1 i 2 (nie każesz rodzicowi wpisywać komend) —
   zamiast tego proponujesz następny etap tutaj.
4. **Nie implementujesz** w tej rozmowie. Po etapie 3 rozmowa jest długa, a agent pracuje
   najlepiej z czystym kontekstem; implementacja zaczyna się po `/clear`.
5. Gdy w trakcie wywiadu okaże się, że to zmiana istniejącej gry albo platformy, a nie nowa gra,
   powiedz to i prowadź dalej tak samo (skille obsługują wszystkie trzy rodzaje pracy).

## Etap 1. Wywiad

Przeczytaj `.claude/skills/grill-me/SKILL.md` i wykonaj go w całości.
Bramka: rodzic potwierdził podsumowanie. Zapytaj: „Przechodzimy do spisania planu gry (PRD)?”

## Etap 2. Dokument wymagań

Przeczytaj `.claude/skills/to-prd/SKILL.md` i wykonaj go dla ustalonego sluga.
Bramka: PRD ma `status: zatwierdzony`. Zapytaj: „Dzielimy plan na tickety?”

## Etap 3. Tickety

Przeczytaj `.claude/skills/to-tickets/SKILL.md` i wykonaj go dla tego samego sluga.
Bramka: rodzic zaakceptował listę, pliki są zapisane.

## Definicja ukończenia

- [ ] Rodzic potwierdził podsumowanie wywiadu.
- [ ] `docs/prd/<slug>.md` istnieje ze `status: zatwierdzony`.
- [ ] `docs/tickets/<slug>/` zawiera zaakceptowane tickety; ticket 01 to grywalny szkielet
      zaczynający się od `npm run nowa-gra`.
- [ ] Nie zmieniono kodu (gry z szablonu nie tworzysz — robi to `/implement` w tickecie 01).

## Co dalej

Powiedz rodzicowi: „Plan gotowy. Teraz wpisz `/clear` (czyścimy rozmowę, plan jest w plikach),
a potem `/implement <slug>` — agent zbuduje ticket 01: utworzy grę z gotowego szablonu
i zrobi pierwszą grywalną wersję z jednym poziomem. Każdy kolejny ticket: `/clear` i znów `/implement <slug>`.”
