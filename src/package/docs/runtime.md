# Runtime (Stack + Scheduler)

**Файл:** `effect.ts` (глобальные функции)  
**Роль:** координация — «кто сейчас track'ит» и «когда запускать effects».

---

## Компоненты

| API | Описание |
|-----|----------|
| `pushEffect(ctx)` | Положить контекст на stack |
| `popEffect()` | Снять с stack |
| `getCurrentEffect()` | Верх stack (`null` если пусто или `UNTRACKED`) |
| `scheduleEffect(effect)` | Добавить в очередь; microtask если не в batch |
| `flush()` | Выполнить все pending effects |
| `batch(fn)` | Несколько set → один flush в конце |
| `untrack(fn)` | Читать без создания подписок |
| `onCleanup(fn)` | Teardown внутри текущего Effect |
| `isEffect(ctx)` | Type guard |

---

## Внутреннее состояние

```
ctx[]              — стек контекстов track'а (Context = Ctx | UNTRACKED)
pendingEffects     — Set<IEffect | EffectCallback>
batchDepth         — вложенность batch()
flushScheduled     — microtask уже поставлен
isFlushing         — reentrancy guard для flush
```

---

## Effect Stack

Стек отвечает на вопрос: **«Кто сейчас читает?»**

```
pushEffect(Effect)           // effect.run()
  pushEffect(Computed)       // computed.#recomputed()
    signal.get()             // видит Computed на вершине → invalidate + trackUpstream
  popEffect()
popEffect()
```

### Кто кладёт на stack

| Caller | Что push'ит |
|--------|-------------|
| `Effect.run()` | `Effect` instance |
| `Computed.#recomputed()` | `Computed` instance |
| `untrack(fn)` | `UNTRACKED` symbol |
| `effect()` при создании | (через `run()`, который push'ит self) |

### Кто читает stack

| Caller | Зачем |
|--------|-------|
| `Signal.get()` | Добавить ctx в `#deps` / `addSources` / `trackUpstream` |
| `Computed.get()` | Добавить ctx в `#sources` + `addSources` / `trackUpstream` |

---

## Scheduler (flush)

```
scheduleEffect(effect):
  pendingEffects.add(effect)
  if batchDepth > 0: return
  if not flushScheduled:
    flushScheduled = true
    queueMicrotask(() => { flushScheduled = false; flush() })

flush():
  if isFlushing: return
  isFlushing = true
  try:
    while pendingEffects not empty:
      batch = copy(pendingEffects)
      pendingEffects.clear()
      for item in batch:
        if item is Effect: item.run()
  finally:
    isFlushing = false
```

### Зачем microtask

- Несколько `set()` подряд → один batch flush
- `Set` дедуплицирует один Effect
- Effect не run'ится sync внутри `set()` — меньше reentrancy-багов

---

## batch

```ts
batch(() => {
  a.set(1)
  b.set(2)
  c.set(3)
})
// один flush в конце
```

Пока `batchDepth > 0`, `scheduleEffect` только копит очередь. На выходе внешнего batch — `flush()`.

---

## untrack

```ts
untrack(() => {
  // get() внутри не создаёт подписок
  console.log(a.get())
})
```

`pushEffect(UNTRACKED)` → `getCurrentEffect()` = `null`.

Используется в `reaction` для act-части.

---

## Push / Pull в runtime

Runtime **не вычисляет значения**. Только:

| | Роль |
|--|------|
| Stack | обеспечивает **pull**-track (сбор deps) |
| Scheduler | обеспечивает **push**→defer→**pull** для effects |
| batch / untrack | контроль timing и scope track'а |

---

## Пример: batch нескольких set

```ts
const a = ref(1)
let runs = 0

effect(() => { a.get(); runs++ })

a.set(2)
a.set(3)
a.set(4)
// microtask: flush один раз → runs += 1 (не 3)
```

---

## Не должен

- хранить значения signals
- знать бизнес-логику computed fn
- вызывать user fn напрямую (только через `Effect.run`)
