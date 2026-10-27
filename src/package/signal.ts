import { getCurrentEffect, isEffect, scheduleEffect, untrack } from "./effect.ts";
import { iterate } from "./iterator.ts";
import { COMPUTED_BRAND, forEachSnapshot } from "./runtime.ts";
import type {
  Deps,
  IComputed,
  IEffect,
  ISignal,
  Listener,
  Readable,
  SignalOptions,
} from "./types.ts";

function isComputedDep(value: unknown): value is IComputed<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    COMPUTED_BRAND in (value as object)
  );
}

export class Signal<T = unknown> implements ISignal<T>, AsyncIterable<T> {
  #value: T;
  #deps = new Set<Deps<T>>();
  #disposed = false;
  #equals: (prev: T, next: T) => boolean;

  constructor(value: T, options?: SignalOptions<T>) {
    this.#value = value;
    this.#equals = options?.equals ?? Object.is;
  }

  get() {
    if (this.#disposed) return this.#value;

    const ctx = getCurrentEffect();

    if (ctx) {
      if (isEffect(ctx)) {
        this.#deps.add(ctx);
        ctx.addSources<T>(this);
      } else if (isComputedDep(ctx)) {
        this.#deps.add(ctx);
        ctx.trackUpstream(this);
      } else if (typeof ctx === "function") {
        this.#deps.add(ctx);
      }
    }

    return this.#value;
  }

  /** Прочитать без track. */
  peek() {
    return this.#value;
  }

  set(newValue: T) {
    if (this.#disposed) return;
    if (this.#equals(this.#value, newValue)) return;

    this.#value = newValue;
    this.#notify();
  }

  update(fn: (prev: T) => T) {
    this.set(fn(this.#value));
  }

  #notify() {
    forEachSnapshot(this.#deps, (dep) => {
      if (isEffect(dep)) {
        scheduleEffect(dep);
      } else if (isComputedDep(dep)) {
        dep.invalidate();
      } else if (typeof dep === "function") {
        dep(this.#value);
      }
    });
  }

  subscribe(listener: Listener<T>) {
    if (this.#disposed) return () => {};

    this.#deps.add(listener);

    return () => {
      this.unsubscribe(listener);
    };
  }

  unsubscribe(listener: Listener<T> | IEffect | IComputed<unknown>) {
    this.#deps.delete(listener as Deps<T>);
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#deps.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return iterate(this);
  }
}

export function ref<T>(val: T, options?: SignalOptions<T>) {
  return new Signal<T>(val, options);
}

/** Прочитать Readable без регистрации зависимости. */
export function peek<T>(source: Readable<T>): T {
  if (typeof source.peek === "function") return source.peek();
  return untrack(() => source.get());
}
