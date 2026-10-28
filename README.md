# re-signal

Лёгкая реактивная (push-pull) библиотека на TypeScript с ленивыми вычислениями, эффектами, операторами и полной типобезопасностью.

---

## Особенности

- **Push-pull реактивность** — инвалидация при записи, пересчёт при чтении (как Vue 3, Solid, MobX)
- **Ленивые `Computed`** — пересчитываются только при `get()` и только если данные изменились
- **Автоматический трекинг зависимостей** — не нужно вручную объявлять deps
- **Операторы и `pipe`** — функциональные цепочки трансформаций с выводом типов
- **`Option<T>` и `Result<T, E>`** — встроенные контейнеры для безопасной работы с отсутствующими значениями и ошибками
- **Async-итераторы** — `for await…of` по сигналам и computed-значениям
- **Explicit Resource Management** — `using` / `[Symbol.dispose]` для автоматической очистки
- **Batch и untrack** — контроль над таймингом и scope подписок
- **Zero runtime dependencies** — только TypeScript и стандартные API

---

## Быстрый старт

### Signal — источник данных

```ts
import { ref, effect } from "re-signal";

const count = ref(0);

// Эффект автоматически подпишется на count
effect(() => {
  console.log("count =", count.get());
});

count.set(1); // → count = 1
count.update((v) => v + 1); // → count = 2
```

### Computed — производное значение

```ts
import { ref, computed } from "re-signal";

const a = ref(1);
const b = ref(2);

const sum = computed(() => a.get() + b.get());

console.log(sum.get()); // 3
a.set(10);
console.log(sum.get()); // 12
```

### Operators и pipe

```ts
import { ref, pipe, mapOp, pickOp, unwrapOrOp, combine } from "re-signal";

const user = ref({ name: "Alice", age: 30 });

const age = pipe(
  user,
  pickOp("age"),
  unwrapOrOp(0),
);

console.log(age.get()); // 30

// Комбинирование нескольких источников
const firstName = ref("Alice");
const lastName = ref("Smith");

const fullName = combine(
  [firstName, lastName] as const,
  ([first, last]) => `${first} ${last}`,
);

console.log(fullName.get()); // "Alice Smith"
```

### Effect с cleanup

```ts
import { ref, effect } from "re-signal";

const query = ref("");

const stop = effect(() => {
  const q = query.get();
  const id = setTimeout(() => fetch(`/search?q=${q}`), 300);

  // cleanup вызывается перед каждым rerun и при dispose
  return () => clearTimeout(id);
});

// Остановить эффект
stop();
```

### Reaction — track + untracked effect

```ts
import { ref, reaction } from "re-signal";

const count = ref(0);

const stop = reaction(
  () => count.get(),           // track-часть
  (value, prev) => {           // effect-часть (untracked)
    console.log(`${prev} → ${value}`);
  },
);

count.set(5); // → 0 → 5
```

---

## API

### Signal

| Метод | Описание |
|-------|----------|
| `get()` | Прочитать значение; зарегистрировать зависимость в контексте track |
| `peek()` | Прочитать значение без регистрации зависимости |
| `set(value)` | Записать значение; при изменении уведомить подписчиков |
| `update(fn)` | Обновить значение через функцию |
| `subscribe(fn)` | Push-подписка; `fn` вызывается sync при каждом `set()` |
| `unsubscribe(fn)` | Отписать конкретного слушателя |
| `dispose()` / `[Symbol.dispose]()` | Уничтожить сигнал, отписать всех |

### Computed

| Метод | Описание |
|-------|----------|
| `get()` | Вернуть кэш; пересчитать, если `#dirty` или первый вызов |
| `peek()` | Вернуть кэш без track |
| `subscribe(fn)` | Подписаться на изменения результата |
| `invalidate()` | Пометить как устаревший, уведомить downstream |
| `dispose()` / `[Symbol.dispose]()` | Очистить все зависимости |

### Effect

| Функция | Описание |
|---------|----------|
| `effect(fn)` | Создать эффект; возвращает `Stop`-функцию с `[Symbol.dispose]` |
| `batch(fn)` | Несколько `set()` → один flush в конце |
| `untrack(fn)` | Выполнить `fn`, читая значения без создания подписок |
| `onCleanup(fn)` | Зарегистрировать teardown внутри текущего эффекта |
| `reaction(track, effect)` | Отслеживать `track`, вызывать `effect(value, prev)` вне track |

### Operators

| Функция | Описание |
|---------|----------|
| `derive(fn)` | Ленивый `Computed` (alias) |
| `map(source, fn)` | Трансформация значения |
| `filter(source, pred)` | `Option<T>` — `Some` если pred true, иначе `None` |
| `filterMap(source, fn)` | `map + Option` за один проход |
| `when(cond, then, else)` | Условное ветвление |
| `pick(source, path)` | Безопасный доступ по пути `"a.b.c"` → `Option` |
| `mapSome(source, fn)` | `Option.map` над `Readable<Option<T>>` |
| `andThen(source, fn)` | `Option.flatMap` над `Readable<Option<T>>` |
| `unwrapOr(source, fallback)` | Раскрыть `Option` с fallback |
| `tryMap(source, fn)` | `Result` — исключение → `Err` |
| `mapResult(source, fn)` | `Result.map` |
| `unwrapResultOr(source, fallback)` | Раскрыть `Result` с fallback |
| `mapItems(source, fn)` | `map` над `Iterable` внутри сигнала |
| `filterItems(source, pred)` | `filter` над `Iterable` внутри сигнала |
| `pipe(source, ...ops)` | Левоассоциативная композиция операторов |
| `combine(sources, combiner)` | Склеить массив или запись `Readable` в одно значение |

### Option и Result

```ts
import { Option, Result } from "re-signal";

// Option
const maybe = Option.some(42);
const doubled = Option.map(maybe, (v) => v * 2); // Some(84)
const value = Option.unwrapOr(Option.none, 0);   // 0

// Result
const res = Result.fromThrowable(() => JSON.parse('{"a":1}'));
const mapped = Result.map(res, (obj) => obj.a); // Ok(1)
```

### Итераторы

```ts
import { ref, iterate, each, effect } from "re-signal";

// Async итератор по изменениям
const count = ref(0);
for await (const v of count) {
  console.log(v);
  if (v >= 3) break;
}

// Sync итератор внутри effect
const list = ref(["a", "b", "c"]);
effect(() => {
  for (const item of each(list)) {
    console.log(item);
  }
});
```

---

## Примеры

### React

```tsx
// useSignal.ts
import { useEffect, useRef, useState } from "react";
import { computed, effect, ref, type Signal, type Computed } from "re-signal";

export function useSignal<S extends { get(): unknown }>(source: S) {
  const [value, setValue] = useState(() => source.get());
  useEffect(() => effect(() => setValue(source.get())), [source]);
  return value;
}

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

// Counter.tsx
export function Counter() {
  const count = useSignalRef(0);
  const doubled = useComputedRef(() => count.get() * 2);

  const value = useSignal(count);
  const doubledValue = useSignal(doubled);

  return (
    <div>
      <button onClick={() => count.set(count.get() - 1)}>−</button>
      <span>{value}</span>
      <button onClick={() => count.set(count.get() + 1)}>+</button>
      <p>× 2 = {doubledValue}</p>
    </div>
  );
}
```

### Нативный DOM

```ts
import { computed, effect, ref } from "re-signal";

const count = ref(0);
const parity = computed(() => (count.get() % 2 === 0 ? "чётное" : "нечётное"));

effect(() => {
  document.querySelector("#count")!.textContent = String(count.get());
});

effect(() => {
  document.querySelector("#parity")!.textContent = parity.get();
});

document.querySelector("#inc")!.addEventListener("click", () => {
  count.set(count.get() + 1);
});
```

### Explicit Resource Management (`using`)

```ts
import { ref, effect, computed } from "re-signal";

{
  using a = ref(1);
  using b = ref(2);
  using sum = computed(() => a.get() + b.get());
  using stop = effect(() => console.log(sum.get()));

  a.set(10); // эффект сработает
} // автоматически вызовется dispose для всех
```

---

## Архитектура

```
┌─────────────────────────────────────────────┐
│  PUSH — инвалидация при записи              │
│  Signal.set() → invalidate → scheduleEffect │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│  PULL — вычисление при чтении               │
│  get() → recompute если dirty → cache       │
└─────────────────────────────────────────────┘
```

- **Signal** — leaf-узел, хранит значение, единственная точка записи
- **Computed** — производное значение с кэшем и lazy-пересчётом
- **Effect** — side effects с автоматическим перезапуском и cleanup
- **Runtime** — effect stack + scheduler (microtask) + batch/untrack

Подробнее см. [`src/package/docs/`](./src/package/docs/).

---

## Скрипты

```bash
npm run dev         # nodemon — разработка
npm run build       # vite build — сборка библиотеки
npm run test        # vitest — тесты в watch-режиме
npm run test:run    # vitest run — тесты один раз
npm run bench       # vitest bench — бенчмарки
npm run bench:watch # vitest bench — бенчмарки в watch
```


