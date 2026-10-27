/**
 * Пример:
 *   fromValue / from / map / getValue / updateValue
 *
 * Через API re-signal:
 *   ref / combine / map (или pipe + mapOp) / get / set
 *
 * Запуск:
 *   cd example && npm run combine
 */
import { combine, map, ref } from "../../src/package/index.ts";

const a = ref(1); // fromValue(1)
const b = ref(2); // fromValue(2)

// from(a, b) — связка источников в один Readable<[number, number]>
const c = combine([a, b], (values) => values);

// from(c).map((aValue, bValue) => aValue + bValue + 5)
const d = map(c, (pair) => {
  const [aValue, bValue] = pair;
  return aValue + bValue + 5;
});

console.log(a.get()); // 1
console.log(b.get()); // 2
console.log(c.get()); // [1, 2]
console.log(d.get()); // 8

a.set(a.get() + 10);

console.log(a.get()); // 11
console.log(b.get()); // 2
console.log(d.get()); // 18
