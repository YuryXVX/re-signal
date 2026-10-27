import {
  getCurrentEffect,
  isEffect,
  popEffect,
  pushEffect,
  scheduleEffect,
} from "./effect.ts";
import { iterate } from "./iterator.ts";
import { COMPUTED_BRAND, forEachSnapshot } from "./runtime.ts";

import type {
  ComputedCallback,
  ComputedOptions,
  IComputed,
  IEffect,
  Listener,
  Readable,
  Source,
} from "./types.ts";

export class Computed<T> implements IComputed<T>, AsyncIterable<T> {
  readonly [COMPUTED_BRAND] = true as const;

  #fn: ComputedCallback<T>;
  #cacheValue: T | undefined = undefined;
  #hasValue = false;
  #firstRun = true;
  #dirty = false;
  #disposed = false;
  #equals: (prev: T, next: T) => boolean;

  /** OUT */
  #effects = new Set<IEffect>();
  #computeds = new Set<IComputed<unknown>>();
  #listeners = new Set<Listener<T>>();

  /** IN */
  #upstream = new Set<Source<unknown>>();

  constructor(fn: ComputedCallback<T>, options?: ComputedOptions<T>) {
    this.#fn = fn;
    this.#equals = options?.equals ?? Object.is;
  }

  get(): T {
    if (this.#disposed) return this.#cacheValue as T;

    this.#trackConsumer();
    return this.#ensureValue();
  }

  peek(): T {
    if (this.#disposed) return this.#cacheValue as T;
    return this.#ensureValue();
  }

  #trackConsumer() {
    const ctx = getCurrentEffect();
    if (!ctx) return;

    if (isEffect(ctx)) {
      this.#effects.add(ctx);
      ctx.addSources(this);
    } else if (isComputed(ctx)) {
      this.#computeds.add(ctx);
      ctx.trackUpstream(this);
    } else if (typeof ctx === "function") {
      this.#listeners.add(ctx as Listener<T>);
    }
  }

  #ensureValue(): T {
    if (this.#firstRun) {
      this.#firstRun = false;
      this.#recomputed();
      return this.#cacheValue as T;
    }

    if (this.#dirty) this.#recomputed();

    return this.#cacheValue as T;
  }

  #hasObservers() {
    return (
      this.#effects.size > 0 ||
      this.#computeds.size > 0 ||
      this.#listeners.size > 0
    );
  }

  subscribe(listener: Listener<T>) {
    if (this.#disposed) return () => {};

    this.#listeners.add(listener);
    this.get();

    return () => {
      this.#listeners.delete(listener);
    };
  }

  unsubscribe(listener: IEffect | Listener<T> | IComputed<unknown>): void {
    if (typeof listener === "function") {
      this.#listeners.delete(listener);
    } else if (isEffect(listener)) {
      this.#effects.delete(listener);
    } else if (isComputed(listener)) {
      this.#computeds.delete(listener);
    }
  }

  invalidate() {
    if (this.#disposed || this.#dirty) return;
    this.#dirty = true;

    if (!this.#hasObservers()) return;

    forEachSnapshot(this.#computeds, (c) => c.invalidate());
    forEachSnapshot(this.#effects, (e) => scheduleEffect(e));

    if (this.#listeners.size > 0) {
      const value = this.#ensureValue() as T;
      forEachSnapshot(this.#listeners, (listener) => listener(value));
    }
  }

  trackUpstream(source: Source<unknown>) {
    this.#upstream.add(source);
  }

  #recomputed() {
    forEachSnapshot(this.#upstream, (source) => {
      source.unsubscribe(this);
    });
    this.#upstream.clear();

    pushEffect(this);
    const next = this.#fn();
    popEffect();

    this.#dirty = false;

    if (!this.#hasValue || !this.#equals(this.#cacheValue as T, next)) {
      this.#cacheValue = next;
      this.#hasValue = true;
    }
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;

    forEachSnapshot(this.#upstream, (s) => s.unsubscribe(this));
    this.#upstream.clear();
    this.#effects.clear();
    this.#computeds.clear();
    this.#listeners.clear();
  }

  [Symbol.dispose]() {
    this.dispose();
  }

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return iterate(this as unknown as Readable<T>);
  }
}

export function isComputed<T>(val: unknown): val is Computed<T> {
  return (
    typeof val === "object" &&
    val !== null &&
    COMPUTED_BRAND in (val as object)
  );
}

export function computed<T>(
  fn: ComputedCallback<T>,
  options?: ComputedOptions<T>,
) {
  return new Computed<T>(fn, options);
}
