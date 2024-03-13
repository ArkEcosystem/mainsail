import { isArray } from "./is-array.js";
import { isObject } from "./is-object.js";
import { isString } from "./is-string.js";

export const includes = <T, V>(iterable: T, value: V): boolean => {
	if (isArray(iterable)) {
		return iterable.includes(value);
	}

	if (isString(iterable)) {
		return iterable.includes(value as unknown as string);
	}

	if (isObject(iterable)) {
		return Object.values(iterable).includes(value);
	}

	return false;
};
