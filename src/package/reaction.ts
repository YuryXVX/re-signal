import { asStop, Effect, untrack } from "./effect.ts";
import type { Stop } from "./types.ts";

type TrackFn<T> = () => T;
type EffectFn<T> = (value: T, prev: T | undefined) => void;

export function reaction<T>(track: TrackFn<T>, effect: EffectFn<T>): Stop {
  let prev: T | undefined = undefined;

  const runner = new Effect(() => {
    const value = track();

    untrack(() => {
      effect(value, prev);
      prev = value;
    });
  });

  runner.run();

  return asStop(() => runner.dispose());
}
