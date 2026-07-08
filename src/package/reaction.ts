import { Effect, untrack } from "./effect.ts";

type TrackFn<T> = () => T;
type EffectFn<T> = (value: T, prev: T | undefined) => void;

export function reaction<T>(track: TrackFn<T>, effect: EffectFn<T>) {
  let prev: T | undefined = undefined;

  const runner = new Effect(() => {
    const value = track();

    untrack(() => {
      effect(value, prev);
      prev = value;
    });
  });

  runner.run();

  return () => runner.dispose();
}
