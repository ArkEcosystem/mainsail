import { isMap } from "./is-map.js";

export const isEmptyMap = <K, V>(value: Map<K, V>): boolean => isMap(value) && value.size <= 0;
