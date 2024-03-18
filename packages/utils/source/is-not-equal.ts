import { isEqual } from "./is-equal.js";

export const isNotEqual = <T>(a: T, b: T): boolean => !isEqual(a, b);
