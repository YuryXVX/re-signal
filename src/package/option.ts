export type Some<T> = {
  readonly kind: "some";
  readonly value: T;
};

export type None = {
  readonly kind: "none";
};

export type Option<T> = Some<T> | None;

export const Option = {
  some<T>(value: T): Some<T> {
    return { kind: "some", value };
  },

  none: { kind: "none" } as None,

  isSome<T>(option: Option<T>): option is Some<T> {
    return option.kind === "some";
  },

  isNone(option: Option<unknown>): option is None {
    return option.kind === "none";
  },

  fromNullable<T>(value: T | null | undefined): Option<T> {
    return value == null ? Option.none : Option.some(value);
  },

  map<T, U>(option: Option<T>, fn: (value: T) => U): Option<U> {
    return Option.isSome(option) ? Option.some(fn(option.value)) : Option.none;
  },

  flatMap<T, U>(option: Option<T>, fn: (value: T) => Option<U>): Option<U> {
    return Option.isSome(option) ? fn(option.value) : Option.none;
  },

  unwrapOr<T>(option: Option<T>, fallback: T): T {
    return Option.isSome(option) ? option.value : fallback;
  },

  unwrapOrElse<T>(option: Option<T>, fallback: () => T): T {
    return Option.isSome(option) ? option.value : fallback();
  },

  toNullable<T>(option: Option<T>): T | null {
    return Option.isSome(option) ? option.value : null;
  },
};
