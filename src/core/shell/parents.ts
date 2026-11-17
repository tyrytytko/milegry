import type { Settings } from '../types';
import { SESSION_KEY } from '../storage/sessionTime';
import { DEFAULT_SETTINGS, SESSION_LIMITS, SETTINGS_KEY, sanitizeChildName } from '../storage/settings';
import { letterElement, loadLetterFonts } from '../ui';
import { icons } from '../ui/icons';
import { h } from '../util/dom';
import { resolveLetterForm } from '../util/letters';
import type { App } from './app';
import { renderGate } from './gate';
import { appLink } from './hub';
import { sessionTimeText } from './playTime';

interface Choice<T> {
  value: T;
  label: string;
}

/** Grupa przycisków „jeden z wielu” (aria-pressed). */
function choiceGroup<T>(label: string, choices: Choice<T>[], current: T, onPick: (value: T) => void): HTMLElement {
  const buttons = choices.map((choice) => {
    const b = h(
      'button',
      { type: 'button', class: 'mg-btn', 'aria-pressed': choice.value === current ? 'true' : 'false' },
      choice.label,
    );
    b.addEventListener('click', () => {
      buttons.forEach((other) => other.setAttribute('aria-pressed', other === b ? 'true' : 'false'));
      onPick(choice.value);
    });
    return b;
  });
  return h('div', { class: 'mg-choices', role: 'group', 'aria-label': label }, buttons);
}

function section(title: string, ...children: (HTMLElement | string | null)[]): HTMLElement {
  return h('section', { class: 'mg-parents__section' }, [h('h2', { class: 'mg-parents__heading' }, title), ...children]);
}

const hint = (text: string) => h('p', { class: 'mg-parents__hint' }, text);
const label = (text: string) => h('h3', { class: 'mg-parents__label' }, text);

// Bez „Wyłączone”: do ciszy prowadzi jedna droga — „Wycisz wszystko” (Z-11).
const VOLUMES: Choice<number>[] = [
  { value: 0.4, label: 'Cicho' },
  { value: DEFAULT_SETTINGS.effectsVolume, label: 'Średnio' },
  { value: 1, label: 'Głośno' },
];

/** Najbliższa wartość z listy (dla zapisanych głośności spoza przycisków). */
const nearest = (value: number) => VOLUMES.reduce((a, b) => (Math.abs(b.value - value) < Math.abs(a.value - value) ? b : a)).value;

function renderPanel(container: HTMLElement, app: App): void {
  const s = app.settings;
  const set = (patch: Partial<Settings>) => app.updateSettings(patch);

  // --- Dźwięk ---
  const sound = section(
    'Dźwięk',
    hint('Gry grają tylko krótkie, ciche efekty dźwiękowe. Muzyki nie ma.'),
    label('Efekty'),
    choiceGroup('Głośność efektów', VOLUMES, nearest(s.effectsVolume), (v) => {
      set({ effectsVolume: v });
      app.audio.unlock();
      app.audio.play('good');
    }),
    label('Wszystko'),
    choiceGroup(
      'Wyciszenie',
      [
        { value: false, label: 'Dźwięk włączony' },
        { value: true, label: 'Wycisz wszystko' },
      ],
      s.muted,
      (v) => set({ muted: v }),
    ),
  );

  // --- Tempo ---
  const tempo = section(
    'Tempo',
    hint('Jak szybko dzieje się wszystko w grach. Bez liczenia czasu i bez kar.'),
    choiceGroup<Settings['tempo']>(
      'Tempo',
      [
        { value: 'calm', label: 'Spokojne' },
        { value: 'medium', label: 'Średnie' },
        { value: 'lively', label: 'Żwawe' },
      ],
      s.tempo,
      (v) => set({ tempo: v }),
    ),
  );

  // --- Sterowanie ---
  const detected = app.detectedMode() === 'touch' ? 'dotyk' : 'klawiatura';
  const control = section(
    'Sterowanie',
    hint('Klawiatura na laptopie albo dotyk na telefonie i tablecie. Polskie litery (ą, ł, ż…) wpisuje się z klawiszem AltGr.'),
    choiceGroup<Settings['inputMode']>(
      'Sterowanie',
      [
        { value: 'auto', label: `Automatycznie (${detected})` },
        { value: 'keyboard', label: 'Klawiatura' },
        { value: 'touch', label: 'Dotyk' },
      ],
      s.inputMode,
      (v) => set({ inputMode: v }),
    ),
  );

  // --- Litery (krój i wielkość) z podglądem na żywo ---
  const preview = h('div', { class: 'mg-parents__letters', 'aria-live': 'polite' });
  let previewRun = 0;
  const updatePreview = () => {
    const run = ++previewRun;
    const draw = (cursiveOk: boolean) => {
      const sample = app.settings.childName.charAt(0) || 'A';
      const settings = app.settings;
      const main = resolveLetterForm(settings, 'main');
      const companion = resolveLetterForm(settings, 'companion');
      preview.replaceChildren(
        ...[main, companion]
          .filter((f): f is NonNullable<typeof f> => f !== null)
          .map((f) =>
            h('span', { class: 'mg-parents__letter' }, [letterElement(sample, cursiveOk ? f.script : 'print', f.case)]),
          ),
      );
    };
    if (app.settings.letterScript === 'print') return draw(true);
    // Bez wczytanego kroju pisanego pokazujemy drukowany — inny krój dałby zły kształt litery.
    void loadLetterFonts(true).then((ok) => {
      if (run === previewRun) draw(ok);
    });
  };
  const letters = section(
    'Litery',
    label('Litery pisane'),
    choiceGroup<Settings['letterScript']>(
      'Litery pisane',
      [
        { value: 'print', label: 'Tylko drukowane' },
        { value: 'both', label: 'Drukowane, a pisane do towarzystwa' },
        { value: 'cursive', label: 'Pisane' },
      ],
      s.letterScript,
      (v) => {
        set({ letterScript: v });
        updatePreview();
      },
    ),
    label('Wielkość liter'),
    choiceGroup<Settings['letterCase']>(
      'Wielkość liter',
      [
        { value: 'upper', label: 'WIELKIE' },
        { value: 'lower', label: 'małe' },
      ],
      s.letterCase,
      (v) => {
        set({ letterCase: v });
        updatePreview();
      },
    ),
    preview,
    hint('Litery pisane pokazujemy, żeby były znajome z widzenia. Pisania uczy ręka — kredka i kartka.'),
  );
  updatePreview();

  // --- Imię dziecka ---
  const nameInput = h('input', {
    type: 'text',
    class: 'mg-parents__input',
    maxlength: 20,
    autocomplete: 'off',
    value: s.childName,
    'aria-label': 'Imię dziecka',
    placeholder: 'np. Ola',
  });
  nameInput.addEventListener('input', () => {
    set({ childName: sanitizeChildName(nameInput.value) });
    updatePreview();
  });
  nameInput.addEventListener('blur', () => {
    nameInput.value = app.settings.childName;
  });
  const name = section(
    'Imię dziecka',
    hint(
      'Opcjonalne. Zostaje tylko w tej przeglądarce i nigdzie nie jest wysyłane. Przyda się w grach z literami imienia. ' +
        'Litery, spacja i myślnik, do 20 znaków.',
    ),
    nameInput,
  );

  // --- Limit sesji ---
  const restartSession = h('button', { type: 'button', class: 'mg-btn' }, 'Licz od nowa');
  const sessionNote = h('p', { class: 'mg-parents__hint', role: 'status' });
  // Wartość z chwili otwarcia panelu (bez tykania na żywo).
  const sessionTime = h('p', { class: 'mg-parents__hint' }, sessionTimeText(app.sessionPlayedMs()));
  restartSession.addEventListener('click', () => {
    app.resetSession();
    sessionTime.textContent = sessionTimeText(app.sessionPlayedMs());
    sessionNote.textContent = 'Sesja liczy się od nowa.';
  });
  const limit = section(
    'Limit sesji',
    hint('Po tym czasie, zawsze dopiero po skończonej rundzie, jeżyk spokojnie idzie spać. Po pół godzinie przerwy czas liczy się od nowa.'),
    choiceGroup<Settings['sessionLimit']>(
      'Limit sesji',
      SESSION_LIMITS.map((m) => ({ value: m, label: m === 0 ? 'Wyłączony' : `${m} min` })),
      s.sessionLimit,
      (v) => set({ sessionLimit: v }),
    ),
    sessionTime,
    restartSession,
    sessionNote,
  );

  // --- Postęp (zerowanie z potwierdzeniem) ---
  const resetArea = h('div', { class: 'mg-parents__reset' });
  const showResetButton = (focus: boolean) => {
    const btn = h('button', { type: 'button', class: 'mg-btn' }, 'Wyzeruj postęp');
    btn.addEventListener('click', () => {
      const yes = h('button', { type: 'button', class: 'mg-btn mg-btn--warn' }, 'Tak, wyzeruj');
      const no = h('button', { type: 'button', class: 'mg-btn' }, 'Anuluj');
      yes.addEventListener('click', () => {
        // Licznik dzisiejszego czasu gry zostaje (reset postępu nie obchodzi limitu sesji), zgodny z pamięcią.
        app.store.clearAll([SETTINGS_KEY, SESSION_KEY]);
        resetArea.replaceChildren(h('p', { class: 'mg-parents__done', role: 'status' }, 'Postęp wyzerowany.'));
      });
      no.addEventListener('click', () => showResetButton(true));
      resetArea.replaceChildren(
        h('p', {}, 'Na pewno? Znikną ukończone poziomy i wybory we wszystkich grach. Ustawienia zostaną.'),
        h('div', { class: 'mg-choices' }, [yes, no]),
      );
      no.focus();
    });
    resetArea.replaceChildren(btn);
    if (focus) btn.focus();
  };
  showResetButton(false);

  const backLink = () => {
    const link = appLink(app, { name: 'hub' }, 'mg-btn');
    link.innerHTML = icons.home;
    link.append(h('span', {}, 'Wróć do gier'));
    return link;
  };
  const back = backLink();

  // Po bramce fokus na tytule panelu: Tab zaczyna od „Wróć do gier”, Enter nic nie uruchamia.
  const title = h('h1', { tabindex: -1 }, 'Dla rodziców');
  container.append(
    h('div', { class: 'mg-parents' }, [
      h('header', { class: 'mg-parents__header' }, [title, back]),
      h('main', { class: 'mg-parents__main' }, [
        app.store.persistent
          ? null
          : hint('Ta przeglądarka nie pozwala zapisywać danych. Ustawienia i postęp znikną po zamknięciu karty.'),
        sound,
        tempo,
        control,
        letters,
        name,
        limit,
        section('Postęp', resetArea),
        section(
          'Czas przed ekranem',
          hint(
            'WHO zaleca, by dzieci w wieku 2–\u20604\u00a0lat spędzały przed ekranem na siedząco najwyżej godzinę dziennie — im mniej, tym lepiej. Grajcie wspólnie i rozmawiajcie o tym, co widać na ekranie.',
          ),
        ),
        section(
          'O Miłych Grach',
          hint(
            'Spokojne gry dla dzieci w wieku 3–\u20605\u00a0lat. Bez reklam, zakupów, liczników czasu i przegranej. ' +
              'Ustawienia i postęp zapisują się tylko w tej przeglądarce; nic nie jest wysyłane do internetu.',
          ),
          hint('Kroje pisma: Andika (SIL International) i Playwrite PL (TypeTogether), licencja SIL Open Font License 1.1 — teksty licencji w katalogu „licencje” na serwerze.'),
        ),
      ]),
      // Drugi „Wróć do gier” na dole: na telefonie panel ma kilka ekranów.
      h('footer', { class: 'mg-parents__footer' }, [backLink()]),
    ]),
  );
  title.focus();
}

export function renderParents(container: HTMLElement, app: App): () => void {
  app.setTitle('Dla rodziców');
  const removeSink = app.inputHub.push({ onIntent: () => {}, exitMode: 'press', onExit: () => app.navigate({ name: 'hub' }) });
  // Bramka przy każdym wejściu: odblokowanie trwa tylko do wyjścia z panelu.
  renderGate(container, app, () => {
    container.replaceChildren();
    renderPanel(container, app);
    window.scrollTo(0, 0);
  });
  return () => removeSink();
}
