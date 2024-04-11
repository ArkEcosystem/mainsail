import { getType } from "./get-type.js";

export const isSyncFunction = (value: unknown): boolean => getType(value) === "[object Function]";
