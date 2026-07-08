import { computed, ref, effect } from "./package/index.ts";

const flag = ref(true);
const a = ref(1);
const c = computed(() => (flag.get() ? a.get() : 0));
const d = computed(() => c.get() === 1);

const dispose = effect(() => console.log(d.get()));

dispose();
setTimeout(() => {
  flag.set(false);
}, 1000);
