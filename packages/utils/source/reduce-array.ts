import { type FunctionReturning } from "./internal/types.js";

export const reduceArray = <T, V>(
	iterable: T[],
	iteratee: FunctionReturning<[V, T, number, T[]], V>,
	initialValue: V,
): V => {
	let result = initialValue;

	for (let index = 0; index < iterable.length; index++) {
		result = iteratee(result, iterable[index], index, iterable);
	}

	return result;
};
