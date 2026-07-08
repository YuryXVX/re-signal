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

  it("уведомляет подписчиков при изменении зависимости", async () => {
    const a = ref(1);
    const doubled = computed(() => a.get() * 2);
    const listener = vi.fn();

    doubled.get();
    doubled.subscribe(listener);
    a.set(2);

    await flushEffects();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(doubled.get()).toBe(4);
  });

  it("isComputed определяет computed-объект", () => {
    const a = ref(1);
    const c = computed(() => a.get());

    expect(isComputed(c)).toBe(true);
    expect(isComputed(a)).toBe(false);
    expect(isComputed(null)).toBe(false);
  });
});
