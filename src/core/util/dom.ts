/**
 * Mały pomocnik do budowania DOM bez frameworka.
 *
 *   const btn = h('button', { class: 'mg-btn', type: 'button' }, 'Dalej');
 *   const box = h('div', { class: 'g-x-box', 'data-target': 'box-1' }, [btn]);
 *
 * Atrybuty: string/number → setAttribute, true → atrybut pusty, false/null/undefined → pominięty.
 * Dzieci: węzły DOM albo tekst (tekst jest bezpieczny — wstawiany jako textContent).
 */
export type Child = Node | string | number | null | undefined | false;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | null | undefined> = {},
  children: Child | Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'object' ? child : String(child));
  }
  return node;
}
