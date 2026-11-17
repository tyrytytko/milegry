/**
 * „Pary pod liśćmi” — grafika kart: co leży pod liściem (obrazek, litera, cyfra, żołędzie) i sam liść.
 * Litery tylko przez ctx.ui.letter z wymuszoną wielkością (Z-35); krój wybiera rodzic.
 */
import { art } from '../../core/art';
import type { LeafTone } from '../../core/art';
import type { GameContext } from '../../core/types';
import { h } from '../../core/util/dom';
import type { Face, Picture } from './logic';

const PICTURE: Record<Picture, { svg: () => string; name: string }> = {
  squirrel: { svg: () => art.squirrel(), name: 'wiewiórka' },
  chick: { svg: () => art.chick(), name: 'kurczaczek' },
  fish: { svg: () => art.fish(), name: 'rybka' },
  egg: { svg: () => art.egg(), name: 'jajko' },
  chestnut: { svg: () => art.chestnut(), name: 'kasztan' },
  acorn: { svg: () => art.acorn(), name: 'żołądź' },
  burr: { svg: () => art.chestnutBurr(), name: 'łupina kasztana' },
  tree: { svg: () => art.tree(), name: 'drzewo' },
};

const svgBox = (cls: string, svg: string) => {
  const el = h('span', { class: cls, 'aria-hidden': 'true' });
  el.innerHTML = svg; // SVG z core/art, nie dane z zewnątrz
  return el;
};

/** Nazwa odkrytej karty dla czytnika ekranu. */
export function faceName(face: Face): string {
  if (face.type === 'picture') return PICTURE[face.id].name;
  if (face.type === 'letter') return face.case === 'upper' ? `wielka ${face.char}` : `mała ${face.char.toLowerCase()}`;
  return face.type === 'digit' ? `cyfra ${face.n}` : `${face.n} żołędzi`;
}

/** Treść karty pod liściem. */
export function faceEl(ctx: GameContext, face: Face): HTMLElement {
  const box = h('span', { class: `g-pary-face g-pary-face--${face.type}`, 'aria-hidden': 'true' });
  if (face.type === 'picture') box.append(svgBox('g-pary-art', PICTURE[face.id].svg()));
  else if (face.type === 'letter') box.append(ctx.ui.letter(face.char, { case: face.case }) as HTMLElement); // rola 'main' → nigdy null
  else if (face.type === 'digit') box.append(String(face.n));
  else {
    box.dataset.n = String(face.n);
    for (let k = 0; k < face.n; k++) box.append(svgBox('g-pary-nut', art.acorn()));
  }
  return box;
}

const TONES: LeafTone[] = ['sage', 'ochre', 'brown', 'rose'];

/** Liść-przykrywka. Odcień i obrót zależą od miejsca na planszy — różne liście pomagają zapamiętać miejsca. */
export const coverSvg = (index: number) => art.leaf({ tone: TONES[index % TONES.length], rotate: ((index * 37) % 50) - 25 });

/** Ikona kafelka w hubie. */
export const tileIcon = () => art.leaf({ tone: 'ochre', rotate: -20 });
