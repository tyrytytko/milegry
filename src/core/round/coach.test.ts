import { describe, expect, it, vi } from 'vitest';
import { createCoach, FINISH_FALLBACK_MS, NEXT_TASK_MS } from './coach';
import { FIRST_IDLE_MS, IDLE_MS, LOCK_MS } from './coachCore';
import { fakeCtx, fakeEl, flush, hintsIn } from './fakeCtx';

describe('createCoach — warstwa DOM', () => {
  it('drabina: poświata na pytaniu, potem podpowiedź z klawiszem przy celu, kołysanie i cichy ton', () => {
    const f = fakeCtx();
    const coach = createCoach(f.ctx);
    const target = fakeEl();
    const question = fakeEl();
    const wrong = fakeEl();
    coach.setTask({ key: 1, target, question, hintKey: 'M' });

    expect(coach.miss(wrong)).toBe('glow');
    expect(f.ui.hint).toHaveBeenLastCalledWith({ target: question, kind: 'glow' });
    expect(f.ui.wobble).toHaveBeenCalledWith(wrong);
    expect(f.play).toHaveBeenCalledWith('soft-no');

    expect(coach.miss(wrong)).toBe('ignored'); // blokada
    expect(f.ui.wobble).toHaveBeenCalledTimes(1);
    f.advance(LOCK_MS);
    expect(coach.miss()).toBe('hint');
    expect(f.ui.hint).toHaveBeenLastCalledWith({ target, key: 'M' });

    f.advance(LOCK_MS);
    expect(coach.miss()).toBe('together');
    expect(f.hides).toHaveLength(2);
    expect(f.hides.every((hide) => hide.mock.calls.length === 1)).toBe(true);
    expect(hintsIn(question)).toEqual([]);
    expect(hintsIn(target)).toEqual([]);
  });

  it('to samo zadanie z innym pytaniem: poświata przechodzi na nowe pytanie', () => {
    const f = fakeCtx();
    const coach = createCoach(f.ctx);
    const target = fakeEl();
    const first = fakeEl();
    const second = fakeEl();
    coach.setTask({ key: 1, target, question: first });
    coach.miss();
    coach.setTask({ key: 1, target, question: second });
    expect(hintsIn(first)).toEqual([]);
    expect(hintsIn(second)).toEqual(['glow']);
    coach.setTask({ key: 1, target, question: second }); // bez zmiany — nic się nie dzieje
    expect(f.ui.hint).toHaveBeenCalledTimes(2);
  });

  it('afterPause: 1 s czasu rzeczywistego przy każdym tempie', () => {
    for (const tempo of ['calm', 'medium', 'lively'] as const) {
      const f = fakeCtx('keyboard', tempo);
      const fn = vi.fn();
      createCoach(f.ctx).afterPause(fn);
      f.advance(NEXT_TASK_MS - 50);
      expect(fn).not.toHaveBeenCalled();
      f.advance(50);
      expect(fn).toHaveBeenCalledTimes(1);
    }
  });

  it('bez question poświata jest na celu', () => {
    const f = fakeCtx();
    const coach = createCoach(f.ctx);
    const target = fakeEl();
    coach.setTask({ key: 1, target });
    coach.miss();
    expect(f.ui.hint).toHaveBeenCalledWith({ target, kind: 'glow' });
  });

  it('bezczynność: podpowiedź po czasie; każda intencja dziecka zeruje licznik', () => {
    const f = fakeCtx();
    const coach = createCoach(f.ctx);
    coach.setTask({ key: 1, target: fakeEl(), hintKey: '3' });
    f.advance(FIRST_IDLE_MS - 100);
    f.emit({ type: 'move', dir: 'left' });
    f.advance(IDLE_MS - 100);
    expect(f.ui.hint).not.toHaveBeenCalled();
    f.advance(100);
    expect(f.ui.hint).toHaveBeenCalledTimes(1);
  });

  it('success chowa podpowiedzi', () => {
    const f = fakeCtx();
    const coach = createCoach(f.ctx);
    coach.setTask({ key: 1, target: fakeEl() });
    coach.miss();
    coach.success();
    expect(f.hides[0]).toHaveBeenCalledTimes(1);
  });

  it('finish: listki, a ctx.complete dopiero po ich opadnięciu; raz', async () => {
    const f = fakeCtx();
    const coach = createCoach(f.ctx);
    coach.finish({ icon: '<svg></svg>' });
    coach.finish();
    expect(coach.done).toBe(true);
    expect(coach.locked).toBe(true);
    expect(f.ui.celebrate).toHaveBeenCalledTimes(1);
    await flush();
    expect(f.complete).not.toHaveBeenCalled();
    f.endCelebrate();
    await flush();
    expect(f.complete).toHaveBeenCalledTimes(1);
    expect(f.complete).toHaveBeenCalledWith({ icon: '<svg></svg>' });
  });

  it('finish: zapas, gdy animacja nigdy się nie kończy', async () => {
    const f = fakeCtx();
    createCoach(f.ctx).finish();
    f.advance(FINISH_FALLBACK_MS);
    await flush();
    expect(f.complete).toHaveBeenCalledTimes(1);
  });

  it('destroy przed końcem listków: complete nie przychodzi; wywołania po destroy są bezpieczne', async () => {
    const f = fakeCtx();
    const coach = createCoach(f.ctx);
    coach.finish();
    coach.destroy();
    f.endCelebrate();
    await flush();
    expect(f.complete).not.toHaveBeenCalled();
    expect(() => {
      coach.setTask({ key: 2, target: fakeEl() });
      expect(coach.miss(fakeEl())).toBe('ignored');
      coach.success();
      coach.finish();
      coach.destroy();
    }).not.toThrow();
    expect(f.ui.wobble).not.toHaveBeenCalled();
  });
});
