import { describe, expect, it } from "vitest";
import { Option } from "./option.ts";
import { Result } from "./result.ts";

describe("Option", () => {
  it("map / flatMap / unwrapOr", () => {
    expect(Option.map(Option.some(2), (n) => n * 3)).toEqual(Option.some(6));
    expect(Option.map(Option.none, (n: number) => n * 3)).toEqual(Option.none);

    expect(
      Option.flatMap(Option.some(2), (n) => Option.some(n + 1)),
    ).toEqual(Option.some(3));
    expect(Option.flatMap(Option.none, (n: number) => Option.some(n))).toEqual(
      Option.none,
    );

    expect(Option.unwrapOr(Option.some(1), 0)).toBe(1);
    expect(Option.unwrapOr(Option.none, 0)).toBe(0);
  });

  it("fromNullable", () => {
    expect(Option.fromNullable(1)).toEqual(Option.some(1));
    expect(Option.fromNullable(null)).toEqual(Option.none);
    expect(Option.fromNullable(undefined)).toEqual(Option.none);
  });
});

describe("Result", () => {
  it("map / flatMap / unwrapOr", () => {
    expect(Result.map(Result.ok(2), (n) => n * 2)).toEqual(Result.ok(4));
    expect(Result.map(Result.err("e"), (n: number) => n * 2)).toEqual(
      Result.err("e"),
    );

    expect(Result.unwrapOr(Result.ok(1), 0)).toBe(1);
    expect(Result.unwrapOr(Result.err("e"), 0)).toBe(0);
  });

  it("fromThrowable / toOption", () => {
    expect(Result.fromThrowable(() => 1)).toEqual(Result.ok(1));
    expect(Result.isErr(Result.fromThrowable(() => {
      throw new Error("x");
    }))).toBe(true);

    expect(Result.toOption(Result.ok(5))).toEqual(Option.some(5));
    expect(Result.toOption(Result.err("e"))).toEqual(Option.none);
  });
});
