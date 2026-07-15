# Computed

**Файл:** `computed.ts`  
**Роль:** производное значение — `#fn()` от deps, кэш, lazy recompute.

---

## Что умеет

| API | Описание |
|-----|----------|
| `get()` | Вернуть кэш. Подписать consumer. Пересчитать если `#firstRun` или `#dirty` |
| `subscribe(fn)` | Слушать изменения результата |
| `unsubscribe(x)` | Удалить подписчика |
| `invalidate()` | Пометить dirty + notify downstream |
| `trackUpstream(source)` | Запомнить upstream для cleanup stale deps |
| `computed(fn)` | Фабрика |
| `isComputed(val)` | Type guard |
| `[Symbol.dispose]` | Отписка от upstream + clear sources |

---

## Внутреннее состояние

```
#fn          — функция вычисления
#cacheValue  — закэшированный результат
#firstRun    — первый get() ещё не был
#dirty       — deps изменились, кэш устарел
#sources     — Set< IEffect | Listener | invalidate-fn >  ← OUT (кто слушает меня)
#upstream    — Set< Source >  ← IN (что я читаю) — для cleanup
invalidate   — bound method для подписки на источники
```

---

## Два графа (не смешивать!)

### IN — upstream (track, что читаю)

Строится при `#recomputed()`:

```
#upstream.forEach(s => s.unsubscribe(this.invalidate))
#upstream.clear()

pushEffect(this)
  #fn() → source.get()
    → source добавляет this.invalidate в deps
    → source.trackUpstream? нет — Signal/Computed вызывает ctx.trackUpstream(this)
popEffect()
```

Каждый источник через `get()` видит `isComputed(ctx)` и вызывает `ctx.trackUpstream(this)`.

### OUT — sources (кто слушает меня)

```
Computed.#sources
  ├── IEffect         → scheduleEffect
  ├── invalidate-fn   → parent.invalidate()  (через notify + isComputed)
  └── Listener (fn)   → fn(#cacheValue) sync
```

> В `get()` parent Computed кладёт в `#sources` именно `ctx.invalidate`, а не сам instance.

---

## Push / Pull

| Операция | Фаза |
|----------|------|
| `invalidate()` от deps | **Push** — dirty + notify |
| `get()` при `#dirty` | **Pull** — `#recomputed()` тянет deps |
| `notify()` → fn subscriber | **Push** значения (sync) |
| `notify()` → Effect | **Push** schedule (async) |

---

## Жизненный цикл get()

```
get():
  ctx = getCurrentEffect()
  if ctx is Effect:
    #sources.add(ctx)
    ctx.addSources(this)
  if ctx is Computed:
    #sources.add(ctx.invalidate)
    ctx.trackUpstream(this)
  if ctx is fn:
    #sources.add(ctx)

  if #firstRun:
    #firstRun = false
    #recomputed()
    return #cacheValue

  if #dirty:
    #recomputed()

  return #cacheValue
```

---

## #recomputed()

```
#recomputed():
  // cleanup stale deps
  for source in #upstream:
    source.unsubscribe(this.invalidate)
  #upstream.clear()

  pushEffect(this)

  prev = #cacheValue
  next = #fn()
  #dirty = false

  if not Object.is(prev, next):
    #cacheValue = next

  popEffect()
```

---

## invalidate() + notify()

```
invalidate():
  if #dirty: return
  #dirty = true
  notify()

notify():
  for source in #sources:
    if source is Computed:  source.invalidate()
    if source is IEffect:   scheduleEffect(source)
    if source is fn:        source(#cacheValue)
```

> `notify()` при invalidate **не** делает pull заранее — пересчёт при следующем `get()`.

---

## Кого принимает / отдаёт

| Направление | Типы |
|-------------|------|
| **IN (track)** | Signal, Computed |
| **OUT (notify)** | Effect, parent Computed (через invalidate), fn |

---

## Пример

```ts
const a = ref(1)
const b = ref(2)

const sum = computed(() => a.get() + b.get())

sum.get()     // pull: читает a, b → cache = 3
a.set(10)     // push: invalidate(sum) → dirty
sum.get()     // pull: recompute → 12
```

---

## Conditional deps

Stale deps чистятся через `#upstream` в начале `#recomputed()`:

```ts
const flag = ref(true)
const c = computed(() => flag.get() ? a.get() : b.get())

flag.set(false)  // следующий get() отпишется от a, начнёт track'ить b
```

---

## Не должен

- менять Signal напрямую
- push'ить значение во всё дерево без запроса
- хранить upstream и sources в одном Set
