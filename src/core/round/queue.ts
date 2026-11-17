/**
 * Kolejka zadań rundy — czysty kod. Zadanie rozwiązane „razem” (3. szczebel Z-19) wraca na koniec
 * kolejki, ale najwyżej raz, więc runda ma najwyżej 2 × N zadań i zawsze się kończy (Z-23).
 */
export interface TaskQueue<T> {
  /** Następne zadanie albo undefined, gdy runda się skończyła. */
  next(): T | undefined;
  /** Bieżące zadanie wraca na koniec kolejki (najwyżej raz na zadanie). Zwraca, czy wróciło. */
  requeue(): boolean;
}

export function createTaskQueue<T>(tasks: readonly T[]): TaskQueue<T> {
  const pending = tasks.map((task) => ({ task, again: false }));
  let current: { task: T; again: boolean } | undefined;

  return {
    next() {
      current = pending.shift();
      return current?.task;
    },
    requeue() {
      if (!current || current.again) return false;
      pending.push({ task: current.task, again: true });
      current = undefined;
      return true;
    },
  };
}
