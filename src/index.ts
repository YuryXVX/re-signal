import {
  combine,
  effect,
  mapOp,
  pickOp,
  pipe,
  ref,
  unwrapOrOp,
} from "./package/index.ts";

const a = ref(1);
const b = ref(2);

const result = combine(
  [
    pipe(
      a,
      mapOp((v: number) => ({ v: v + 100 })),
      pickOp("v"),
      unwrapOrOp(0),
    ),
    b,
  ] as const,
  ([x, y]: readonly [number, number]) => x + y,
);

effect(() => console.log(result.get()));

a.set(200);
b.set(100);
