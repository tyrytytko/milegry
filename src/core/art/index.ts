/**
 * Wspólne sprite'y SVG: proste, płaskie, zaokrąglone, w palecie z tokens.css (--mg-art-*).
 *
 * Każda funkcja zwraca znacznik <svg> jako string (viewBox 0 0 100 100):
 *   el.innerHTML = art.chick();
 *   el.innerHTML = art.fish({ size: 64 });
 *
 * Kolory są w atrybucie style (fill: var(--mg-art-…)), więc zmiana palety w tokens.css
 * zmienia wszystkie grafiki naraz. Nie wpisuj tu hexów.
 */

export interface ArtOptions {
  /** Rozmiar w px (liczba) lub dowolna długość CSS. Domyślnie 100% (dopasuj CSS-em kontenera). */
  size?: number | string;
  /** Dodatkowa klasa na <svg>. */
  className?: string;
  /** Opis dla czytników ekranu. Bez niego grafika jest dekoracyjna (aria-hidden). */
  title?: string;
}

const fill = (token: string, extra = '') => `style="fill:var(--mg-art-${token})${extra ? ';' + extra : ''}"`;

/** Wypełnienie z obrysem — dla jasnych kształtów, które giną na jasnym tle (Z-14). */
const rimmed = (token: string, rimToken: string, width = 3.5) =>
  `style="fill:var(--mg-art-${token});stroke:var(--mg-art-${rimToken});stroke-width:${width};stroke-linejoin:round"`;

/**
 * Obrys samej sylwetki kilku kształtów: te same kształty w kolorze obrysu, pogrubione.
 * Wstaw PRZED kształtami — widać tylko zewnętrzną krawędź, bez kresek między częściami.
 */
const outline = (rimToken: string, ...shapes: string[]) =>
  `<g style="fill:var(--mg-art-${rimToken});stroke:var(--mg-art-${rimToken});stroke-width:7;stroke-linejoin:round">` +
  shapes.map((shape) => shape.replace(/ style="[^"]*"/g, '')).join('') +
  `</g>`;

function wrap(body: string, options: ArtOptions = {}, kind = ''): string {
  const size = options.size === undefined ? '100%' : typeof options.size === 'number' ? `${options.size}px` : options.size;
  const cls = ['mg-art', kind && `mg-art-${kind}`, options.className].filter(Boolean).join(' ');
  const a11y = options.title
    ? `role="img" aria-label="${options.title.replace(/"/g, '&quot;')}"`
    : 'aria-hidden="true" focusable="false"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" class="${cls}" ${a11y}>${body}</svg>`;
}

/** Punkty „ząbkowanego” okręgu (kolce jeża, łupina kasztana). Kąty w stopniach, 0 = w prawo, rosnąco zgodnie z ruchem wskazówek. */
function spikyPath(cx: number, cy: number, inner: number, outer: number, count: number, fromDeg = 0, toDeg = 360): string {
  const points: string[] = [];
  const step = (toDeg - fromDeg) / (count * 2);
  for (let i = 0; i <= count * 2; i++) {
    const angle = ((fromDeg + i * step) * Math.PI) / 180;
    const r = i % 2 === 0 ? inner : outer;
    points.push(`${(cx + r * Math.cos(angle)).toFixed(1)},${(cy + r * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(' ');
}

/** Oko z małym błyskiem. */
const eye = (x: number, y: number, r = 3.2) =>
  `<circle cx="${x}" cy="${y}" r="${r}" ${fill('eye')}/><circle cx="${x + r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.35}" ${fill('highlight')}/>`;

const cheek = (x: number, y: number, r = 4) => `<circle cx="${x}" cy="${y}" r="${r}" ${fill('cheek', 'opacity:0.7')}/>`;

const EGG_PATH = 'M50 8 C72 8 86 46 86 64 C86 83 70 94 50 94 C30 94 14 83 14 64 C14 46 28 8 50 8 Z';

// ---------------------------------------------------------------------------

export interface HedgehogOptions extends ArtOptions {
  /** Śpiący jeżyk (zamknięte oczka) — koniec sesji, pauza. */
  sleeping?: boolean;
}

/** Jeżyk (patrzy w prawo). */
export function hedgehog(options: HedgehogOptions = {}): string {
  const eyes = options.sleeping
    ? `<path d="M68 60 C70 63 74 63 76 60" style="fill:none;stroke:var(--mg-art-eye);stroke-width:2.6;stroke-linecap:round"/>`
    : eye(72, 60);
  const face = `<path d="M58 52 C70 44 84 52 92 64 C94 68 90 72 84 74 C74 80 60 80 54 72 C50 64 52 56 58 52 Z" ${fill('hedgehog-face')}/>`;
  const feet =
    `<ellipse cx="36" cy="86" rx="7" ry="4" ${fill('hedgehog-face')}/>` +
    `<ellipse cx="62" cy="86" rx="7" ry="4" ${fill('hedgehog-face')}/>`;
  // Jasny pyszczek i łapki: obrys w kolorze futerka (na futerku niewidoczny, na tle — tak).
  return wrap(
    `<ellipse cx="50" cy="90" rx="34" ry="4" ${fill('shadow')}/>` +
      outline('hedgehog', face, feet) +
      `<polygon points="${spikyPath(44, 64, 30, 40, 9, 160, 345)}" ${fill('hedgehog')}/>` +
      `<ellipse cx="46" cy="66" rx="32" ry="22" ${fill('hedgehog')}/>` +
      face +
      `<circle cx="92" cy="65" r="4.5" ${fill('eye')}/>` +
      eyes +
      cheek(74, 69) +
      feet,
    options,
    'hedgehog',
  );
}

/** Wiewiórka (siedzi, patrzy w prawo). */
export function squirrel(options?: ArtOptions): string {
  return wrap(
    `<ellipse cx="52" cy="92" rx="30" ry="4" ${fill('shadow')}/>` +
      `<path d="M40 88 C14 86 6 58 14 38 C20 22 38 12 50 20 C60 28 50 40 40 42 C30 46 30 66 44 76 Z" ${fill('squirrel')}/>` +
      `<path d="M22 40 C26 30 36 24 44 26" style="fill:none;stroke:var(--mg-art-squirrel-light);stroke-width:4;stroke-linecap:round;opacity:0.6"/>` +
      `<ellipse cx="60" cy="70" rx="18" ry="21" ${fill('squirrel')}/>` +
      `<ellipse cx="64" cy="73" rx="10" ry="14" ${fill('squirrel-light')}/>` +
      `<path d="M58 30 L60 16 L68 27 Z" ${fill('squirrel')}/>` +
      `<circle cx="66" cy="42" r="15" ${fill('squirrel')}/>` +
      `<ellipse cx="74" cy="47" rx="9" ry="7" ${fill('squirrel-light')}/>` +
      `<circle cx="81" cy="45" r="2.6" ${fill('eye')}/>` +
      eye(69, 39, 3) +
      cheek(71, 48, 3.5) +
      `<ellipse cx="54" cy="89" rx="7" ry="4" ${fill('squirrel')}/>` +
      `<ellipse cx="70" cy="89" rx="7" ry="4" ${fill('squirrel')}/>`,
    options,
    'squirrel',
  );
}

export interface ChickOptions extends ArtOptions {
  /** Kurczaczek siedzi w dolnej połówce skorupki. */
  shell?: boolean;
}

/** Kurczaczek (okrągły, z czubkiem). */
export function chick(options: ChickOptions = {}): string {
  // W skorupce nóżek nie widać: skorupka idzie na wierzch, nóżki pod spód.
  const shell = options.shell
    ? `<path d="M16 64 L24 58 L32 66 L40 58 L50 66 L60 58 L68 66 L76 58 L84 64 C86 83 70 94 50 94 C30 94 14 83 16 64 Z" ${rimmed('egg', 'egg-rim')}/>` +
      `<path d="M22 80 C30 88 44 92 56 91" style="fill:none;stroke:var(--mg-art-egg-shade);stroke-width:3;stroke-linecap:round"/>`
    : '';
  const legs = options.shell
    ? ''
    : `<path d="M40 88 L38 94 M40 88 L44 94" style="stroke:var(--mg-art-beak);stroke-width:3;stroke-linecap:round"/>` +
      `<path d="M60 88 L58 94 M60 88 L64 94" style="stroke:var(--mg-art-beak);stroke-width:3;stroke-linecap:round"/>`;
  const tuft =
    `<ellipse cx="46" cy="22" rx="4" ry="8" transform="rotate(-20 46 22)" ${fill('chick-shade')}/>` +
    `<ellipse cx="54" cy="21" rx="4" ry="9" transform="rotate(15 54 21)" ${fill('chick-shade')}/>`;
  const body = `<circle cx="50" cy="58" r="32" ${fill('chick')}/>`;
  return wrap(
    `<ellipse cx="50" cy="94" rx="28" ry="4" ${fill('shadow')}/>` +
      legs +
      outline('chick-rim', tuft, body) +
      tuft +
      body +
      `<path d="M22 64 C28 74 38 76 44 70 C38 66 30 64 22 64 Z" ${fill('chick-shade')}/>` +
      eye(40, 48) +
      eye(60, 48) +
      `<path d="M45 56 L55 56 L50 63 Z" ${fill('beak')} stroke-linejoin="round"/>` +
      cheek(34, 58) +
      cheek(66, 58) +
      shell,
    options,
    'chick',
  );
}

export interface EggOptions extends ArtOptions {
  /** Pęknięcie na skorupce (zapowiedź wyklucia). */
  cracked?: boolean;
}

/** Jajko w kropki. */
export function egg(options: EggOptions = {}): string {
  const crack = options.cracked
    ? `<path d="M22 52 L32 46 L40 54 L50 46 L60 54 L68 46 L78 52" style="fill:none;stroke:var(--mg-art-egg-crack);stroke-width:3;stroke-linejoin:round;stroke-linecap:round"/>`
    : '';
  return wrap(
    `<ellipse cx="50" cy="95" rx="26" ry="4" ${fill('shadow')}/>` +
      `<path d="${EGG_PATH}" ${rimmed('egg', 'egg-rim')}/>` +
      `<path d="M70 30 C80 46 84 62 80 76 C74 88 62 92 52 92 C70 84 78 64 70 30 Z" ${fill('egg-shade')}/>` +
      `<circle cx="38" cy="36" r="4" ${fill('egg-spot')}/>` +
      `<circle cx="60" cy="28" r="3" ${fill('egg-spot')}/>` +
      `<circle cx="30" cy="66" r="3.5" ${fill('egg-spot')}/>` +
      `<circle cx="64" cy="74" r="4" ${fill('egg-spot')}/>` +
      `<ellipse cx="36" cy="24" rx="5" ry="9" transform="rotate(25 36 24)" ${fill('highlight', 'opacity:0.6')}/>` +
      crack,
    options,
    'egg',
  );
}

/** Rybka (płynie w prawo). */
export function fish(options?: ArtOptions): string {
  const tail = `<path d="M8 32 C18 38 24 44 28 50 C24 56 18 62 8 68 C6 58 6 42 8 32 Z" ${fill('fish-fin')}/>`;
  const body = `<ellipse cx="54" cy="50" rx="34" ry="24" ${fill('fish')}/>`;
  const topFin = `<path d="M44 28 C50 18 62 18 66 28 Z" ${fill('fish-fin')}/>`;
  return wrap(
    outline('fish-rim', tail, body, topFin) +
      tail +
      body +
      topFin +
      `<path d="M46 52 C52 60 60 60 62 54 C56 54 50 52 46 52 Z" ${fill('fish-fin')}/>` +
      `<path d="M38 34 C34 42 34 58 38 66" style="fill:none;stroke:var(--mg-art-fish-fin);stroke-width:3;stroke-linecap:round;opacity:0.7"/>` +
      eye(72, 44, 3.6) +
      cheek(74, 55, 3.5) +
      `<path d="M82 54 C84 56 86 56 87 54" style="fill:none;stroke:var(--mg-art-eye);stroke-width:2;stroke-linecap:round"/>`,
    options,
    'fish',
  );
}

/** Bąbelek powietrza (przezroczysty z odblaskiem). */
export function bubble(options?: ArtOptions): string {
  return wrap(
    `<circle cx="50" cy="50" r="42" style="fill:var(--mg-art-bubble);opacity:0.75;stroke:var(--mg-art-bubble-rim);stroke-width:3"/>` +
      `<path d="M26 40 C28 30 36 22 46 20" style="fill:none;stroke:var(--mg-art-highlight);stroke-width:5;stroke-linecap:round;opacity:0.9"/>` +
      `<circle cx="70" cy="70" r="4" ${fill('highlight', 'opacity:0.7')}/>`,
    options,
    'bubble',
  );
}

export interface ChestnutOptions extends ArtOptions {
  /** Buzia (oczka i uśmiech). Domyślnie true. */
  face?: boolean;
}

/** Kasztan (lśniący, z jaśniejszą „czapeczką”). */
export function chestnut(options: ChestnutOptions = {}): string {
  const face =
    options.face === false
      ? ''
      : eye(40, 58, 3.4) +
        eye(60, 58, 3.4) +
        cheek(33, 67, 3.5) +
        cheek(67, 67, 3.5) +
        `<path d="M45 68 C48 72 52 72 55 68" style="fill:none;stroke:var(--mg-art-eye);stroke-width:2.4;stroke-linecap:round"/>`;
  return wrap(
    `<ellipse cx="50" cy="94" rx="28" ry="4" ${fill('shadow')}/>` +
      `<path d="M50 14 C74 14 88 36 88 58 C88 78 72 92 50 92 C28 92 12 78 12 58 C12 36 26 14 50 14 Z" ${fill('chestnut')}/>` +
      `<path d="M22 34 C30 22 40 18 50 18 C60 18 70 22 78 34 C68 40 32 40 22 34 Z" ${fill('chestnut-light')}/>` +
      `<ellipse cx="72" cy="56" rx="5" ry="10" transform="rotate(-20 72 56)" ${fill('highlight', 'opacity:0.35')}/>` +
      face,
    options,
    'chestnut',
  );
}

export interface AcornOptions extends ArtOptions {
  /** Buzia (oczka i uśmiech). Domyślnie false. */
  face?: boolean;
}

/** Żołądź (owoc z ciemną czapeczką i szypułką). */
export function acorn(options: AcornOptions = {}): string {
  const face = options.face
    ? eye(42, 66, 3.2) +
      eye(58, 66, 3.2) +
      cheek(35, 74, 3.2) +
      cheek(65, 74, 3.2) +
      `<path d="M46 75 C48 78 52 78 54 75" style="fill:none;stroke:var(--mg-art-eye);stroke-width:2.2;stroke-linecap:round"/>`
    : '';
  return wrap(
    `<ellipse cx="50" cy="96" rx="20" ry="3.5" ${fill('shadow')}/>` +
      `<path d="M50 20 L52 8" style="fill:none;stroke:var(--mg-art-trunk);stroke-width:5;stroke-linecap:round"/>` +
      `<path d="M24 42 C22 66 34 84 50 94 C66 84 78 66 76 42 Z" ${fill('squirrel')}/>` +
      `<ellipse cx="38" cy="66" rx="4" ry="11" transform="rotate(14 38 66)" ${fill('highlight', 'opacity:0.35')}/>` +
      `<path d="M16 44 C16 28 30 18 50 18 C70 18 84 28 84 44 C72 51 28 51 16 44 Z" ${fill('trunk')}/>` +
      `<path d="M28 32 C34 26 40 24 46 24" style="fill:none;stroke:var(--mg-art-chestnut-light);stroke-width:3.5;stroke-linecap:round;opacity:0.5"/>` +
      face,
    options,
    'acorn',
  );
}

export interface BurrOptions extends ArtOptions {
  /** Łupina pęknięta — widać kasztan w środku. */
  open?: boolean;
}

/** Kolczasta łupina kasztana. */
export function chestnutBurr(options: BurrOptions = {}): string {
  const inside = options.open
    ? `<path d="M50 30 C66 30 74 42 74 54 C74 68 64 76 50 76 C36 76 26 68 26 54 C26 42 34 30 50 30 Z" ${fill('chestnut')}/>` +
      `<path d="M34 42 C40 34 60 34 66 42 C58 46 42 46 34 42 Z" ${fill('chestnut-light')}/>`
    : `<path d="M34 40 C40 46 46 48 50 48" style="fill:none;stroke:var(--mg-art-burr-spike);stroke-width:3;stroke-linecap:round"/>`;
  return wrap(
    `<polygon points="${spikyPath(50, 54, 34, 44, 18)}" ${fill('burr-spike')} stroke-linejoin="round"/>` +
      `<circle cx="50" cy="54" r="34" ${fill('burr')}/>` +
      `<ellipse cx="38" cy="40" rx="6" ry="10" transform="rotate(35 38 40)" ${fill('highlight', 'opacity:0.3')}/>` +
      inside,
    options,
    'burr',
  );
}

export type LeafTone = 'sage' | 'ochre' | 'rose' | 'brown';

export interface LeafOptions extends ArtOptions {
  tone?: LeafTone;
  /** Obrót w stopniach. */
  rotate?: number;
}

/** Liść z żyłką. */
export function leaf(options: LeafOptions = {}): string {
  const tone = options.tone ?? 'sage';
  const rotate = options.rotate ?? 0;
  return wrap(
    `<g transform="rotate(${rotate} 50 50)">` +
      `<path d="M50 8 C76 22 84 50 72 72 C64 86 54 90 50 92 C46 90 36 86 28 72 C16 50 24 22 50 8 Z" ${rimmed(`leaf-${tone}`, `leaf-${tone}-rim`)}/>` +
      `<path d="M50 20 L50 94 M50 44 L64 34 M50 58 L36 48 M50 70 L62 62" style="fill:none;stroke:var(--mg-art-leaf-vein);stroke-width:3;stroke-linecap:round;opacity:0.6"/>` +
      `</g>`,
    options,
    'leaf',
  );
}

/** Drzewo z okrągłą koroną. */
export function tree(options?: ArtOptions): string {
  const crown =
    `<circle cx="32" cy="46" r="20" ${fill('crown')}/>` +
    `<circle cx="68" cy="46" r="20" ${fill('crown')}/>` +
    `<circle cx="50" cy="32" r="24" ${fill('crown-light')}/>` +
    `<circle cx="50" cy="52" r="18" ${fill('crown')}/>`;
  return wrap(
    `<ellipse cx="50" cy="95" rx="30" ry="4" ${fill('shadow')}/>` +
      `<path d="M44 94 L46 60 L54 60 L56 94 Z" ${fill('trunk')}/>` +
      `<path d="M50 70 L38 58 M52 66 L62 56" style="stroke:var(--mg-art-trunk);stroke-width:4;stroke-linecap:round"/>` +
      outline('crown-rim', crown) +
      crown,
    options,
    'tree',
  );
}

/** Wszystkie sprite'y w jednym obiekcie: `import { art } from '../../core/art'`. */
export const art = {
  hedgehog,
  squirrel,
  chick,
  egg,
  fish,
  bubble,
  chestnut,
  acorn,
  chestnutBurr,
  leaf,
  tree,
};
