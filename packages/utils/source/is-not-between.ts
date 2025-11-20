import { isBetween } from "./is-between.js";

export const isNotBetween = (value: number, a: number, b: number): boolean => !isBetween(value, a, b);
