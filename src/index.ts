import { computed, ref, effect } from "./package/index.ts";

const flag = ref(true);
const a = ref(1);
const c = computed(() => (flag.get() ? a.get() : 0));

effect(() => console.log(c.get()));

setTimeout(() => {
  flag.set(false);
}, 1000);
