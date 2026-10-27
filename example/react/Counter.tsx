/**
 * React + re-signal
 *
 * Запуск:
 *   cd example && npm run react
 */
import { useComputedRef, useSignal, useSignalRef } from "./useSignal.ts";

export function Counter() {
  const count = useSignalRef(0);
  const doubled = useComputedRef(() => count.get() * 2);

  const value = useSignal(count);
  const doubledValue = useSignal(doubled);

  return (
    <main>
      <h1>re-signal</h1>
      <p>React-интеграция через effect → setState.</p>

      <div className="row">
        <button type="button" onClick={() => count.set(count.get() - 1)}>
          −
        </button>
        <span className="count">{value}</span>
        <button
          type="button"
          className="primary"
          onClick={() => count.set(count.get() + 1)}
        >
          +
        </button>
        <button type="button" onClick={() => count.set(0)}>
          reset
        </button>
      </div>

      <p className="meta">
        count × 2 = <strong>{doubledValue}</strong>
      </p>
    </main>
  );
}
