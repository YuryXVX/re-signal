export type Listener<T> = (val: T) => void;

export type EffectCallback = (() => void) | (() => () => void);
export type Mapper<T, U> = (val: T) => U;

export type ComputedCallback<T> = () => T;

export type Source<T> = ISignal<T> | IComputed<T>;

export type Ctx = EffectCallback | IEffect | IComputed<unknown>;

export interface ISignal<T> {
  get(): T;
  set(val: T): void;
  subscribe(listener: Listener<T>): () => void;
  unsubscribe(listener: Listener<T> | IEffect): void;
}

export interface IEffect {
  run(): void;
  dispose(): void;
  addSources<T>(source: Source<T>): void;
}

export interface IComputed<T> {
  get(): T | undefined;
  subscribe(listener: Listener<T>): () => void;
  unsubscribe(listener: Listener<T> | IEffect): void;
}

export type Deps<T> = Listener<T> | IEffect;

export interface Readable<T> {
  get(): T;
  subscribe(listener: Listener<T>): () => void;
}

export type Operator<T, U> = (source: Readable<T>) => Readable<U>;

export type PipeOut<T, Ops extends readonly Operator<unknown, unknown>[]> =
  Ops extends readonly [infer Op, ...infer Rest]
    ? Op extends Operator<T, infer U>
      ? Rest extends readonly Operator<unknown, unknown>[]
        ? PipeOut<U, Rest>
        : U
      : never
    : T;

export type CombineEntry<T = unknown> =
  | Readable<T>
  | readonly [Readable<T>, ...Operator<T, unknown>[]];

export type CombineEntryValue<T> = T extends Readable<infer U>
  ? U
  : T extends readonly [Readable<infer U>, ...infer Ops]
    ? Ops extends readonly Operator<unknown, unknown>[]
      ? PipeOut<U, Ops>
      : U
    : never;

export type CombineValues<T extends readonly CombineEntry[]> = {
  readonly [K in keyof T]: CombineEntryValue<T[K]>;
};

export type CombineRecordValues<T extends Record<string, CombineEntry>> = {
  readonly [K in keyof T]: CombineEntryValue<T[K]>;
};
