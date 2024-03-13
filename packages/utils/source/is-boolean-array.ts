import { isArrayOfType } from "./is-array-of-type.js";

export const isBooleanArray = (value: unknown): value is boolean[] => isArrayOfType<boolean>(value, "boolean");
