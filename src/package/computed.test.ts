import { describe, expect, it, vi } from "vitest";
import { computed, isComputed } from "./computed.ts";
import { ref } from "./signal.ts";

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Computed", () => {
  it("вычисляет производное значение", () => {
    const a = ref(2);
    const doubled = computed(() => a.get() * 2);

    expect(doubled.get()).toBe(4);
  });

  it("пересчитывается при изменении зависимости", async () => {
    const a = ref(1);
    const doubled = computed(() => a.get() * 2);

    expect(doubled.get()).toBe(2);

    a.set(3);
    await flushEffects();

    expect(doubled.get()).toBe(6);
  });

  it("кэширует значение без изменения зависимостей", () => {
    const fn = vi.fn(() => 10);
    const c = computed(fn);

    expect(c.get()).toBe(10);
    expect(c.get()).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("уведомляет подписчиков свежим значением", async () => {
    const a = ref(1);
    const doubled = computed(() => a.get() * 2);
    const listener = vi.fn();

    doubled.get();
    doubled.subscribe(listener);
    a.set(2);

    await flushEffects();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(4);
    expect(doubled.get()).toBe(4);
  });

  it("не зацикливается если subscribe-listener вызывает get()", () => {
    const a = ref(0);
    const doubled = computed(() => a.get() * 2);
    let calls = 0;

    doubled.get();
    doubled.subscribe(() => {
      calls++;
      doubled.get();
    });

    a.set(1);
    a.set(2);

    expect(calls).toBe(2);
    expect(doubled.get()).toBe(4);
  });

  it("isComputed определяет computed-объект по brand", () => {
    const a = ref(1);
    const c = computed(() => a.get());

    expect(isComputed(c)).toBe(true);
    expect(isComputed(a)).toBe(false);
    expect(isComputed(null)).toBe(false);
  });

  it("без наблюдателей не каскадит до get", () => {
    const a = ref(1);
    const fn = vi.fn(() => a.get() * 2);
    const c = computed(fn);

    c.get();
    expect(fn).toHaveBeenCalledTimes(1);

    a.set(5);
    // dirty, но без observers — recompute отложен
    expect(fn).toHaveBeenCalledTimes(1);

    expect(c.get()).toBe(10);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("equals на computed", () => {
    const a = ref(1);
    const c = computed(() => ({ n: a.get() }), {
      equals: (x, y) => x.n === y.n,
    });
    const listener = vi.fn();

    c.subscribe(listener);
    expect(listener).not.toHaveBeenCalled();

    a.set(1);
    // Object.is на signal — same number, no invalidate
    expect(listener).not.toHaveBeenCalled();

    a.set(2);
    expect(listener).toHaveBeenCalled();
    expect(c.get().n).toBe(2);
  });
});
