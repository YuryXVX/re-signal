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

export function get<T, P extends Path<T>>(o: T, path: P): PathValue<T, P> {
  return (path as string).split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, o) as PathValue<T, P>;
}
