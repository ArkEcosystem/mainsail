import { FunctionReturning } from "./internal";

export const findIndex = <T>(iterable: T[], iteratee: FunctionReturning): number => {
	for (let index = 0; index < iterable.length; index++) {
		if (iteratee(iterable[index], index, iterable)) {
			return index;
		}
	}

	return -1;
};
