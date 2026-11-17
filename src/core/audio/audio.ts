import type { GameAudio, SoundName } from '../types';

/**
 * Łagodne, syntezowane efekty (Web Audio, bez plików) — Z-08, Z-09.
 * - cicho: głośność główna ≤ 0.12 × głośność efektów i filtr dolnoprzepustowy,
 * - tylko sinus/trójkąt, ton podstawowy ≤ ~1,5 kHz,
 * - każdy ton ma miękką obwiednię (narastanie 20 ms, wygaszanie wykładnicze),
 * - AudioContext powstaje dopiero po pierwszym geście (wymóg przeglądarek),
 * - przy wyciszeniu lub braku Web Audio wszystkie metody są bezpiecznymi no-op.
 */
export interface AudioEngine extends GameAudio {
  /** Wywoływane przy geście użytkownika — tworzy/wznawia AudioContext. */
  unlock(): void;
  /** Ustawienia rodzica: wyciszenie i głośność efektów 0..1. */
  configure(options: { muted: boolean; effectsVolume: number }): void;
}

/** Głośność główna efektów przy suwaku efektów na 100%. */
const EFFECTS_MAX_GAIN = 0.12;
/** Najwyższa dozwolona częstotliwość tonu (Z-08). */
const MAX_TONE_HZ = 1500;
const LOWPASS_HZ = 2400;
/** Narastanie każdego tonu w sekundach (Z-08: ≥ 10 ms). */
const ATTACK_S = 0.02;

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

interface Tone {
  /** czas trwania w sekundach (≥ 0.05, żeby narastanie zmieściło się przed wygaszaniem) */
  duration: number;
  wave?: 'sine' | 'triangle';
  /** głośność tonu względem głośności głównej, 0..1 */
  level: number;
  /** opóźnienie startu w sekundach */
  delay?: number;
  /** płynne przejście częstotliwości do tej wartości */
  glideTo?: number;
}

export function createAudio(initial: { muted: boolean; effectsVolume: number }): AudioEngine {
  let muted = initial.muted;
  let volume = clamp01(initial.effectsVolume);
  let ctx: AudioContext | null = null;
  let output: GainNode | null = null;
  const audible = () => !muted && volume > 0;
  const masterGain = () => (muted ? 0 : EFFECTS_MAX_GAIN * volume);

  function ensureContext(): AudioContext | null {
    if (ctx) return ctx;
    try {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = masterGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = LOWPASS_HZ;
      master.connect(filter);
      filter.connect(ctx.destination);
      output = master;
      return ctx;
    } catch {
      ctx = null;
      return null;
    }
  }

  /** Wznawia kontekst w każdym stanie innym niż 'running' ('suspended', iOS: 'interrupted'). */
  function resume(): void {
    if (ctx && ctx.state !== 'running' && audible()) void ctx.resume().catch(() => {});
  }

  function playTone(freq: number, tone: Tone): void {
    if (!audible() || !ctx || !output || ctx.state !== 'running') return;
    const { wave = 'sine', delay = 0, glideTo } = tone;
    const duration = Math.max(0.05, tone.duration);
    try {
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = wave;
      osc.frequency.setValueAtTime(Math.min(freq, MAX_TONE_HZ), start);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.min(glideTo, MAX_TONE_HZ), start + duration * 0.8);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(Math.max(0.0001, clamp01(tone.level)), start + ATTACK_S);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(output);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    } catch {
      // dźwięk nie jest krytyczny
    }
  }

  const sounds: Record<SoundName, () => void> = {
    tap: () => playTone(587.33, { duration: 0.08, level: 0.45 }),
    step: () => playTone(392, { duration: 0.09, wave: 'triangle', level: 0.5 }),
    pop: () => playTone(523.25, { duration: 0.14, level: 0.6, glideTo: 698.46 }),
    good: () => {
      playTone(523.25, { duration: 0.16, level: 0.6 });
      playTone(659.25, { duration: 0.26, level: 0.6, delay: 0.11 });
    },
    // Neutralny, cichy ton — bez opadającej melodii „porażki” (Z-09).
    'soft-no': () => playTone(440, { duration: 0.12, wave: 'triangle', level: 0.3 }),
    chirp: () => {
      playTone(1046.5, { duration: 0.08, level: 0.25, glideTo: 1318.5 });
      playTone(1174.7, { duration: 0.09, level: 0.25, glideTo: 1396.9, delay: 0.1 });
    },
    // Jeden miękki dźwięk końca rundy: łagodny akord, tony wchodzą kolejno, długie wygaszanie.
    win: () => {
      playTone(523.25, { duration: 1.1, level: 0.45 });
      playTone(659.25, { duration: 1.1, level: 0.35, delay: 0.06 });
      playTone(783.99, { duration: 1.1, level: 0.3, delay: 0.12 });
    },
  };

  return {
    play(name) {
      sounds[name]?.();
    },
    unlock() {
      if (!audible() || !ensureContext() || ctx?.state === 'running') return;
      resume();
      // Na dotyku pointerdown nie jest aktywacją użytkownika — daje ją dopiero puszczenie palca.
      window.addEventListener('pointerup', resume, { once: true, capture: true });
      window.addEventListener('touchend', resume, { once: true, capture: true });
    },
    configure(options) {
      muted = options.muted;
      volume = clamp01(options.effectsVolume);
      if (output) output.gain.value = masterGain();
      resume();
    },
  };
}
