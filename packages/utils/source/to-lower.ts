import { toString } from "./to-string.js";

export const toLower = <T>(value: T): string => toString(value).toLowerCase();
