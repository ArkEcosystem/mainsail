import type { FunctionReturning } from "./internal/index.js";

export const filterArray = <T>(iterable: T[], iteratee: FunctionReturning<[T, number, T[]], unknown>): T[] => {
	const result: T[] = [];

	for (let i = 0; i < iterable.length; i++) {
		const item = iterable[i];
		if (iteratee(item, i, iterable)) {
			result.push(item);
		}
	}

	return result;
};
