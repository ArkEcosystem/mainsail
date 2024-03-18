import { isNumber } from "./is-number.js";

export const isNegative = (value: number): boolean => isNumber(value) && value < 0;
