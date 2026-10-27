import { computed, type Computed } from "./computed.ts";
import { get, type Path, type PathValue } from "./lib.ts";
import { Option, type Option as OptionT } from "./option.ts";
import { Result, type Result as ResultT } from "./result.ts";
import type {
  CombineEntry,
  CombineRecordValues,
  CombineValues,
  Mapper,
  Operator,
  Readable,
} from "./types.ts";

/** Ленивый computed (fn не зовётся до get/subscribe). */
export function derive<T>(fn: () => T): Computed<T> {
  return computed(fn);
}

export function map<T, U>(source: Readable<T>, fn: Mapper<T, U>) {
  return derive(() => fn(source.get()));
}

/** pred false → None, иначе Some(value). */
export function filter<T>(
  source: Readable<T>,
  fn: (val: T) => boolean,
): Readable<OptionT<T>> {
  return derive(() => {
    const value = source.get();
    return fn(value) ? Option.some(value) : Option.none;
  });
}

/** map + Option за один проход. */
export function filterMap<T, U>(
  source: Readable<T>,
  fn: (val: T) => OptionT<U>,
): Readable<OptionT<U>> {
  return derive(() => fn(source.get()));
}

export function when<T>(
  cond: Readable<boolean>,
  thenFn: () => T,
  elseFn: () => T,
) {
  return derive(() => (cond.get() ? thenFn() : elseFn()));
}

/** Path → Option (нет ключа в runtime → None). */
export function pick<T, P extends Path<T>>(
  source: Readable<T>,
  path: P,
): Readable<OptionT<PathValue<T, P>>> {
  return derive(() => get(source.get(), path));
}

/** Option.map над Readable. */
export function mapSome<T, U>(
  source: Readable<OptionT<T>>,
  fn: (value: T) => U,
): Readable<OptionT<U>> {
  return derive(() => Option.map(source.get(), fn));
}

/** Option.flatMap над Readable. */
export function andThen<T, U>(
  source: Readable<OptionT<T>>,
  fn: (value: T) => OptionT<U>,
): Readable<OptionT<U>> {
  return derive(() => Option.flatMap(source.get(), fn));
}

/** Option → T с fallback. */
export function unwrapOr<T>(
  source: Readable<OptionT<T>>,
  fallback: T,
): Readable<T> {
  return derive(() => Option.unwrapOr(source.get(), fallback));
}

/** Fallible map: исключение → Err. */
export function tryMap<T, U>(
  source: Readable<T>,
  fn: (value: T) => U,
): Readable<ResultT<U, unknown>> {
  return derive(() => Result.fromThrowable(() => fn(source.get())));
}

export function mapResult<T, U, E>(
  source: Readable<ResultT<T, E>>,
  fn: (value: T) => U,
): Readable<ResultT<U, E>> {
  return derive(() => Result.map(source.get(), fn));
}

export function unwrapResultOr<T, E>(
  source: Readable<ResultT<T, E>>,
  fallback: T,
): Readable<T> {
  return derive(() => Result.unwrapOr(source.get(), fallback));
}

export function mapOp<T, U>(fn: Mapper<T, U>): Operator<T, U> {
  return (source) => map(source, fn);
}

export function filterOp<T>(fn: (val: T) => boolean): Operator<T, OptionT<T>> {
  return (source) => filter(source, fn);
}

export function filterMapOp<T, U>(
  fn: (val: T) => OptionT<U>,
): Operator<T, OptionT<U>> {
  return (source) => filterMap(source, fn);
}

export function pickOp<T, P extends Path<T>>(
  path: P,
): Operator<T, OptionT<PathValue<T, P>>> {
  return (source) => pick(source, path);
}

export function mapSomeOp<T, U>(
  fn: (value: T) => U,
): Operator<OptionT<T>, OptionT<U>> {
  return (source) => mapSome(source, fn);
}

export function andThenOp<T, U>(
  fn: (value: T) => OptionT<U>,
): Operator<OptionT<T>, OptionT<U>> {
  return (source) => andThen(source, fn);
}

export function unwrapOrOp<T>(fallback: T): Operator<OptionT<T>, T> {
  return (source) => unwrapOr(source, fallback);
}

export function tryMapOp<T, U>(
  fn: (value: T) => U,
): Operator<T, ResultT<U, unknown>> {
  return (source) => tryMap(source, fn);
}

export function mapResultOp<T, U, E>(
  fn: (value: T) => U,
): Operator<ResultT<T, E>, ResultT<U, E>> {
  return (source) => mapResult(source, fn);
}

export function unwrapResultOrOp<T, E>(fallback: T): Operator<ResultT<T, E>, T> {
  return (source) => unwrapResultOr(source, fallback);
}

/** Readable<Iterable<T>> → Readable<U[]> */
export function mapItems<T, U>(
  source: { get(): Iterable<T> | undefined },
  fn: (item: T, index: number) => U,
): Readable<U[]> {
  return derive(() => Array.from(source.get() ?? [], fn));
}

/** Readable<Iterable<T>> → Readable<T[]> */
export function filterItems<T>(
  source: { get(): Iterable<T> | undefined },
  pred: (item: T, index: number) => boolean,
): Readable<T[]> {
  return derive(() => {
    const out: T[] = [];
    let index = 0;

    for (const item of source.get() ?? []) {
      if (pred(item, index)) out.push(item);
      index++;
    }

    return out;
  });
}

export function mapItemsOp<T, U>(
  fn: (item: T, index: number) => U,
): Operator<Iterable<T>, U[]> {
  return (source) => mapItems(source, fn);
}

export function filterItemsOp<T>(
  pred: (item: T, index: number) => boolean,
): Operator<Iterable<T>, T[]> {
  return (source) => filterItems(source, pred);
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

    return operators.length > 0
      ? operators.reduce<Readable<unknown>>((acc, op) => op(acc), source)
      : source;
  }

  if (!isReadable(entry)) {
    throw new TypeError("Invalid combine entry");
  }

  return entry;
}

export function combine<const T extends readonly CombineEntry[], R>(
  sources: T,
  combiner: (values: CombineValues<T>) => R,
): Readable<R>;
export function combine<
  const T extends Record<string, CombineEntry>,
  R,
>(
  sources: T,
  combiner: (values: CombineRecordValues<T>) => R,
): Readable<R>;
export function combine(
  sources:
    | readonly CombineEntry[]
    | Record<string, CombineEntry>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  combiner: (values: any) => unknown,
): Readable<unknown> {
  if (Array.isArray(sources)) {
    const resolved = sources.map(resolveCombineEntry);

    return derive(() => {
      const values = resolved.map((source) => source.get());
      return combiner(values);
    });
  }

  const record = sources as Record<string, CombineEntry>;
  const keys = Object.keys(record);
  const resolved = keys.map((key) => resolveCombineEntry(record[key]!));

  return derive(() => {
    const values = Object.fromEntries(
      keys.map((key, index) => [key, resolved[index]!.get()]),
    );
    return combiner(values);
  });
}
