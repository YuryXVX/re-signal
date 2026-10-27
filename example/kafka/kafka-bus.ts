/**
 * Kafka-совместимый bus на KafkaJS + Redpanda.
 */
import { Kafka, logLevel, type Consumer, type Producer } from "kafkajs";
import type { BusMessage, MessageBus } from "./mock-bus.ts";

const BROKERS = (process.env.KAFKA_BROKERS ?? "localhost:19092").split(",");

export async function createKafkaBus(
  clientId = "re-signal-example",
): Promise<MessageBus> {
  const kafka = new Kafka({
    clientId,
    brokers: BROKERS,
    logLevel: logLevel.ERROR,
  });

  const producer: Producer = kafka.producer();
  const consumer: Consumer = kafka.consumer({
    groupId: `${clientId}-${Date.now()}`,
  });

  await producer.connect();
  await consumer.connect();

  return {
    async publish(topic, key, value) {
      await producer.send({
        topic,
        messages: [{ key: key ?? null, value }],
      });
    },

    subscribe(topic, signal) {
      const queue: BusMessage[] = [];
      let wake: (() => void) | undefined;
      let done = false;
      let started = false;

      const onAbort = () => {
        done = true;
        wake?.();
      };
      signal?.addEventListener("abort", onAbort, { once: true });

      return {
        async *[Symbol.asyncIterator]() {
          if (!started) {
            started = true;
            await consumer.subscribe({ topic, fromBeginning: false });
            void consumer.run({
              eachMessage: async ({ topic: t, message }) => {
                queue.push({
                  topic: t,
                  key: message.key?.toString() ?? null,
                  value: message.value?.toString() ?? "",
                  offset: message.offset,
                  timestamp: message.timestamp,
                });
                wake?.();
              },
            });
          }

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
            signal?.removeEventListener("abort", onAbort);
            try {
              await consumer.stop();
            } catch {
              /* ignore */
            }
          }
        },
      };
    },

    async disconnect() {
      await consumer.disconnect().catch(() => undefined);
      await producer.disconnect().catch(() => undefined);
    },
  };
}
