import { Option, type Option as OptionT } from "./option.ts";

export type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...0[]];
type Join<K extends string | number, P extends string> = `${K}.${P}`;

export type Path<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends object
    ? {
        [K in keyof T & (string | number)]:
          | `${K}`
          | (Path<T[K], Prev[D]> extends infer P
              ? P extends string
                ? Join<K, P>
                : never
              : never);
      }[keyof T & (string | number)]
    : never;

export type PathValue<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    Key extends `${infer K extends keyof T}`
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

/** Достаёт path; отсутствующий ключ → None. */
export function get<T, P extends Path<T>>(
  o: T,
  path: P,
): OptionT<PathValue<T, P>> {
  let acc: unknown = o;

  for (const key of (path as string).split(".")) {
    if (acc !== null && typeof acc === "object" && key in (acc as object)) {
      acc = (acc as Record<string, unknown>)[key];
    } else {
      return Option.none;
    }
  }

  return Option.some(acc as PathValue<T, P>);
}
