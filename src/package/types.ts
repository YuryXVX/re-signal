export type Listener<T> = (val: T) => void;

export type EffectCallback = (() => void) | (() => () => void);
export type Mapper<T, U> = (val: T) => U;

export type ComputedCallback<T> = () => T;

export type Source<T> = ISignal<T> | IComputed<T>;

export type Ctx = EffectCallback | IEffect;

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
  subscribe(listener: Listener<T> | IEffect): void;
}
