# Effect

**Файл:** `effect.ts`  
**Роль:** side effects — автоматический перезапуск при изменении deps.

---

## Что умеет

| API | Описание |
|-----|----------|
| `effect(fn)` | Создать effect, первый run, вернуть dispose |
| `run()` | Cleanup → отписка → track-цикл → сохранить cleanup |
| `dispose()` | Остановить навсегда, cleanup, отписка |
| `addSources(dep)` | Запомнить dep для cleanup при следующем run |
| `addCleanup(fn)` | Зарегистрировать teardown (через `onCleanup`) |
| `reaction(track, effect)` | Track-часть + untracked effect-часть (`reaction.ts`) |

---

## Внутреннее состояние

```
#fn        — пользовательская функция (может вернуть cleanup)
#cleanup   — fn, возвращённая из прошлого run
#cleanups  — Set<() => void>  ← onCleanup registrations
#disposed  — effect уничтожен
#sources   — Set< Signal | Computed >  ← для cleanup
```

---

## Зависимости

### IN (от кого зависит)

Строится при каждом `run()`:

```
run():
  pushEffect(this)
  #fn()  → signal.get() / computed.get()
  popEffect()
```

При `get()` dep регистрирует Effect:
- `#deps` / `#sources`.add(effect)
- `effect.addSources(this)`

### OUT (кого notify'ит)

**Никого.** Effect — consumer, не producer. Не push'ит изменения в граф.

---

## Push / Pull

| Операция | Фаза |
|----------|------|
| dep.set() → scheduleEffect | **Push** инвалидация (async) |
| run() → get() deps | **Pull** актуальных значений |

---

## Жизненный цикл run()

```
run():
  if #disposed: return

  // 1. cleanup прошлого run
  if #cleanup: #cleanup(); #cleanup = null
  for fn in #cleanups: fn(); #cleanups.clear()

  // 2. отписка от старых deps
  for source in #sources: source.unsubscribe(this)
  #sources.clear()

  // 3. track-цикл
  pushEffect(this)
  result = #fn()
  popEffect()

  // 4. сохранить новый cleanup
  if result is fn: #cleanup = result
```

---

## Cleanup

```ts
effect(() => {
  const id = setInterval(() => {}, 1000)
  return () => clearInterval(id)  // вызывается перед каждым rerun и dispose
})

effect(() => {
  onCleanup(() => console.log('teardown'))
})
```

---

## dispose()

```
dispose():
  if #disposed: return
  #disposed = true
  if #cleanup: #cleanup()
  for fn in #cleanups: fn()
  for source in #sources: source.unsubscribe(this)
  #sources.clear()
```

После dispose `set()` на deps **не** должен перезапускать effect.

---

## reaction

```ts
reaction(
  () => a.get() + b.get(),       // track
  (value, prev) => console.log(value, prev)  // untracked
)
```

Внутри: `Effect`, где `effect(value, prev)` вызывается через `untrack`, чтобы чтения в act-части не становились deps.

---

## Effect vs fn-subscriber

| | Effect | `subscribe(fn)` |
|--|--------|-----------------|
| Перезапуск | весь `#fn()` заново | только fn с новым value |
| Timing | microtask / batch flush | sync |
| Cleanup | да | нет |
| Track rebuild | да, каждый run | нет |

---

## Пример

```ts
const a = ref(1)
const b = ref(2)

const stop = effect(() => {
  console.log(a.get() + b.get())
})

a.set(10)  // push → scheduleEffect → microtask → run → pull → log 12
stop()     // dispose
a.set(99)  // тишина
```

---

## Не должен

- хранить значения (это Signal/Computed)
- notify'ить других подписчиков
- пропускать cleanup при rerun
