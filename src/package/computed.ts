import {
  getCurrentEffect,
  isEffect,
  popEffect,
  pushEffect,
  scheduleEffect,
} from "./effect.ts";

import type {
  ComputedCallback,
  IComputed,
  IEffect,
  Listener,
  Source,
} from "./types.ts";

export class Computed<T> implements IComputed<T> {
  #fn: ComputedCallback<T>;
  #cacheValue: T | undefined = undefined;
  #firstRun = true;
  #dirty = false;

  #sources = new Set<unknown>();
  #upstream = new Set<Source<T>>();

  constructor(fn: ComputedCallback<T>) {
    this.#fn = fn;

    this.invalidate = this.invalidate.bind(this);
  }

  get() {
    const ctx = getCurrentEffect();

    if (ctx) {
      if (isEffect(ctx)) {
        this.#sources.add(ctx);
        ctx.addSources<T>(this);
      } else if (isComputed(ctx)) {
        this.#sources.add(ctx.invalidate);
        ctx.trackUpstream(this);
      } else if (typeof ctx === "function") {
        this.#sources.add(ctx);
      }
    }

    if (this.#firstRun) {
      this.#firstRun = false;
      this.#recomputed();

      return this.#cacheValue;
    }

    if (this.#dirty) {
      this.#recomputed();
    }

    return this.#cacheValue;
  }

  subscribe(listener: Listener<T>) {
    this.#sources.add(listener);

    return () => {
      this.unsubscribe(listener);
    };
  }

  unsubscribe(listener: IEffect | Listener<T>): void {
    this.#sources.delete(listener);
  }

  invalidate() {
    if (this.#dirty) return;
    this.#dirty = true;
    this.notify();
  }

  trackUpstream(source: Source<T>) {
    this.#upstream.add(source);
  }

  #recomputed() {
    this.#upstream.forEach((source) => {
      source.unsubscribe(this.invalidate);
    });

    this.#upstream.clear();

    pushEffect(this);

    const prev = this.#cacheValue;
    const next = this.#fn();

    popEffect();

    this.#dirty = false;

    if (!Object.is(prev, next)) {
      this.#cacheValue = next;
    }
  }

  notify() {
    this.#sources.forEach((source) => {
      if (isComputed(source)) source.invalidate();
      else if (isEffect(source)) scheduleEffect(source);
      else if (typeof source === "function") source(this.#cacheValue);
    });
  }

  [Symbol.dispose]() {
    this.#upstream.forEach((s) => s.unsubscribe(this.invalidate));
    this.#upstream.clear();
    this.#sources.clear();
  }
}

export function isComputed<T>(val: unknown): val is Computed<T> {
  return val instanceof Computed;
}

export function computed<T>(fn: ComputedCallback<T>) {
  return new Computed<T>(fn);
}
