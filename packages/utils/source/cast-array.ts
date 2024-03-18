import { isArray } from "./is-array.js";
import { isFunction } from "./is-function.js";
import { isNull } from "./is-null.js";
import { isString } from "./is-string.js";
import { isUndefined } from "./is-undefined.js";

export const castArray = <T>(value: any): T[] => {
	if (isNull(value) || isUndefined(value)) {
		return [];
	}

	if (isArray(value)) {
		return value as T[];
	}

	if (isString(value)) {
		return [value as unknown as T];
	}

	if (isFunction(value[Symbol.iterator])) {
		return [...value];
	}

	return [value];
};
