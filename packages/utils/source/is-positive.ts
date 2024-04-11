import { isNumber } from "./is-number.js";

export const isPositive = (value: number | BigInt): boolean => isNumber(value) && value > 0;
