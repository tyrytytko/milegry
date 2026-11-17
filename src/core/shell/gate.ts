import { icons } from '../ui/icons';
import { h } from '../util/dom';
import type { App } from './app';
import { appLink } from './hub';

/** Bramka panelu rodzica (Z-29): działanie do policzenia, po błędzie nowe. */
export function renderGate(container: HTMLElement, app: App, onPass: () => void): void {
  let a = 0;
  let b = 0;
  const question = h('p', { class: 'mg-gate__question' });
  const input = h('input', {
    type: 'text',
    inputmode: 'numeric',
    autocomplete: 'off',
    maxlength: 3,
    class: 'mg-gate__input',
    'aria-label': 'Wynik',
  });
  const feedback = h('p', { class: 'mg-parents__hint', role: 'status' });
  const newTask = () => {
    a = 6 + Math.floor(Math.random() * 4);
    b = 6 + Math.floor(Math.random() * 4);
    question.textContent = `Ile to ${a} × ${b}?`;
    input.value = '';
  };
  const ok = h('button', { type: 'submit', class: 'mg-btn mg-btn--primary' }, 'Wejdź');
  const form = h('form', { class: 'mg-gate__form' }, [input, ok]);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (Number(input.value.trim()) === a * b) {
      onPass();
    } else {
      feedback.textContent = 'To nie ten wynik. Spróbuj z nowym działaniem.';
      newTask();
      input.focus();
    }
  });
  newTask();

  const back = appLink(app, { name: 'hub' }, 'mg-btn');
  back.innerHTML = icons.home;
  back.append(h('span', {}, 'Wróć do gier'));

  container.append(
    h('div', { class: 'mg-parents' }, [
      h('header', { class: 'mg-parents__header' }, [h('h1', {}, 'Dla rodziców'), back]),
      h('section', { class: 'mg-parents__section' }, [
        h('p', { class: 'mg-parents__hint' }, 'Ta część jest dla dorosłych. Rozwiąż działanie, żeby wejść.'),
        question,
        form,
        feedback,
      ]),
    ]),
  );
  input.focus();
}
