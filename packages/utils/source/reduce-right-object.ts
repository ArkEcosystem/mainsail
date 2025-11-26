import type { FunctionReturning } from "./internal/index.js";

export const reduceRightObject = <T extends Record<string, unknown>, V>(
	iterable: T,
	iteratee: FunctionReturning<[V | undefined, T[keyof T], keyof T, T], V | undefined>,
	initialValue?: V,
): V | undefined => {
	const keys = Object.keys(iterable) as (keyof T)[];

	let result: V | undefined = initialValue;

	for (let index = keys.length - 1; index >= 0; index--) {
		const key = keys[index];
		const value = iterable[key];

		result = iteratee(result, value, key, iterable);
	}

	return result;
};
