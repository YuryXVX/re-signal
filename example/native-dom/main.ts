/**
 * Нативный DOM + re-signal
 *
 * Запуск:
 *   cd example && npm run dom
 */
import { computed, effect, ref } from "../../src/package/index.ts";

const count = ref(0);
const parity = computed(() => (count.get() % 2 === 0 ? "чётное" : "нечётное"));

const countEl = document.querySelector<HTMLElement>("#count")!;
const parityEl = document.querySelector<HTMLElement>("#parity")!;
const incBtn = document.querySelector<HTMLButtonElement>("#inc")!;
const decBtn = document.querySelector<HTMLButtonElement>("#dec")!;
const resetBtn = document.querySelector<HTMLButtonElement>("#reset")!;

// effect читает сигналы → при set() перезапускается и пишет в DOM
effect(() => {
  countEl.textContent = String(count.get());
});

effect(() => {
  parityEl.textContent = parity.get() ?? "";
});

incBtn.addEventListener("click", () => count.set(count.get() + 1));
decBtn.addEventListener("click", () => count.set(count.get() - 1));
resetBtn.addEventListener("click", () => count.set(0));

// cleanup: debounce-лог; предыдущий таймер сбрасывается на каждом rerun
effect(() => {
  const value = count.get();
  const id = window.setTimeout(() => {
    console.log("settled at", value);
  }, 400);
  return () => clearTimeout(id);
});
