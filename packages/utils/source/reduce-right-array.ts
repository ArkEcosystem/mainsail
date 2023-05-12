import { FunctionReturning } from "./internal";

export const reduceRightArray = <T, V>(iterable: T[], iteratee: FunctionReturning, initialValue: V): V => {
	let result: V = initialValue;

	for (let index = iterable.length - 1; index >= 0; index--) {
		result = iteratee(result, iterable[index], index, iterable);
	}

	return result;
};
