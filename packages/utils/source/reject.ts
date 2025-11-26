import { filter } from "./filter.js";
import type { FunctionReturning } from "./internal/index.js";

export const reject = <T>(iterable: T[], iteratee: FunctionReturning<[T, number, T[]], unknown>): T[] =>
	filter(iterable, (item, index, array) => !iteratee(item as T, index as number, array as T[])) as T[];
