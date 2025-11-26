import type { FunctionReturning } from "./internal/index.js";

export const groupBy = <T, K extends PropertyKey>(
	iterable: T[],
	iteratee: FunctionReturning<[T], K>,
): Record<K, T[]> => {
	const groupedValues = {} as Record<K, T[]>;

	for (const value of iterable) {
		const key = iteratee(value);

		if (!groupedValues[key]) {
			groupedValues[key] = [];
		}

		groupedValues[key].push(value);
	}

	return groupedValues;
};
