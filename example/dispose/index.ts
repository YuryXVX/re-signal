/**
 * Деструкторы: dispose() и Symbol.dispose (`using`).
 *
 * Запуск:
 *   cd example && npm run dispose
 */
import { computed, effect, ref } from "../../src/package/index.ts";

const a = ref(1);
const b = ref(2);
const sum = computed(() => a.get() + b.get());

const logs: number[] = [];

{
  using _a = a;
  using _b = b;
  using _sum = sum;
  using stop = effect(() => {
    logs.push(sum.get() ?? 0);
  });

  console.log("before", sum.get()); // 3
  a.set(10);
  await Promise.resolve();
  await Promise.resolve();
  console.log("after set", logs.at(-1)); // 12
  void stop;
}

a.set(100);
await Promise.resolve();
await Promise.resolve();

console.log("logs after dispose", logs);
console.log("done");
