import { describe, expect, it, vi } from "vitest";
import { derive, filter, map, pick, when } from "./operators.ts";
import { effect } from "./effect.ts";
import { ref } from "./signal.ts";

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("derive", () => {
  it("не вычисляет значение при создании", () => {
    const fn = vi.fn(() => 42);

    derive(fn);

    expect(fn).not.toHaveBeenCalled();
  });

  it("вычисляет значение только при первом get", () => {
    const fn = vi.fn(() => 42);
    const derived = derive(fn);

    expect(fn).not.toHaveBeenCalled();

    expect(derived.get()).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);

    derived.get();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("активирует граф зависимостей при первом subscribe", () => {
    const source = ref(1);
    const fn = vi.fn(() => source.get() * 2);
    const derived = derive(fn);
    const listener = vi.fn();

    expect(fn).not.toHaveBeenCalled();

    derived.subscribe(listener);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(listener).not.toHaveBeenCalled();

    source.set(3);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(derived.get()).toBe(6);
  });

  it("работает внутри effect", async () => {
    const source = ref(1);
    const doubled = derive(() => source.get() * 2);
    const fn = vi.fn(() => doubled.get());

    effect(fn);
    source.set(2);

    await flushEffects();

    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("map", () => {
  it("не вызывает mapper при создании", () => {
    const source = ref(3);
    const mapper = vi.fn((v: number) => v * 2);

    map(source, mapper);

    expect(mapper).not.toHaveBeenCalled();
  });

  it("преобразует значение источника", () => {
    const source = ref(3);
    const mapped = map(source, (v) => v * 2);

    expect(mapped.get()).toBe(6);
  });

  it("пересчитывается при изменении источника", () => {
    const source = ref(1);
    const mapped = map(source, (v) => v + 1);

    expect(mapped.get()).toBe(2);

    source.set(5);

    expect(mapped.get()).toBe(6);
  });
});

describe("filter", () => {
  it("не вызывает filter при создании", () => {
    const source = ref(3);
    const mapper = vi.fn((v: number) => v > 2);

    filter(source, mapper);

    expect(mapper).not.toHaveBeenCalled();
  });

  it("фильтрует значение источника", () => {
    const source = ref(3);
    const filtered = filter(source, (v) => v > 2);

    expect(filtered.get()).toBe(3);
  });

  it("пересчитывается при изменении источника", () => {
    const source = ref(2);
    const filtered = filter(source, (v) => v > 1);

    expect(filtered.get()).toBe(2);

    source.set(1);

    expect(filtered.get()).toBe(undefined);
  });
});

describe("when", () => {
  it("не вызывает when при создании", () => {
    const source = ref(false);
    const ifFn = vi.fn(() => 1);
    const elseFn = vi.fn(() => 0);

    when(source, ifFn, elseFn);

    expect(ifFn).not.toHaveBeenCalled();
    expect(elseFn).not.toHaveBeenCalled();
  });

  it("возвращает значение коллбека {thenFn} если сигнал {true} значение источника", () => {
    const source = ref(true);
    const thenFn = vi.fn(() => 1);
    const elseFn = vi.fn(() => 0);

    const whenOperator = when(source, thenFn, elseFn);

    expect(whenOperator.get()).toBe(1);
  });

  it("возвращает значение коллбека {elseFn} если сигнал {false} значение источника", () => {
    const source = ref(false);
    const thenFn = vi.fn(() => 1);
    const elseFn = vi.fn(() => 0);

    const whenOperator = when(source, thenFn, elseFn);

    expect(whenOperator.get()).toBe(0);
  });
});

describe("pick", () => {
  it("возвращает значение поля", () => {
    const source = ref({ a: 1 });

    const pickOperator = pick(source, "a");

    expect(pickOperator.get()).toBe(1);
  });

  it("возвращает значение вложенного", () => {
    const source = ref({ a: { b: 1 } });

    const pickOperator = pick(source, "a.b");

    expect(pickOperator.get()).toBe(1);
  });
});
