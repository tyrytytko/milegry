import { describe, expect, it } from 'vitest';
import { createTaskQueue } from './queue';

describe('createTaskQueue', () => {
  it('podaje zadania po kolei, potem undefined', () => {
    const queue = createTaskQueue(['a', 'b']);
    expect(queue.next()).toBe('a');
    expect(queue.next()).toBe('b');
    expect(queue.next()).toBeUndefined();
    expect(queue.next()).toBeUndefined();
  });

  it('requeue: bieżące zadanie wraca na koniec, najwyżej raz', () => {
    const queue = createTaskQueue(['a', 'b']);
    queue.next();
    expect(queue.requeue()).toBe(true);
    expect(queue.next()).toBe('b');
    expect(queue.next()).toBe('a');
    expect(queue.requeue()).toBe(false);
    expect(queue.next()).toBeUndefined();
  });

  it('requeue przed pierwszym next i po końcu nic nie robi', () => {
    const queue = createTaskQueue(['a']);
    expect(queue.requeue()).toBe(false);
    queue.next();
    queue.next();
    expect(queue.requeue()).toBe(false);
    expect(queue.next()).toBeUndefined();
  });

  it('runda zawsze się kończy: nawet gdy każde zadanie wraca, najwyżej 2 × N zadań', () => {
    const queue = createTaskQueue([1, 2, 3, 4, 5]);
    let shown = 0;
    while (queue.next() !== undefined) {
      shown++;
      queue.requeue();
      expect(shown).toBeLessThanOrEqual(10);
    }
    expect(shown).toBe(10);
  });

  it('nie zmienia tablicy wejściowej', () => {
    const tasks = ['a', 'b'];
    const queue = createTaskQueue(tasks);
    queue.next();
    queue.requeue();
    expect(tasks).toEqual(['a', 'b']);
  });
});
