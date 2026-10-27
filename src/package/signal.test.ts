import { describe, expect, it, vi } from "vitest";
import { computed } from "./computed.ts";
import { peek, ref, Signal } from "./signal.ts";

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Signal", () => {
  it("создаёт сигнал с начальным значением", () => {
    const signal = new Signal(42);

    expect(signal.get()).toBe(42);
  });

  it("ref создаёт сигнал с начальным значением", () => {
    expect(ref("hello").get()).toBe("hello");
  });

  it("set обновляет значение", () => {
    const signal = ref(1);

    signal.set(2);

    expect(signal.get()).toBe(2);
  });

  it("set с тем же значением не уведомляет подписчиков", () => {
    const signal = ref(1);
    const listener = vi.fn();

    signal.subscribe(listener);
    signal.set(1);

    expect(listener).not.toHaveBeenCalled();
  });

  it("subscribe вызывает listener при изменении", async () => {
    const signal = ref(1);
    const listener = vi.fn();

    signal.subscribe(listener);
    signal.set(2);

    await flushEffects();

    expect(listener).toHaveBeenCalledWith(2);
  });

  it("unsubscribe прекращает уведомления", async () => {
    const signal = ref(1);
    const listener = vi.fn();
    const unsubscribe = signal.subscribe(listener);

    unsubscribe();
    signal.set(2);

    await flushEffects();

    expect(listener).not.toHaveBeenCalled();
  });

  it("update применяет updater", () => {
    const signal = ref(1);
    signal.update((n) => n + 10);
    expect(signal.get()).toBe(11);
  });

  it("peek не трекает в computed", () => {
    const a = ref(1);
    const b = ref(10);
    let reads = 0;

    const c = computed(() => {
      reads++;
      return a.get() + peek(b);
    });

    expect(c.get()).toBe(11);
    b.set(100);
    expect(c.get()).toBe(11);
    expect(reads).toBe(1);

    a.set(2);
    expect(c.get()).toBe(102);
    expect(reads).toBe(2);
  });

  it("equals подавляет notify", () => {
    const signal = ref(
      { n: 1 },
      { equals: (a, b) => a.n === b.n },
    );
    const listener = vi.fn();
    signal.subscribe(listener);

    signal.set({ n: 1 });
    expect(listener).not.toHaveBeenCalled();

    signal.set({ n: 2 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
