import { Computed } from "./computed.ts";
import type { IComputed, Mapper, Readable } from "./types.ts";

class LazyMap<T, U> {
  #fn: Mapper<T, U>;
  #source: Readable<T>;
  #computed: IComputed<U> | null = null;

  constructor(source: Readable<T>, fn: Mapper<T, U>) {
    this.#fn = fn;
    this.#source = source;
  }

  get() {
    if (!this.#computed) {
      this.#computed = new Computed(() => this.#fn(this.#source.get()));
    }

    return this.#computed.get();
  }
}

export function map<T, U>(source: Readable<T>, fn: Mapper<T, U>) {
  return new LazyMap<T, U>(source, fn);
}
