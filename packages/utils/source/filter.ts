import { filterArray } from "./filter-array.js";
import { filterObject } from "./filter-object.js";
import type { FunctionReturning } from "./internal/index.js";
import { isArray } from "./is-array.js";

export const filter = <T>(
	iterable: T[] | Record<string, T>,
	iteratee: FunctionReturning<[T, number | string, T[] | Record<string, T>], unknown>,
): T[] | Record<string, T> => {
	if (isArray(iterable)) {
		// iterable is T[]
		return filterArray(iterable, ((value, index, array) => iteratee(value, index, array)) as FunctionReturning<
			[T, number, T[]],
			unknown
		>);
	}

	// iterable is Record<string, T>
	const object = iterable as Record<string, T>;

	return filterObject(object, ((value, key, obj) => iteratee(value, key, obj)) as FunctionReturning<
		[T, string, Record<string, T>],
		unknown
	>);
};
