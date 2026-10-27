/**
 * HTTP-сервер на Node.js + re-signal
 *
 * Запуск:
 *   cd example && npm run http
 *   # или из корня: npx tsx example/http-server/index.ts
 *
 * Затем:
 *   curl http://localhost:3000/
 *   curl -X POST http://localhost:3000/increment
 *   curl http://localhost:3000/stats
 */
import http from "node:http";
import { batch, computed, effect, reaction, ref } from "../../src/package/index.ts";

const PORT = 3000;

const hits = ref(0);
const lastPath = ref<string>("-");
const lastMethod = ref<string>("-");
const errors = ref(0);

const stats = computed(() => ({
  hits: hits.get(),
  errors: errors.get(),
  last: `${lastMethod.get()} ${lastPath.get()}`,
}));

// Логируем каждое обновление статистики (async microtask)
effect(() => {
  const s = stats.get();
  if (!s) return;
  console.log(`[stats] hits=${s.hits} errors=${s.errors} last=${s.last}`);
});

// reaction: track отдельно от side-effect
reaction(
  () => errors.get(),
  (count, prev) => {
    if (count > (prev ?? 0)) {
      console.warn(`[warn] error count: ${prev ?? 0} → ${count}`);
    }
  },
);

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const method = req.method ?? "GET";
  const path = url.pathname;

  // Несколько сигналов за один запрос — одним batch
  batch(() => {
    hits.set(hits.get() + 1);
    lastPath.set(path);
    lastMethod.set(method);
  });

  if (method === "GET" && path === "/") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, message: "re-signal http example" }));
    return;
  }

  if (method === "POST" && path === "/increment") {
    // уже учли hit выше; отдельный «счётчик действий» не нужен —
    // просто подтверждаем
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: true, hits: hits.get() }));
    return;
  }

  if (method === "GET" && path === "/stats") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(stats.get()));
    return;
  }

  batch(() => {
    errors.set(errors.get() + 1);
  });

  res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ ok: false, error: "not found" }));
});

server.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
