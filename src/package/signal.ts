import { getCurrentEffect, isEffect, scheduleEffect } from "./effect.ts";
import type { Deps, IEffect, ISignal, Listener } from "./types.ts";

export class Signal<T = unknown> implements ISignal<T> {
  #value: T;
  #deps = new Set<Deps<T>>();

  constructor(value: T) {
    this.#value = value;
  }

  get() {
    const ctx = getCurrentEffect();

    if (ctx) {
      if (isEffect(ctx)) {
        this.#deps.add(ctx);
        ctx.addSources<T>(this);
      } else {
        this.#deps.add(ctx);
      }
    }

    return this.#value;
  }

  set(newValue: T) {
    if (Object.is(this.#value, newValue)) return;

    this.#value = newValue;
    this.#notify();
  }

  #notify() {
    this.#deps.forEach((dep) => {
      if (isEffect(dep)) {
        scheduleEffect(dep);
      } else if (typeof dep === "function") dep(this.#value);
    });
  }

  subscribe(listener: Listener<T>) {
    this.#deps.add(listener);

    return () => {
      this.unsubscribe(listener);
    };
  }

  unsubscribe(listener: Listener<T> | IEffect) {
    this.#deps.delete(listener);
  }
}

export function ref<T>(val: T) {
  return new Signal<T>(val);
}
