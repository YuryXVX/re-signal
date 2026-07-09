import { get, type Path, type PathValue } from "./lib.ts";
import { Computed } from "./computed.ts";
import type { Listener, Mapper, Readable } from "./types.ts";

class Derived<T> implements Readable<T> {
  #computed: Computed<T> | null = null;

  constructor(private readonly fn: () => T) {}

  #ensure(): Computed<T> {
    if (!this.#computed) {
      this.#computed = new Computed(this.fn);
    }

    return this.#computed;
  }

  get(): T {
    return this.#ensure().get() as T;
  }

  subscribe(listener: Listener<T>): () => void {
    const computed = this.#ensure();

    computed.get();

    return computed.subscribe(listener);
  }
}

export function derive<T>(fn: () => T): Readable<T> {
  return new Derived(fn);
}

export function map<T, U>(source: Readable<T>, fn: Mapper<T, U>) {
  return derive(() => fn(source.get()));
}

export function filter<T>(source: Readable<T>, fn: (val: T) => boolean) {
  return derive(() => {
    const value = source.get();

    if (fn(value)) return value;
    return undefined;
  });
}

export function when<T>(
  cond: Readable<boolean>,
  thenFn: () => T,
  elseFn: () => T,
) {
  return derive(() => (cond.get() ? thenFn() : elseFn()));
}

export function pick<T, P extends Path<T>>(
  source: Readable<T>,
  path: P,
): Readable<PathValue<T, P>> {
  return derive(() => get(source.get(), path));
}
