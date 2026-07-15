# Архитектура реактивности

## Push / Pull — что у нас?

**Да, это гибрид push + pull.** Так же устроены Vue 3, Solid, MobX. Не pure push (как RxJS) и не pure pull (как React render).

```
┌─────────────────────────────────────────────────────────┐
│  PUSH — инвалидация (уведомление «данные устарели»)     │
│  Signal.set() → deps → invalidate / scheduleEffect      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  PULL — вычисление (чтение актуального значения)        │
│  get() → recompute если dirty → вернуть #cacheValue     │
└─────────────────────────────────────────────────────────┘
```

### Push-фаза

Происходит при **записи** (`Signal.set()`):

1. Signal уведомляет `#deps`
2. `#invalidate` у Computed помечает `#dirty = true` и вызывает `notify()`
3. Effect попадает в `pendingEffects` через `scheduleEffect` (microtask / batch)

Значения **не проталкиваются** по всему графу — только сигнал «грязно».

### Pull-фаза

Происходит при **чтении** (`get()`):

1. Computed видит `#dirty` → вызывает `#recomputed()` → тянет deps через `#fn()`
2. Effect при `run()` сам вызывает `signal.get()` / `computed.get()`

Кто не читает — тот не пересчитывается (lazy).

---

## Два типа связей

| Тип | Когда | Направление | Пример |
|-----|-------|-------------|--------|
| **TRACK** | `get()` внутри активного контекста | consumer → source | Computed читает Signal |
| **NOTIFY** | `set()` / `invalidate()` | source → listener | Signal будит `invalidate` |

---

## Компоненты

| Компонент | Файл | Роль |
|-----------|------|------|
| Signal | [signal.md](./signal.md) | Источник истины, запись |
| Computed | [computed.md](./computed.md) | Производное значение, кэш |
| Effect | [effect.md](./effect.md) | Side effects, перезапуск |
| Runtime | [runtime.md](./runtime.md) | Stack + scheduler + batch/untrack |
| Operators | [operators.md](./operators.md) | Derived, map, pipe, combine |
| Readable | [readable.md](./readable.md) | Общий интерфейс чтения |

---

## Поток данных (демо)

```ts
const a = ref(1)
const doubled = map(a, v => v * 2)
const onlyBig = filter(doubled, v => v > 5)

effect(() => {
  console.log('big:', onlyBig.get())
})

a.set(3)
```

```
a.set(3)
  └─ PUSH: Signal → invalidate(doubled)
       └─ PUSH: Computed doubled → invalidate(onlyBig)
            └─ PUSH: scheduleEffect
                 └─ microtask flush → Effect.run()
                      └─ PULL: onlyBig.get() → doubled.get() → a.get()
                           └─ log 'big: 6'
```

---

## Sync vs Async

| Механизм | Когда срабатывает |
|----------|-------------------|
| `invalidate` (fn) | sync, внутри `set()` / `notify()` |
| `fn`-subscriber на Signal/Computed | sync, внутри `#notify` / `notify()` |
| `Effect` | async, microtask через `flush()` (или сразу после `batch`) |

---

## Что уже есть (vs roadmap в cs)

| Фича | Статус |
|------|--------|
| `batch(fn)` | есть |
| `untrack(fn)` | есть |
| `onCleanup(fn)` | есть |
| cleanup stale deps в Computed (`#upstream`) | есть |
| `reaction(track, effect)` | есть |
| `pipe` / `combine` / `pick` / `when` | есть |
