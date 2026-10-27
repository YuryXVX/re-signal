export type Listener<T> = (val: T) => void;

export type EffectCallback = (() => void) | (() => () => void);
export type Mapper<T, U> = (val: T) => U;

export type ComputedCallback<T> = () => T;

export type Equals<T> = (prev: T, next: T) => boolean;

export type SignalOptions<T> = {
  equals?: Equals<T>;
};

export type ComputedOptions<T> = {
  equals?: Equals<T>;
};

export type Source<T> = ISignal<T> | IComputed<T>;

export type Ctx = EffectCallback | IEffect | IComputed<unknown>;

/** Explicit Resource Management — `using` / `[Symbol.dispose]`. */
export interface Disposable {
  [Symbol.dispose](): void;
}

/** Stop-функция effect/reaction: вызывается как fn() и через `using`. */
export type Stop = (() => void) & Disposable;

export interface ISignal<T> extends Disposable, AsyncIterable<T> {
  get(): T;
  peek(): T;
  set(val: T): void;
  update(fn: (prev: T) => T): void;
  subscribe(listener: Listener<T>): () => void;
  unsubscribe(listener: Listener<T> | IEffect | IComputed<unknown>): void;
  dispose(): void;
}

export interface IEffect extends Disposable {
  run(): void;
  dispose(): void;
  addSources<T>(source: Source<T>): void;
}

export interface IComputed<T> extends Disposable, AsyncIterable<T> {
  get(): T;
  peek(): T;
  invalidate(): void;
  trackUpstream(source: Source<unknown>): void;
  subscribe(listener: Listener<T>): () => void;
  unsubscribe(listener: Listener<T> | IEffect | IComputed<unknown>): void;
  dispose(): void;
}
export type Deps<T> = Listener<T> | IEffect | IComputed<unknown>;

export interface Readable<T> {
  get(): T;
  peek?(): T;
  subscribe(listener: Listener<T>): () => void;
  dispose?(): void;
  [Symbol.dispose]?(): void;
}

export type Operator<T, U> = (source: Readable<T>) => Readable<U>;

/** Loose operator for combine/pipe type-level chaining (avoids contravariance dead-ends). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyOp = Operator<any, any>;

export type PipeOut<T, Ops extends readonly AnyOp[]> = Ops extends readonly [
  infer Op,
  ...infer Rest,
]
  ? Op extends Operator<T, infer U>
    ? Rest extends readonly AnyOp[]
      ? PipeOut<U, Rest>
      : U
    : never
  : T;

/** Operators in combine tuples are checked structurally via PipeOut. */
export type CombineEntry<T = unknown> =
  | Readable<T>
  | readonly [Readable<T>, ...AnyOp[]];

export type CombineEntryValue<T> = T extends Readable<infer U>
  ? U
  : T extends readonly [Readable<infer U>, ...infer Ops]
    ? Ops extends readonly AnyOp[]
      ? PipeOut<U, Ops>
      : U
    : never;

export type CombineValues<T extends readonly CombineEntry[]> = {
  readonly [K in keyof T]: CombineEntryValue<T[K]>;
};

export type CombineRecordValues<T extends Record<string, CombineEntry>> = {
  readonly [K in keyof T]: CombineEntryValue<T[K]>;
};
