export const pickBy = <T extends Record<string, unknown>>(
	iterable: T,
	iteratee: (value: T[keyof T], key: keyof T) => boolean,
): Partial<T> => {
	const result: Partial<T> = {};

	for (const key in iterable) {
		if (Object.prototype.hasOwnProperty.call(iterable, key)) {
			const typedKey = key as keyof T;
			const value = iterable[typedKey];

			if (iteratee(value, typedKey)) {
				result[typedKey] = value;
			}
		}
	}

	return result;
};
