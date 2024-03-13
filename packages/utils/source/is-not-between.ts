import { isBetween } from "./is-between.js";

export const isNotBetween = (value: any, a: number, b: number): boolean => !isBetween(value, a, b);
