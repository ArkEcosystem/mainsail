import { isArray } from "./is-array.js";
import { mapArray } from "./map-array.js";
import { mapObject } from "./map-object.js";

export const map = <T, R>(
	iterable: T[] | Record<string, T>,
	iteratee: (value: T, keyOrIndex: number | string, collection: T[] | Record<string, T>) => R,
): R[] => {
	if (isArray(iterable)) {
		return mapArray(iterable, (value, index, array) => iteratee(value, index, array));
	}

	const object = iterable as Record<string, T>;

	return mapObject<Record<string, T>, R>(object, (value, key, o) => iteratee(value, key, o));
};
