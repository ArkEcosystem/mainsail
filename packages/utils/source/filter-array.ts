import type { FunctionReturning } from "./internal/index.js";

export const filterArray = <T>(iterable: T[], iteratee: FunctionReturning<[T, number, T[]], unknown>): T[] => {
	const result: T[] = [];

	for (let index = 0; index < iterable.length; index++) {
		const item = iterable[index];
		if (iteratee(item, index, iterable)) {
			result.push(item);
		}
	}

	return result;
};
