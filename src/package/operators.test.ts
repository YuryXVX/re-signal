import { describe, expect, it } from "vitest";
import { map } from "./operators.ts";
import { ref } from "./signal.ts";

describe("map", () => {
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

  it("лениво создаёт computed при первом get", () => {
    const source = ref(10);
    const mapped = map(source, (v) => v.toString());

    expect(mapped.get()).toBe("10");
  });
});
