/** Brand-символы — устойчивы к дубликатам модуля (в отличие от instanceof). */
export const EFFECT_BRAND: unique symbol = Symbol.for("re-signal.effect");
export const COMPUTED_BRAND: unique symbol = Symbol.for("re-signal.computed");

/** Переиспользуемый буфер для snapshot Set → без alloc на каждый notify. */
const SNAPSHOT: unknown[] = [];

export function forEachSnapshot<T>(
  set: Set<T>,
  fn: (item: T) => void,
): void {
  const buf = SNAPSHOT;
  const start = buf.length;

  for (const item of set) buf.push(item);

  const end = buf.length;
  for (let i = start; i < end; i++) {
    fn(buf[i] as T);
  }

  buf.length = start;
}
