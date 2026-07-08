import { describe, expect, it, vi } from "vitest";
import { reaction } from "./reaction.ts";
import { ref } from "./signal.ts";

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("reaction", () => {
  it("вызывает effect с текущим и предыдущим значением", async () => {
    const a = ref(1);
    const effectFn = vi.fn();

    reaction(
      () => a.get(),
      (value, prev) => effectFn(value, prev),
    );

    expect(effectFn).toHaveBeenCalledWith(1, undefined);

    a.set(2);

    await flushEffects();

    expect(effectFn).toHaveBeenCalledWith(2, 1);
  });

  it("перезапускается при изменении отслеживаемого значения", async () => {
    const a = ref("a");
    const effectFn = vi.fn();

    reaction(
      () => a.get(),
      (value) => effectFn(value),
    );

    a.set("b");

    await flushEffects();

    expect(effectFn).toHaveBeenCalledTimes(2);
    expect(effectFn).toHaveBeenLastCalledWith("b");
  });

  it("dispose останавливает реакцию", async () => {
    const a = ref(1);
    const effectFn = vi.fn();

    const dispose = reaction(
      () => a.get(),
      (value) => effectFn(value),
    );

    dispose();
    a.set(2);

    await flushEffects();

    expect(effectFn).toHaveBeenCalledTimes(1);
  });
});
