# Otwarte sprawy dla właściciela

Rzeczy, których agent nie mógł sprawdzić sam: prawdziwy dotyk, odsłuch, animacje na żywo, serwer.
Po sprawdzeniu pozycję usuń (albo dopisz, co wyszło). Decyzji do podjęcia teraz nie ma; plany na później
są w `docs/KATALOG-GIER.md`.

## Do sprawdzenia na własnych urządzeniach

- Telefon/tablet, prawdziwy palec: jajko w `literki`; czy w `okienka` po stuknięciu nie zostaje obrys;
  przytrzymanie domku w grze (1,5 s) i „Dla rodziców” w hubie (2 s) — czy pierścień wypełnia się płynnie.
- Telefon z wycięciem na aparat (np. iPhone, Safari), w pionie i w poziomie: w hubie jeżyk, ikonka „Dla
  rodziców” i kafelki, a w grze domek, pasek, scena i klawisze nie chowają się pod wycięciem ani
  zaokrąglonym rogiem; hub się nie przewija. Na wąskim telefonie z wycięciem po bokach (zwykle Android, w poziomie
  poniżej ok. 730–760 px) klawiatura cyfr w `orzeszki`, `patyczki` i przy bramie w `labirynt` ma mniejsze klawisze
  (64 px) — czy dziecko w nie trafia. W podglądzie sprawdzone tylko na symulowanym wycięciu.
- Dźwięk: głośność, „Wycisz wszystko”, dźwięk końca rundy — zwłaszcza na iPhonie/iPadzie (iOS).
- Animacje na żywo: płynność i tempo kołysania, spadania, przenikania; w `pary` podskok odkrytej pary
  (800 ms) — czy nie za długi; ustawienie systemu „ogranicz ruch” (animacje mają przejść w przenikanie).
- Komputer: przytrzymanie `Esc` wychodzi z gry (także z ekranu końca rundy, snu i błędu).
- Z dzieckiem: czy w `patyczki` rozumie w ciszy przekreślone patyczki przy odejmowaniu.
- Wdrożenie: `npm run build` → zawartość `dist/` na hostido; przy pierwszej wizycie sprawdzić, czy serwer
  czyta `.htaccess` (strona 404, kroje się wczytują, wejście wprost na `/<id>/`).
- Wdrożenie, nagłówek CSP (blokada sieci w `.htaccess`): po wgraniu otworzyć hub, 2–3 gry i panel rodzica
  — mają wyglądać jak lokalnie (obrazki, litery, kroje). Gdyby strona była pusta albo bez obrazków: usunąć
  z `.htaccess` na serwerze jedną linię zaczynającą się od `Header set Content-Security-Policy` i dać znać.
  Sprawdzone tylko w Chromium na lokalnym serwerze testowym — warto zajrzeć także z iPhone'a/iPada (Safari).
- Limit sesji: gdy limit minie w trakcie rundy, po ostatnim zadaniu ma być zwykłe „Brawo!” z dźwiękiem,
  a „Jeżyk idzie spać” dopiero po „Jeszcze raz” / „Dalej”.
