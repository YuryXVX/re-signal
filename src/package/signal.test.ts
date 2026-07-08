import { describe, expect, it, vi } from "vitest";
import { ref, Signal } from "./signal.ts";

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
});
