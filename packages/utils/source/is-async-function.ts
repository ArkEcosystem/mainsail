import { getType } from "./get-type.js";

export const isAsyncFunction = (value: unknown): boolean => getType(value) === "[object AsyncFunction]";
