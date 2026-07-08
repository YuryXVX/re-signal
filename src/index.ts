import { ref, effect, computed } from "./package/index.ts";
const value = ref(10);

const plusOne = computed(() => value.get() + 10);
const multiply = computed(() => plusOne.get()! * 2);

effect(() => console.log(multiply.get()));

value.set(20);
