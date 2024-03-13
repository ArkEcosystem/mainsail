import { isAsyncFunction } from "./is-async-function.js";
import { isSyncFunction } from "./is-sync-function.js";

export const isFunction = (value: unknown): boolean => isSyncFunction(value) || isAsyncFunction(value);
