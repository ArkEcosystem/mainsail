import { isNumber } from "./is-number.js";

export const isPositive = (value: number | bigint): boolean => isNumber(value) && value > 0;
