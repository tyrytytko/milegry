---
status: zrobione
kto: rodzic
zalezy-od: ["02", "03"]
prd: docs/prd/platforma-wybor-litera.md
historyjki: [1, 2, 3]
---

# 05 — Test z dzieckiem na klawiaturze

## Co zbudować

Nic do zbudowania — to odbiór przez rodzica. Dziecko gra w „Literki bliźniaczki” na komputerze z klawiaturą,
a rodzic patrzy, czy naciskanie liter działa tak, jak opisuje PRD (sekcja 2), i czy nic nie wygląda na
„podświetlenie przypadkowej litery”.

## Kryteria akceptacji

- [x] Dziecko przeszło co najmniej jedną rundę poziomu 1, odpowiadając klawiszami liter.
- [x] Po złej literze dziecko widziało łagodną reakcję i (po kolejnych pomyłkach) podpowiedź; nic go nie
      zaniepokoiło ani nie „ukarało”.
- [x] Rodzic nie zauważył ramki ani podświetlenia na żołędziu, którego dziecko nie wybrało.
- [x] Rodzic odpisał agentowi wynik; ewentualne uwagi trafiły do „Notatek z realizacji”.

## Jak sprawdzić

Instrukcja dla rodzica:

1. Uruchom podgląd: `npm run dev` i otwórz http://localhost:5173/literki-blizniaczki/ na komputerze z klawiaturą.
   Wybierz poziom 1.
2. Posadź dziecko i nic nie tłumacz. Zobacz, czy samo zacznie naciskać litery.
3. Patrz na trzy rzeczy:
   - czy po naciśnięciu właściwej litery żołądź „wskakuje” od razu, czy dziecko czeka albo naciska drugi raz;
   - co się dzieje po złej literze — czy dziecko zauważa kołysanie i próbuje ponownie, czy się zniechęca;
   - czy na ekranie pojawia się ramka albo podświetlenie, którego dziecko nie wywołało.
4. Jeśli dziecko ma ochotę, daj mu jeszcze poziom 3 (trzy żołędzie, bez stałej podpowiedzi).
5. Odpisz agentowi krótko: „działa” albo co było nie tak (na którym poziomie, po jakim klawiszu, co było
   widać na ekranie).

## Notatki z realizacji

2026-11-17

- Odbiór przez rodzica: test z dzieckiem na klawiaturze przeprowadzony, wynik „wszystko OK” — bez uwag
  i bez poprawek do zrobienia.
