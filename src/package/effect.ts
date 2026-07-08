import type { Ctx, EffectCallback, IEffect, Source } from "./types.ts";

const UNTRACKED = Symbol("UNTRACKED");
let isFlushing = false;
let flushScheduled = false;

type Context = Ctx | typeof UNTRACKED;

// runtime context
const ctx: Context[] = [];

const cleanups: (() => void)[] = [];

// очередь на flush
const pendingEffects = new Set<IEffect | EffectCallback>();

// batch
let batchDepth = 0;

export class Effect implements IEffect {
  #fn: () => void;

  #cleanup: (() => void) | null = null;

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

    this.#sources.forEach((s) => s.unsubscribe(this));
    this.#sources.clear();

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

    this.#sources.forEach((source) => source.unsubscribe(this));
    this.#sources.clear();
  }

  addSources<T>(source: Source<T>) {
    this.#sources.add(source);
  }
}

export function isEffect(ctx: unknown): ctx is Effect {
  return ctx instanceof Effect;
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
  cleanups.push(fn);
}

export function effect(fn: () => void) {
  const effect = new Effect(fn);

  effect.run();

  cleanups.forEach((c) => c());
  cleanups.length = 0;

  return () => effect.dispose();
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
      const copy = [...pendingEffects];

      pendingEffects.clear();

      copy.forEach((effect) => {
        if (isEffect(effect)) effect.run();
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
