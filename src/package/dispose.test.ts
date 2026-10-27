import { describe, expect, it, vi } from "vitest";
import { computed } from "./computed.ts";
import { effect } from "./effect.ts";
import { map } from "./operators.ts";
import { ref } from "./signal.ts";

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("dispose / Symbol.dispose", () => {
  it("Signal.dispose отписывает listeners", async () => {
    const a = ref(1);
    const listener = vi.fn();

    a.subscribe(listener);
    a.dispose();
    a.set(2);

    await flushEffects();

    expect(listener).not.toHaveBeenCalled();
    expect(a.get()).toBe(1);
  });

  it("Computed.dispose отписывается от upstream", async () => {
    const a = ref(1);
    const doubled = computed(() => a.get() * 2);
    const listener = vi.fn();

    expect(doubled.get()).toBe(2);
    doubled.subscribe(listener);
    doubled.dispose();

    a.set(5);
    await flushEffects();

    expect(listener).not.toHaveBeenCalled();
    expect(doubled.get()).toBe(2);
  });

  it("effect Stop поддерживает Symbol.dispose", async () => {
    const a = ref(1);
    const fn = vi.fn(() => {
      a.get();
    });

    {
      using stop = effect(fn);
      void stop;
    }

    a.set(2);
    await flushEffects();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("map/computed.dispose отписывает", async () => {
    const a = ref(1);
    const doubled = map(a, (v) => v * 2);
    const listener = vi.fn();

    doubled.subscribe(listener);
    expect(doubled.get()).toBe(2);

    doubled.dispose?.();
    a.set(3);
    await flushEffects();

    expect(listener).not.toHaveBeenCalled();
  });

  it("using освобождает Signal и Computed", () => {
    const a = ref(0);

    {
      using count = a;
      using doubled = computed(() => count.get() * 2);
      expect(doubled.get()).toBe(0);
    }

    const listener = vi.fn();
    a.subscribe(listener);
    // a уже disposed — subscribe no-op
    a.set(1);
    expect(listener).not.toHaveBeenCalled();
  });
});
