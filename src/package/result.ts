import { Option, type Option as OptionT } from "./option.ts";

export type Ok<T> = {
  readonly kind: "ok";
  readonly value: T;
};

export type Err<E> = {
  readonly kind: "err";
  readonly error: E;
};

export type Result<T, E = Error> = Ok<T> | Err<E>;

export const Result = {
  ok<T>(value: T): Ok<T> {
    return { kind: "ok", value };
  },

  err<E>(error: E): Err<E> {
    return { kind: "err", error };
  },

  isOk<T, E>(result: Result<T, E>): result is Ok<T> {
    return result.kind === "ok";
  },

  isErr<T, E>(result: Result<T, E>): result is Err<E> {
    return result.kind === "err";
  },

  map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return Result.isOk(result) ? Result.ok(fn(result.value)) : result;
  },

  mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    return Result.isErr(result) ? Result.err(fn(result.error)) : result;
  },

  flatMap<T, U, E>(
    result: Result<T, E>,
    fn: (value: T) => Result<U, E>,
  ): Result<U, E> {
    return Result.isOk(result) ? fn(result.value) : result;
  },

  unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
    return Result.isOk(result) ? result.value : fallback;
  },

  toOption<T, E>(result: Result<T, E>): OptionT<T> {
    return Result.isOk(result) ? Option.some(result.value) : Option.none;
  },

  fromThrowable<T>(fn: () => T): Result<T, unknown> {
    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.err(error);
    }
  },
};
