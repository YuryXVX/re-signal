# Readable

**Файл:** `types.ts` (interface), используется в `operators.ts`  
**Роль:** общий контракт «можно прочитать и подписаться» — не отдельная нода графа.

---

## Интерфейс

```ts
interface Readable<T> {
  get(): T
  subscribe(listener: Listener<T>): () => void
}
```

---

## Кто реализует

| Компонент | `get()` | `subscribe()` | Примечание |
|-----------|---------|---------------|------------|
| **Signal** | значение | push, без track | первичный источник |
| **Computed** | кэш + recompute | notify при изменении | производное |
| **Derived** | через computed | через computed | lazy wrapper |
| map / filter / pick / when / pipe / combine | через Derived | через Derived | operators |

`ISignal` / `IComputed` шире (`set`, `unsubscribe`, …), но оба совместимы с `Readable` по `get` + `subscribe`.

---

## Зачем нужен

Operators принимают `Readable<T>`, а не только `Signal`:

```ts
map(source: Readable<T>, fn): Readable<U>
filter(source: Readable<T>, pred): Readable<T | undefined>
pipe(source: Readable<T>, ...ops): Readable<...>
combine(sources, combiner): Readable<...>
```

Это позволяет строить **цепочки**:

```ts
ref(1) → map → filter → pipe → combine → effect
         ↑       ↑
      Readable на каждом шаге
```

---

## get vs subscribe

| | `get()` | `subscribe(fn)` |
|--|---------|-----------------|
| Track deps | да (если внутри computed/effect) | активирует Derived/Computed, fn слушает результат |
| Когда читать | pull по запросу | push при изменении |
| Unsubscribe | — | возвращает `() => void` |

---

## В графе зависимостей

`Readable` — **тип**, не узел. В графе реальные узлы:

```
Signal | Computed | (lazy Computed внутри Derived)
```

---

## Operator

```ts
type Operator<T, U> = (source: Readable<T>) => Readable<U>
```

Каррированные формы (`mapOp`, `filterOp`, `pickOp`) удобны для `pipe` и inline-entry в `combine`.

Типовая математика цепочек: `PipeOut`, `CombineValues`, `CombineRecordValues` в `types.ts`.

---

## Пример цепочки

```ts
const a = ref(1)

const pipeline = pipe(
  a,
  mapOp(v => v * 2),
  filterOp(v => v > 5)
)

effect(() => {
  console.log(pipeline.get())  // T | undefined
})
```

Внутри:

```
Readable pipeline
  = Derived(filter)
      └─ Readable = Derived(map)
           └─ Readable = Signal a
```
