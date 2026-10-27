import type { Readable } from "./types.ts";

export type IterateOptions = {
  /** Прервать for-await (аналог break снаружи). */
  signal?: AbortSignal;
};

/**
 * Async-итератор по изменениям Readable:
 * сразу отдаёт текущее get(), затем каждое обновление.
 *
 *   for await (const v of iterate(count)) { ... }
 *   for await (const v of count) { ... }  // через Symbol.asyncIterator
 */
export async function* iterate<T>(
  source: Readable<T>,
  options?: IterateOptions,
): AsyncGenerator<T, void, unknown> {
  const abort = options?.signal;

  if (abort?.aborted) return;

  const queue: T[] = [];
  let wake: (() => void) | undefined;

  const onAbort = () => wake?.();
  abort?.addEventListener("abort", onAbort, { once: true });

  // подписка до первого yield — иначе updates между next() теряются
  const unsubscribe = source.subscribe((value) => {
    queue.push(value);
    wake?.();
  });

  try {
    yield source.get();

    while (!abort?.aborted) {
      while (queue.length > 0) {
        yield queue.shift() as T;
        if (abort?.aborted) return;
      }

      if (abort?.aborted) return;

      await new Promise<void>((resolve) => {
        if (abort?.aborted) {
          resolve();
          return;
        }
        wake = resolve;
      });
      wake = undefined;
    }
  } finally {
    unsubscribe();
    abort?.removeEventListener("abort", onAbort);
  }
}

/**
 * Sync-итератор по текущему Iterable-значению.
 * get() вызывается при старте for..of — внутри effect трекает source.
 *
 *   effect(() => {
 *     for (const item of each(list)) console.log(item);
 *   });
 */
export function each<T>(source: Readable<Iterable<T>>): Iterable<T> {
  return {
    [Symbol.iterator](): Iterator<T> {
      return source.get()[Symbol.iterator]();
    },
  };
}
