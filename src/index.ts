import { combine, effect, mapOp, pickOp, ref } from "./package/index.ts";

const a = ref(1);
const b = ref(2);

const result = combine(
  [
    [
      a,
      mapOp((v) => {
        return { v: v + 100 };
      }),

      pickOp("v"),
    ],
    b,
  ],
  ([x, y]) => x + y,
);

effect(() => console.log(result.get()));

a.set(200);
b.set(100);
