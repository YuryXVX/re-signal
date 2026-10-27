import { EFFECT_BRAND, forEachSnapshot } from "./runtime.ts";
import type { Ctx, EffectCallback, IEffect, Source, Stop } from "./types.ts";

const UNTRACKED = Symbol("UNTRACKED");
let isFlushing = false;
let flushScheduled = false;

type Context = Ctx | typeof UNTRACKED;

const ctx: Context[] = [];
const pendingEffects = new Set<IEffect>();
let batchDepth = 0;

/** Оборачивает teardown в callable + `[Symbol.dispose]` для `using`. */
export function asStop(dispose: () => void): Stop {
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    dispose();
  };

  const stop = (() => once()) as Stop;
  stop[Symbol.dispose] = once;
  return stop;
}

export class Effect implements IEffect {
  readonly [EFFECT_BRAND] = true as const;

  #fn: EffectCallback;
  #cleanup: (() => void) | null = null;
  #cleanups = new Set<() => void>();
  #sources = new Set<Source<unknown>>();
  #disposed = false;

  constructor(fn: EffectCallback) {
    this.#fn = fn;
  }

  run() {
    if (this.#disposed) return;

    if (this.#cleanup != null) {
      this.#cleanup();
      this.#cleanup = null;
    }

    this.#disposeCleanup();
    this.#disposeSubscribers();

    pushEffect(this);

    const cleanup = this.#fn();

    if (typeof cleanup === "function") this.#cleanup = cleanup;

    popEffect();
  }

  dispose() {
    if (this.#disposed) return;

    this.#disposed = true;

    if (this.#cleanup != null) {
      this.#cleanup();
      this.#cleanup = null;
    }

    this.#disposeCleanup();
    this.#disposeSubscribers();
  }

  [Symbol.dispose]() {
    this.dispose();
  }

  addSources<T>(source: Source<T>) {
    this.#sources.add(source);
  }

  addCleanup(fn: () => void) {
    this.#cleanups.add(fn);
  }

  #disposeCleanup() {
    forEachSnapshot(this.#cleanups, (fn) => fn());
    this.#cleanups.clear();
  }

  #disposeSubscribers() {
    forEachSnapshot(this.#sources, (source) => source.unsubscribe(this));
    this.#sources.clear();
  }
}

export function isEffect(value: unknown): value is Effect {
  return (
    typeof value === "object" &&
    value !== null &&
    EFFECT_BRAND in (value as object)
  );
}

export function getCurrentEffect() {
  const effect = ctx.at(-1);
  if (effect === UNTRACKED) return null;
  return effect ?? null;
}

export function pushEffect(fn: Context) {
  ctx.push(fn);
}

export function popEffect() {
  ctx.pop();
}

export function onCleanup(fn: () => void) {
  const current = getCurrentEffect();
  if (current && isEffect(current)) {
    current.addCleanup(fn);
  }
}

export function effect(fn: EffectCallback): Stop {
  const runner = new Effect(fn);
  runner.run();
  return asStop(() => runner.dispose());
}

export function scheduleEffect(effect: IEffect) {
  pendingEffects.add(effect);

  if (batchDepth > 0) return;

  if (!flushScheduled) {
    flushScheduled = true;
    queueMicrotask(() => {
      flushScheduled = false;
      flush();
    });
  }
}

function flush() {
  if (isFlushing) return;
  isFlushing = true;

  try {
    while (pendingEffects.size > 0) {
      forEachSnapshot(pendingEffects, (effect) => {
        pendingEffects.delete(effect);
        effect.run();
      });
    }
  } finally {
    isFlushing = false;
  }
}

export function batch(fn: () => void) {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) flush();
  }
}

export function untrack<T>(fn: () => T) {
  pushEffect(UNTRACKED);
  try {
    return fn();
  } finally {
    popEffect();
  }
}
