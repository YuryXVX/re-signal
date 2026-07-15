# Signal

**Файл:** `signal.ts`  
**Роль:** leaf-узел графа — хранит значение, единственная точка записи.

---

## Что умеет


| API                     | Описание                                                                   |
| ----------------------- | -------------------------------------------------------------------------- |
| `get()`                 | Вернуть значение. Если есть контекст track'а — зарегистрировать подписчика |
| `set(value)`            | Записать значение (`Object.is`). При изменении — `#notify()`               |
| `subscribe(fn)`         | Push-подписка без track'а. Возвращает unsub                                |
| `unsubscribe(listener)` | Удалить подписчика                                                         |
| `ref(val)`              | Фабрика → `new Signal(val)`                                                |


---

## Внутреннее состояние

```
#value  — текущее значение
#deps   — Set< Listener | IEffect | invalidate-fn >
```

---

## Зависимости

### IN (от кого зависит)

**Никого.** Signal — первичный источник данных.

### OUT (кого держит в `#deps`)

```
Signal.#deps
  ├── IEffect          → scheduleEffect (async, microtask)
  ├── Listener (fn)    → fn(value) sync
  └── invalidate-fn    → fn() sync  ← это Computed.invalidate
```

---

## Push / Pull


| Операция | Фаза                                                        |
| -------- | ----------------------------------------------------------- |
| `set()`  | **Push** — уведомляет deps                                  |
| `get()`  | **Pull** — отдаёт значение; при track регистрирует consumer |


---

## Track-цикл

```
get():
  ctx = getCurrentEffect()

  if ctx is Effect:
    #deps.add(ctx)
    ctx.addSources(this)

  if ctx is Computed:
    #deps.add(ctx.invalidate)
    ctx.trackUpstream(this)

  if ctx is fn:
    #deps.add(ctx)

  return #value
```

Контекст `ctx` — верх effect stack. Это может быть:

- `Effect` instance (при `effect.run()`)
- `Computed` instance (при `Computed.#recomputed()`)
- plain `fn` (legacy / special track)
- `UNTRACKED` → `getCurrentEffect()` возвращает `null`

---

## Notify при set()

```
set(value):
  if Object.is(value, #value): return

  #value = value

  for dep in #deps:
    if dep is IEffect:  scheduleEffect(dep)
    if dep is fn:       dep(#value)
```

---

## subscribe vs get (track)


|                        | `subscribe(fn)`    | `get()` в track-контексте |
| ---------------------- | ------------------ | ------------------------- |
| Регистрация            | да                 | да                        |
| Track deps             | нет                | да                        |
| Когда вызывается fn    | при каждом `set()` | —                         |
| Типичное использование | внешний listener   | внутри computed/effect    |


---

## Пример

```ts
const count = ref(0)

// Push-подписка
count.subscribe(v => console.log(v))

// Track — внутри effect
effect(() => {
  console.log(count.get())  // count track'ит Effect
})

count.set(1)  // → push notify → effect в microtask
```

---

## Не должен

- пересчитывать производные значения
- решать sync/async для effects (только вызывает `scheduleEffect`)
- сам знать бизнес-логику downstream

