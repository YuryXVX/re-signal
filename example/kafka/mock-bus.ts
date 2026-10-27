/**
 * In-memory «Kafka» для демо без брокера.
 * Тот же контракт: AsyncIterable сообщений + publish.
 */
export type BusMessage = {
  topic: string;
  key: string | null;
  value: string;
  offset: string;
  timestamp: string;
};

export type MessageBus = {
  publish(topic: string, key: string | null, value: string): Promise<void>;
  subscribe(topic: string, signal?: AbortSignal): AsyncIterable<BusMessage>;
  disconnect(): Promise<void>;
};

export function createMockBus(): MessageBus {
  type Waiter = {
    topic: string;
    push: (msg: BusMessage) => void;
    close: () => void;
  };

  const waiters = new Set<Waiter>();
  let offset = 0;

  return {
    async publish(topic, key, value) {
      const msg: BusMessage = {
        topic,
        key,
        value,
        offset: String(offset++),
        timestamp: String(Date.now()),
      };

      for (const w of waiters) {
        if (w.topic === topic) w.push(msg);
      }
    },

    subscribe(topic, signal) {
      const queue: BusMessage[] = [];
      let wake: (() => void) | undefined;
      let done = false;

      const waiter: Waiter = {
        topic,
        push(msg) {
          queue.push(msg);
          wake?.();
        },
        close() {
          done = true;
          wake?.();
        },
      };

      waiters.add(waiter);

      const onAbort = () => waiter.close();
      signal?.addEventListener("abort", onAbort, { once: true });

      return {
        async *[Symbol.asyncIterator]() {
          try {
            while (!done && !signal?.aborted) {
              while (queue.length > 0) {
                yield queue.shift()!;
              }
              if (done || signal?.aborted) break;
              await new Promise<void>((resolve) => {
                wake = resolve;
              });
              wake = undefined;
            }
          } finally {
            waiters.delete(waiter);
            signal?.removeEventListener("abort", onAbort);
          }
        },
      };
    },

    async disconnect() {
      for (const w of waiters) w.close();
      waiters.clear();
    },
  };
}
