import { isSet } from "./is-set.js";

export const isEmptySet = <V>(value: Set<V>): boolean => isSet(value) && value.size <= 0;
