# Operators (Derived, map, pipe, combine)

**Файл:** `operators.ts` (+ `lib.ts` для `pick`)  
**Роль:** ленивые трансформации над `Readable` — обёртки над `Computed`.

---

## Общий принцип

Operators **не добавляют новый тип связи** в граф. Они:

1. Принимают `source: Readable<T>` (или собирают несколько)
2. Лениво создают внутренний `Computed` при первом `get()` / `subscribe()`
3. Делегируют всю реактивность Computed

```
Derived / map / filter / pick / when / pipe / combine
  └─ (lazy) Computed
       └─ track → source.get()
```

---

## Derived

Базовая lazy-обёртка. Все остальные операторы строятся на `derive(fn)`.

### API

```ts
derive(fn: () => T): Readable<T>
```

### Внутреннее состояние

```
#fn        — () => T
#computed  — Computed<T> | null   ← null до первого доступа
```

### Поведение

```
get():
  #ensure().get()

subscribe(listener):
  computed = #ensure()
  computed.get()              // активация track-цепочки
  return computed.subscribe(listener)

#ensure():
  if #computed is null:
    #computed = new Computed(this.fn)
  return #computed
```

---

## map / filter / when / pick

| Функция | Сигнатура | Поведение |
|---------|-----------|-----------|
| `map(source, fn)` | `Readable<T> → Readable<U>` | `fn(source.get())` |
| `filter(source, pred)` | `Readable<T> → Readable<T \| undefined>` | value или `undefined` |
| `when(cond, then, else)` | boolean source → ветка | `cond ? then() : else()` |
| `pick(source, path)` | path `"a.b.c"` | `get(obj, path)` из `lib.ts` |

`pick` типобезопасен через `Path<T>` / `PathValue<T, P>`.

---

## Operator-формы и pipe

```ts
mapOp(fn)      // Operator<T, U>
filterOp(pred) // Operator<T, T | undefined>
pickOp(path)   // Operator<T, PathValue>

pipe(source, mapOp(v => v * 2), filterOp(v => v > 5))
```

`pipe` — левоассоциативный reduce операторов с выводом типа (`PipeOut` в `types.ts`).

---

## combine

Склеивает несколько источников в одно производное значение.

```ts
// массив
combine([a, b], ([x, y]) => x + y)

// запись
combine({ a, b }, ({ a, b }) => a + b)

// entry с inline operators
combine(
  [[a, mapOp(v => v + 1), pickOp('…')], b],
  ([x, y]) => x + y
)
```

Каждый entry — `Readable` или `[Readable, ...Operator[]]`. Резолв через `pipe`, затем `derive(() => combiner(values))`.

---

## Lazy = до первого доступа

```ts
const a = ref(1)
const doubled = map(a, v => v * 2)

// doubled ещё не создал Computed
// a.#deps пуст от doubled

doubled.get()  // или doubled.subscribe(...)
// теперь Computed создан, a track'ит invalidate(doubled)
```

---

## Push / Pull

Operators наследуют семантику Computed:

| | |
|--|--|
| source.set() | **Push** invalidate по цепочке |
| operator.get() | **Pull** через computed fn |

---

## Пример

```ts
const a = ref(1)
const doubled = map(a, v => v * 2)
const onlyBig = filter(doubled, v => v > 5)

effect(() => {
  console.log('big:', onlyBig.get())
})

a.set(2)  // doubled=4, get → undefined
a.set(3)  // doubled=6 → "big: 6"
```

Граф после первого чтения:

```
Signal a ──track──► Computed(doubled) ──track──► Computed(onlyBig) ──notify──► Effect
```

---

## Не должен

- подписываться на source до `get()` / `subscribe()`
- дублировать логику track/notify (это задача Computed)
- владеть собственным scheduler
