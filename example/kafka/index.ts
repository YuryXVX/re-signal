/**
 * Kafka + re-signal
 *
 * Поток сообщений → signals / computed / effect / iterate.
 * Команды из signal → publish в топик.
 *
 * Mock (без Docker):
 *   cd example && npm run kafka:mock
 *
 * С Redpanda:
 *   cd example && npm run kafka:up
 *   cd example && npm run kafka
 *   cd example && npm run kafka:down
 */
import {
  batch,
  computed,
  effect,
  iterate,
  reaction,
  ref,
} from "../../src/package/index.ts";
import { createKafkaBus } from "./kafka-bus.ts";
import { createMockBus, type BusMessage, type MessageBus } from "./mock-bus.ts";

const TOPIC = "re-signal.orders";
const USE_MOCK = process.env.MOCK_KAFKA === "1" || process.argv.includes("--mock");

type OrderEvent = {
  id: string;
  status: "created" | "paid" | "shipped";
  amount: number;
};

function parseOrder(msg: BusMessage): OrderEvent | null {
  try {
    return JSON.parse(msg.value) as OrderEvent;
  } catch {
    return null;
  }
}

async function ensureTopic(_bus: MessageBus) {
  // Redpanda создаёт топик при первой записи; для KafkaJS mock не нужно
}

async function main() {
  const bus: MessageBus = USE_MOCK
    ? createMockBus()
    : await createKafkaBus("re-signal-demo");

  console.log(USE_MOCK ? "mode: mock bus" : "mode: Kafka / Redpanda");

  await ensureTopic(bus);

  // --- reactive state ---
  const lastRaw = ref<BusMessage | null>(null);
  const lastOrder = ref<OrderEvent | null>(null);
  const orders = ref<OrderEvent[]>([]);
  const errors = ref(0);

  const paidTotal = computed(() =>
    orders.get().filter((o) => o.status === "paid" || o.status === "shipped")
      .reduce((s, o) => s + o.amount, 0),
  );

  const stats = computed(() => ({
    count: orders.get().length,
    paidTotal: paidTotal.get(),
    errors: errors.get(),
    lastId: lastOrder.get()?.id ?? null,
  }));

  // логируем каждое обновление статистики
  effect(() => {
    console.log("[stats]", stats.get());
  });

  // reaction: только на рост ошибок
  reaction(
    () => errors.get(),
    (n, prev) => {
      if (n > (prev ?? 0)) console.warn("[warn] parse errors:", n);
    },
  );

  // async-итератор по lastOrder (поток доменных событий)
  const ac = new AbortController();
  const watching = (async () => {
    for await (const order of iterate(lastOrder, { signal: ac.signal })) {
      if (order) console.log("[iterate lastOrder]", order.id, order.status);
    }
  })();

  // consumer: Kafka/mock → signals
  const consuming = (async () => {
    for await (const msg of bus.subscribe(TOPIC, ac.signal)) {
      lastRaw.set(msg);
      const order = parseOrder(msg);
      if (!order) {
        errors.update((n) => n + 1);
        continue;
      }

      batch(() => {
        lastOrder.set(order);
        orders.update((list) => [...list, order]);
      });
    }
  })();

  // producer: «команды» из signal → Kafka
  const command = ref<OrderEvent | null>(null);

  const stopProduce = reaction(
    () => command.get(),
    async (cmd) => {
      if (!cmd) return;
      await bus.publish(TOPIC, cmd.id, JSON.stringify(cmd));
      console.log("[produce]", cmd.id, cmd.status);
    },
  );

  // демо-сценарий
  const demo = [
    { id: "o1", status: "created" as const, amount: 100 },
    { id: "o2", status: "paid" as const, amount: 250 },
    { id: "o1", status: "paid" as const, amount: 100 },
    { id: "o2", status: "shipped" as const, amount: 250 },
  ];

  for (const event of demo) {
    command.set(event);
    await delay(USE_MOCK ? 30 : 200);
  }

  // битое сообщение → errors++
  await bus.publish(TOPIC, "bad", "{not-json");
  await delay(USE_MOCK ? 30 : 200);

  await delay(USE_MOCK ? 50 : 500);

  ac.abort();
  stopProduce();
  await Promise.race([consuming, watching, delay(500)]);
  await bus.disconnect();

  console.log("final stats", stats.get());
  console.log("done");
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(err);
  console.error(
    "\nПодсказка: подними брокер (`npm run kafka:up`) или запусти mock:\n  npm run kafka:mock\n",
  );
  process.exit(1);
});
