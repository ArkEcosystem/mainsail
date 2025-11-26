import type { FunctionReturning } from "./internal/index.js";

export const filterObject = <T extends Record<string, T[keyof T]>>(
	iterable: T,
	iteratee: FunctionReturning<[T[keyof T], keyof T, T], unknown>,
): T => {
	const result = {} as T;

	for (const key in iterable) {
		if (!Object.prototype.hasOwnProperty.call(iterable, key)) {
			continue;
		}

		const typedKey = key as keyof T;
		const value = iterable[typedKey];

		if (iteratee(value, typedKey, iterable)) {
			result[typedKey] = value;
		}
	}

	return result;
};
