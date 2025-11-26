import type { FunctionReturning } from "./internal/index.js";

export const reduceRightArray = <T, V>(
	iterable: T[],
	iteratee: FunctionReturning<[V, T, number, T[]], V>,
	initialValue: V,
): V => {
	let result = initialValue;

	for (let index = iterable.length - 1; index >= 0; index--) {
		result = iteratee(result, iterable[index], index, iterable);
	}

	return result;
};
