import { useEffect, useRef, useState } from "react";
import {
  computed,
  effect,
  ref,
  type Computed,
  type Signal,
} from "../../src/package/index.ts";

type SourceValue<S> = S extends { get(): infer V } ? NonNullable<V> : never;

/**
 * Читает Signal/Computed в React.
 * Через effect библиотеки (не useSyncExternalStore):
 * обновление приходит микротаском и не ре-ентерит notify/set.
 */
export function useSignal<S extends { get(): unknown }>(source: S): SourceValue<S> {
  type T = SourceValue<S>;
  const [value, setValue] = useState<T>(() => source.get() as T);

  useEffect(() => {
    return effect(() => {
      setValue(source.get() as T);
    });
  }, [source]);

  return value;
}

/** Signal, созданный один раз на жизнь компонента. */
export function useSignalRef<T>(initial: T): Signal<T> {
  const slot = useRef<Signal<T> | null>(null);
  if (slot.current === null) slot.current = ref(initial);
  return slot.current;
}

export function useComputedRef<T>(fn: () => T): Computed<T> {
  const slot = useRef<Computed<T> | null>(null);
  if (slot.current === null) slot.current = computed(fn);
  return slot.current;
}
