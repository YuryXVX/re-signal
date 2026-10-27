import { describe, expect, it } from "vitest";
import { computed } from "./computed.ts";
import { effect } from "./effect.ts";
import { each, iterate } from "./iterator.ts";
import { filterItems, mapItems } from "./operators.ts";
import { ref } from "./signal.ts";

async function flushEffects() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("iterate / asyncIterator", () => {
  it("сразу отдаёт текущее значение и дальше обновления", async () => {
    const a = ref(1);
    const ac = new AbortController();
    const values: number[] = [];

    const done = (async () => {
      for await (const v of iterate(a, { signal: ac.signal })) {
        values.push(v);
        if (values.length >= 3) ac.abort();
      }
    })();

    await Promise.resolve();
    a.set(2);
    await Promise.resolve();
    a.set(3);
    await done;

    expect(values).toEqual([1, 2, 3]);
  });

  it("Symbol.asyncIterator: next / return отписывает", async () => {
    const a = ref("x");
    const iterator = a[Symbol.asyncIterator]();

    expect((await iterator.next()).value).toBe("x");

    a.set("y");
    expect((await iterator.next()).value).toBe("y");

    await iterator.return?.(undefined);
    a.set("z");
    // после return генератор завершён
    const after = await iterator.next();
    expect(after.done).toBe(true);
  });

  it("Computed тоже async-iterable", async () => {
    const a = ref(2);
    const doubled = computed(() => a.get() * 2);
    const iterator = doubled[Symbol.asyncIterator]();

    expect((await iterator.next()).value).toBe(4);
    a.set(3);
    expect((await iterator.next()).value).toBe(6);
    await iterator.return?.(undefined);
  });
});

describe("each", () => {
  it("итерирует текущую коллекцию и трекает source в effect", async () => {
    const list = ref([1, 2, 3]);
    const seen: number[][] = [];

    effect(() => {
      seen.push([...each(list)]);
    });

    expect(seen).toEqual([[1, 2, 3]]);

    list.set([4, 5]);
    await flushEffects();

    expect(seen.at(-1)).toEqual([4, 5]);
  });
});

describe("mapItems / filterItems", () => {
  it("mapItems проецирует элементы", () => {
    const list = ref([1, 2, 3]);
    const doubled = mapItems(list, (n) => n * 2);

    expect(doubled.get()).toEqual([2, 4, 6]);
  });

  it("filterItems фильтрует элементы", async () => {
    const list = ref([1, 2, 3, 4]);
    const even = filterItems(list, (n) => n % 2 === 0);

    expect(even.get()).toEqual([2, 4]);

    list.set([5, 6, 7]);
    await flushEffects();

    expect(even.get()).toEqual([6]);
  });

  it("работает с computed-коллекцией", () => {
    const a = ref(1);
    const list = computed(() => [a.get(), a.get() + 1] as const);
    const labeled = mapItems(list, (n, i) => `${i}:${n}`);

    expect(labeled.get()).toEqual(["0:1", "1:2"]);
  });
});
