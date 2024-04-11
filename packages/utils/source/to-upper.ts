import { toString } from "./to-string.js";

export const toUpper = <T>(value: T): string => toString(value).toUpperCase();
