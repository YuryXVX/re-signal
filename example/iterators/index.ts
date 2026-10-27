/**
 * Sync / async итераторы и генераторы + re-signal
 *
 * Запуск:
 *   cd example && npm run iterators
 */
import {
  computed,
  each,
  effect,
  filterItems,
  iterate,
  mapItems,
  ref,
} from "../../src/package/index.ts";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

console.log("\n=== 1. Sync: each + for…of внутри effect ===");

const list = ref(["a", "b", "c"]);

effect(() => {
  const items: string[] = [];
  for (const item of each(list)) items.push(item);
  console.log("each:", items.join(", "));
});

const upper = mapItems(list, (s) => s.toUpperCase());
const short = filterItems(list, (s) => s.length === 1);
console.log("mapItems:", upper.get());
console.log("filterItems:", short.get());

list.set(["x", "yy", "z"]);
await Promise.resolve();
await Promise.resolve();
console.log("upper after:", upper.get());

console.log("\n=== 2. Async: iterate() + AbortSignal ===");

const count = ref(0);
const ac = new AbortController();

const viaIterate = (async () => {
  for await (const v of iterate(count, { signal: ac.signal })) {
    console.log("iterate:", v);
    if (v >= 2) ac.abort();
  }
  console.log("iterate stopped");
})();

count.set(1);
await sleep(0);
count.set(2);
await viaIterate;

console.log("\n=== 3. for await…of напрямую по Signal (Symbol.asyncIterator) ===");

const ticks = ref(0);
const stream = (async () => {
  const values: number[] = [];
  for await (const v of ticks) {
    values.push(v);
    console.log("for-await signal:", v);
    if (values.length >= 3) break; // finally → unsubscribe
  }
  console.log("collected:", values);
})();

await sleep(0);
ticks.set(10);
await sleep(0);
ticks.set(20);
await stream;

console.log("\n=== 4. AsyncIterator вручную: next / return ===");

const n = ref(100);
const it = n[Symbol.asyncIterator]();

console.log("next:", (await it.next()).value); // 100
n.set(101);
console.log("next:", (await it.next()).value); // 101
await it.return?.(undefined);
n.set(999);
console.log("after return, done:", (await it.next()).done); // true

console.log("\n=== 5. Computed тоже async-iterable ===");

const a = ref(2);
const doubled = computed(() => a.get() * 2);
const cit = doubled[Symbol.asyncIterator]();

console.log("computed:", (await cit.next()).value); // 4
a.set(5);
console.log("computed:", (await cit.next()).value); // 10
await cit.return?.(undefined);

console.log("\n=== 6. Свой async generator поверх сигнала ===");

/** Берёт N следующих значений из Readable (включая текущее). */
async function* take<T>(
  source: AsyncIterable<T>,
  limit: number,
): AsyncGenerator<T> {
  let i = 0;
  for await (const value of source) {
    yield value;
    i++;
    if (i >= limit) return;
  }
}

/** Пауза между значениями — удобно для «тиков». */
async function* paced<T>(
  source: AsyncIterable<T>,
  ms: number,
): AsyncGenerator<T> {
  for await (const value of source) {
    yield value;
    await sleep(ms);
  }
}

const pulse = ref(0);
const consumer = (async () => {
  for await (const v of take(paced(pulse, 30), 3)) {
    console.log("paced take:", v);
  }
  console.log("generator done");
})();

await sleep(0);
pulse.set(1);
await sleep(40);
pulse.set(2);
await sleep(40);
pulse.set(3);
await consumer;

console.log("\n=== 7. Async generator → пишет в signal ===");

async function* countdown(from: number): AsyncGenerator<number> {
  for (let i = from; i >= 0; i--) {
    yield i;
    await sleep(20);
  }
}

const left = ref(-1);

const pumping = (async () => {
  for await (const v of countdown(3)) {
    left.set(v);
    console.log("countdown → signal:", left.get());
  }
})();

await pumping;

console.log("\nall examples done");
