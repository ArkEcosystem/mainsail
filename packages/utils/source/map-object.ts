export const mapObject = <T extends Record<string, unknown>, R>(
	iterable: T,
	iteratee: (value: T[keyof T], key: keyof T, object: T) => R,
): R[] => {
	const keys = Object.keys(iterable) as (keyof T)[];
	const result: R[] = Array.from({ length: keys.length });

	for (const [index, key] of keys.entries()) {
		result[index] = iteratee(iterable[key], key, iterable);
	}

	return result;
};
