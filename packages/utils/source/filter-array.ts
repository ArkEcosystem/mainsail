import { FunctionReturning } from "./internal";

export const filterArray = <T>(iterable: T[], iteratee: FunctionReturning): T[] => {
	const result: T[] = [];

	for (let index = 0; index < iterable.length; index++) {
		if (iteratee(iterable[index], index, iterable)) {
			result.push(iterable[index]);
		}
	}

	return result;
};
