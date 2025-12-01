export const mapValues = <T extends Record<string, unknown>, R>(
	iterable: T,
	iteratee: (value: T[keyof T], key: keyof T, object: T) => R,
): Record<keyof T, R> => {
	const keys = Object.keys(iterable) as (keyof T)[];
	const result = {} as Record<keyof T, R>;

	for (const key of keys) {
		result[key] = iteratee(iterable[key], key, iterable);
	}

	return result;
};
