import { bench, describe } from "vitest";
import {
  batch,
  combine,
  computed,
  effect,
  filterOp,
  map,
  mapOp,
  peek,
  pipe,
  ref,
  unwrapOrOp,
} from "../index.ts";

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("signal", () => {
  bench("ref + get", () => {
    const a = ref(0);
    a.get();
  });

  bench("peek", () => {
    const a = ref(0);
    a.peek();
  });

  bench("set (same value, no notify)", () => {
    const a = ref(1);
    a.set(1);
  });

  bench("set (changing value)", () => {
    const a = ref(0);
    a.set(a.peek() + 1);
  });

  bench("update", () => {
    const a = ref(0);
    a.update((n) => n + 1);
  });

  bench("subscribe + set + unsubscribe", () => {
    const a = ref(0);
    let sink = 0;
    const stop = a.subscribe((v) => {
      sink = v;
    });
    a.set(1);
    stop();
    void sink;
  });
});

describe("computed", () => {
  bench("create + first get", () => {
    const a = ref(1);
    const c = computed(() => a.get() * 2);
    c.get();
  });

  bench("cached get (hot)", () => {
    const a = ref(1);
    const c = computed(() => a.get() * 2);
    c.get();
    c.get();
    c.get();
  });

  bench("dirty recompute", () => {
    const a = ref(1);
    const c = computed(() => a.get() * 2);
    c.get();
    a.set(2);
    c.get();
  });

  bench("chain depth 10", () => {
    const head = ref(1);
    let node: { get(): number | undefined } = head;
    for (let i = 0; i < 10; i++) {
      const prev = node;
      node = computed(() => (prev.get() ?? 0) + 1);
    }
    node.get();
    head.set(2);
    node.get();
  });
});

describe("effect", () => {
  bench("create effect (sync first run)", () => {
    const a = ref(0);
    const stop = effect(() => {
      a.get();
    });
    stop();
  });

  bench("set → schedule → flush", async () => {
    const a = ref(0);
    let sink = 0;
    const stop = effect(() => {
      sink = a.get();
    });
    a.set(1);
    await flush();
    stop();
    void sink;
  });

  bench("batch 10 sets → 1 flush", async () => {
    const a = ref(0);
    let runs = 0;
    const stop = effect(() => {
      a.get();
      runs++;
    });
    batch(() => {
      for (let i = 0; i < 10; i++) a.set(i);
    });
    await flush();
    stop();
    void runs;
  });
});

describe("operators", () => {
  bench("map get", () => {
    const a = ref(1);
    const m = map(a, (v) => v * 2);
    m.get();
  });

  bench("pipe map → filter → unwrapOr", () => {
    const a = ref(3);
    const p = pipe(
      a,
      mapOp((v) => v * 2),
      filterOp((v) => v > 0),
      unwrapOrOp(0),
    );
    p.get();
    a.set(4);
    p.get();
  });

  bench("combine 5 signals", () => {
    const xs = Array.from({ length: 5 }, (_, i) => ref(i));
    const sum = combine(xs, (values) =>
      values.reduce((acc, v) => acc + v, 0),
    );
    sum.get();
    xs[0]!.set(10);
    sum.get();
  });
});

describe("fan-out", () => {
  bench("1 signal → 100 computeds get", () => {
    const a = ref(1);
    const cs = Array.from({ length: 100 }, () => computed(() => a.get() + 1));
    for (const c of cs) c.get();
    a.set(2);
    for (const c of cs) c.get();
  });

  bench("1 signal → 50 effects flush", async () => {
    const a = ref(0);
    let sink = 0;
    const stops = Array.from({ length: 50 }, () =>
      effect(() => {
        sink += a.get();
      }),
    );
    a.set(1);
    await flush();
    for (const stop of stops) stop();
    void sink;
  });
});

describe("baseline (plain JS)", () => {
  bench("plain object read/write", () => {
    const o = { v: 0 };
    o.v = o.v + 1;
    void o.v;
  });

  bench("plain closure capture", () => {
    let v = 0;
    const get = () => v;
    const set = (n: number) => {
      v = n;
    };
    set(get() + 1);
  });
});

describe("memory churn", () => {
  bench("create/dispose 100 effects", () => {
    const a = ref(0);
    const stops = Array.from({ length: 100 }, () =>
      effect(() => {
        peek(a);
      }),
    );
    for (const stop of stops) stop();
  });

  bench("create/dispose 100 computeds", () => {
    const a = ref(0);
    const cs = Array.from({ length: 100 }, () => computed(() => a.get()));
    for (const c of cs) {
      c.get();
      c.dispose();
    }
  });
});
