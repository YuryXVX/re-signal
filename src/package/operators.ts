import { get, type Path, type PathValue } from "./lib.ts";
import { Computed } from "./computed.ts";
import type {
  CombineEntry,
  CombineRecordValues,
  CombineValues,
  Listener,
  Mapper,
  Operator,
  Readable,
} from "./types.ts";

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

export function mapOp<T, U>(fn: Mapper<T, U>): Operator<T, U> {
  return (source) => map(source, fn);
}

export function filterOp<T>(
  fn: (val: T) => boolean,
): Operator<T, T | undefined> {
  return (source) => filter(source, fn);
}

export function pickOp<T, P extends Path<T>>(
  path: P,
): Operator<T, PathValue<T, P>> {
  return (source) => pick(source, path);
}

export function pipe<T>(source: Readable<T>): Readable<T>;
export function pipe<T, A>(
  source: Readable<T>,
  op1: Operator<T, A>,
): Readable<A>;
export function pipe<T, A, B>(
  source: Readable<T>,
  op1: Operator<T, A>,
  op2: Operator<A, B>,
): Readable<B>;
export function pipe<T, A, B, C>(
  source: Readable<T>,
  op1: Operator<T, A>,
  op2: Operator<A, B>,
  op3: Operator<B, C>,
): Readable<C>;
export function pipe<T, A, B, C, D>(
  source: Readable<T>,
  op1: Operator<T, A>,
  op2: Operator<A, B>,
  op3: Operator<B, C>,
  op4: Operator<C, D>,
): Readable<D>;
export function pipe<T, A, B, C, D, E>(
  source: Readable<T>,
  op1: Operator<T, A>,
  op2: Operator<A, B>,
  op3: Operator<B, C>,
  op4: Operator<C, D>,
  op5: Operator<D, E>,
): Readable<E>;
export function pipe(
  source: Readable<unknown>,
  ...operators: Operator<unknown, unknown>[]
): Readable<unknown> {
  return operators.reduce((acc, operator) => operator(acc), source);
}

function isReadable(value: unknown): value is Readable<unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "get" in value &&
    typeof value.get === "function"
  );
}

function isOperator(value: unknown): value is Operator<unknown, unknown> {
  return typeof value === "function";
}

function resolveCombineEntry(entry: CombineEntry<unknown>): Readable<unknown> {
  if (Array.isArray(entry)) {
    const [source, ...operators] = entry;

    if (!isReadable(source) || !operators.every(isOperator)) {
      throw new TypeError("Invalid combine entry");
    }

    return operators.length > 0 ? pipe(source, ...operators) : source;
  }

  if (!isReadable(entry)) {
    throw new TypeError("Invalid combine entry");
  }

  return entry;
}

export function combine<const T extends readonly CombineEntry[]>(
  sources: T,
  combiner: (values: CombineValues<T>) => unknown,
): Readable<ReturnType<typeof combiner>>;
export function combine<
  T extends Record<string, CombineEntry<unknown>>,
  R,
>(
  sources: T,
  combiner: (values: CombineRecordValues<T>) => R,
): Readable<R>;
export function combine(
  sources:
    | readonly CombineEntry<unknown>[]
    | Record<string, CombineEntry<unknown>>,
  combiner: (values: unknown) => unknown,
): Readable<unknown> {
  if (Array.isArray(sources)) {
    const resolved = sources.map(resolveCombineEntry);

    return derive(() => {
      const values = resolved.map((source) => source.get());

      return combiner(values);
    });
  }

  const keys = Object.keys(sources) as (keyof typeof sources)[];
  const resolved = keys.map((key) => resolveCombineEntry(sources[key]));

  return derive(() => {
    const values = Object.fromEntries(
      keys.map((key, index) => [key, resolved[index].get()]),
    );

    return combiner(values);
  });
}
