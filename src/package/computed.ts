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
} from "./types.ts";

export class Computed<T> implements IComputed<T> {
  #fn: ComputedCallback<T>;
  #cacheValue: T | undefined = undefined;
  #firstRun = true;
  #dirty = false;

  #sources = new Set<unknown>();

  constructor(fn: ComputedCallback<T>) {
    this.#fn = fn;
  }

  get() {
    const ctx = getCurrentEffect();

    if (ctx) {
      if (isEffect(ctx)) {
        this.#sources.add(ctx);
        ctx.addSources<T>(this);
      }

      if (typeof ctx === "function") {
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

  #invalidate = () => {
    this.#dirty = true;
    this.notify();
  };

  #recomputed() {
    pushEffect(this.#invalidate);

    const prev = this.#cacheValue;
    const next = this.#fn();

    popEffect();

    this.#dirty = false;

    if (!Object.is(prev, next)) {
      this.#cacheValue = next;
    }
  }

  notify() {
    const hasFunc = [...this.#sources].some((cb) => typeof cb === "function");

    if (hasFunc && this.#dirty) {
      this.#recomputed();
    }

    this.#sources.forEach((source) => {
      if (isComputed(source)) source.invalidate();
      else if (isEffect(source)) scheduleEffect(source);
      else if (typeof source === "function") source(this.#cacheValue);
    });
  }

  #markDirty() {
    this.#dirty = true;
  }

  invalidate() {
    this.#markDirty();
    this.notify();
  }

  [Symbol.dispose]() {
    this.#sources.clear();
  }
}

function isComputed<T>(val: unknown): val is Computed<T> {
  return val instanceof Computed;
}

export function computed<T>(fn: ComputedCallback<T>) {
  return new Computed<T>(fn);
}
