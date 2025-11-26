import type { FunctionReturning } from "./internal/index.js";

export const keyBy = <T, K extends PropertyKey>(iterable: T[], iteratee: FunctionReturning<[T], K>): Record<K, T> =>
	iterable.reduce(
		(result, value) => {
			const key = iteratee(value);
			result[key] = value;
			return result;
		},
		{} as Record<K, T>,
	);
