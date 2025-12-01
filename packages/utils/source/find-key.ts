import { filterObject } from "./filter-object.js";
import type { FunctionReturning } from "./internal/index.js";

export const findKey = <T extends Record<string, T[keyof T]>>(
	iterable: T,
	iteratee: FunctionReturning<[T[keyof T], keyof T, T], unknown>,
): keyof T | undefined => {
	const filtered = filterObject(iterable, iteratee);
	const keys = Object.keys(filtered) as (keyof T)[];

	return keys.length > 0 ? keys[0] : undefined;
};
