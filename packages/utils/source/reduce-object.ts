import type { FunctionReturning } from "./internal/index.js";

export const reduceObject = <T extends Record<string, unknown>, V>(
	iterable: T,
	iteratee: FunctionReturning<[V, T[keyof T], keyof T, T], V>,
	initialValue: V,
): V => {
	const keys = Object.keys(iterable) as (keyof T)[];

	let result = initialValue;

	for (const key of keys) {
		const value = iterable[key];
		result = iteratee(result, value, key, iterable);
	}

	return result;
};
