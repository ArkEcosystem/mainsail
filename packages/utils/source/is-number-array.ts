import { isArrayOfType } from "./is-array-of-type.js";

export const isNumberArray = (value: unknown): value is number[] => isArrayOfType<number>(value, "number");
