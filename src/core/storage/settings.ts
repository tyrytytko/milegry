import type { SessionLimit, Settings } from '../types';
import type { Store } from './storage';

export const SETTINGS_KEY = 'settings';

export const SESSION_LIMITS: readonly SessionLimit[] = [0, 10, 15, 20, 30];

export const DEFAULT_SETTINGS: Settings = {
  muted: false,
  effectsVolume: 0.7, // przycisk „Średnio” w panelu rodzica
  tempo: 'calm', // Z-06: domyślnie najwolniejsze
  inputMode: 'auto',
  letterScript: 'print',
  letterCase: 'upper',
  childName: '',
  sessionLimit: 15, // Z-25
};

const oneOf = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const volume = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;

/** Imię: tylko litery (także polskie), spacja i myślnik, maks. 20 znaków. */
export function sanitizeChildName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[^A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż \-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20)
    .trimEnd();
}

/**
 * Odczyt ustawień z walidacją każdego pola (uszkodzone lub brakujące pole → wartość domyślna).
 */
export function loadSettings(store: Store): Settings {
  const raw = store.get<Record<string, unknown> | null>(SETTINGS_KEY, null) ?? {};
  const d = DEFAULT_SETTINGS;
  const savedVolume = volume(raw.effectsVolume, d.effectsVolume);
  // Cisza ma jedną drogę: `muted` (Z-11). Zapisana głośność 0 to wyciszenie i głośność domyślna.
  const silent = savedVolume === 0;
  return {
    muted: silent || (typeof raw.muted === 'boolean' ? raw.muted : d.muted),
    effectsVolume: silent ? d.effectsVolume : savedVolume,
    tempo: oneOf(raw.tempo, ['calm', 'medium', 'lively'] as const, d.tempo),
    inputMode: oneOf(raw.inputMode, ['auto', 'keyboard', 'touch'] as const, d.inputMode),
    letterScript: oneOf(raw.letterScript, ['print', 'both', 'cursive'] as const, d.letterScript),
    letterCase: oneOf(raw.letterCase, ['upper', 'lower'] as const, d.letterCase),
    childName: sanitizeChildName(raw.childName),
    sessionLimit: oneOf(raw.sessionLimit, SESSION_LIMITS, d.sessionLimit),
  };
}

export function saveSettings(store: Store, settings: Settings): void {
  store.set(SETTINGS_KEY, settings);
}
