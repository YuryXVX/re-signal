import { describe, expect, it, vi } from "vitest";
import { batch, effect, onCleanup, untrack } from "./effect.ts";
import { ref } from "./signal.ts";

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Effect", () => {
  it("запускается сразу при создании", () => {
    const fn = vi.fn();

    effect(fn);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("перезапускается при изменении зависимости", async () => {
    const a = ref(1);
    const fn = vi.fn(() => {
      a.get();
    });

    effect(fn);
    a.set(2);

    await flushEffects();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("dispose останавливает эффект", async () => {
    const a = ref(1);
    const fn = vi.fn(() => {
      a.get();
    });

    const dispose = effect(fn);
    dispose();
    a.set(2);

    await flushEffects();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("batch группирует обновления в один flush", async () => {
    const a = ref(1);
    const b = ref(10);
    const fn = vi.fn(() => {
      a.get();
      b.get();
    });

    effect(fn);

    batch(() => {
      a.set(2);
      b.set(20);
    });

    await flushEffects();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("untrack не отслеживает зависимости внутри callback", async () => {
    const a = ref(1);
    const b = ref(10);
    const fn = vi.fn(() => {
      a.get();
      untrack(() => b.get());
    });

    effect(fn);
    b.set(20);

    await flushEffects();

    expect(fn).toHaveBeenCalledTimes(1);

    a.set(2);

    await flushEffects();

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("onCleanup вызывается при перезапуске и dispose", async () => {
    const a = ref(1);
    const cleanup = vi.fn();

    const dispose = effect(() => {
      a.get();
      onCleanup(cleanup);
    });

    a.set(2);

    await flushEffects();

    expect(cleanup).toHaveBeenCalledTimes(1);

    dispose();

    expect(cleanup).toHaveBeenCalledTimes(2);
  });

  it("возвращает cleanup из callback эффекта", async () => {
    const a = ref(1);
    const cleanup = vi.fn();

    const dispose = effect(() => {
      a.get();

      return cleanup;
    });

    a.set(2);

    await flushEffects();

    expect(cleanup).toHaveBeenCalledTimes(1);

    dispose();

    expect(cleanup).toHaveBeenCalledTimes(2);
  });
});
