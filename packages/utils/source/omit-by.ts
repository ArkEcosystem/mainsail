import { filter } from "./filter.js";
import type { FunctionReturning } from "./internal/index.js";

export const omitBy = <T extends Record<string, unknown>>(iterable: T, iteratee: FunctionReturning): T =>
	filter(iterable, (value) => !iteratee(value)) as T;
