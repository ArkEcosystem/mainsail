import { FunctionReturning } from "./internal";

export const some = <T>(iterable: T[], iteratee: FunctionReturning): boolean => {
	for (let index = 0; index < iterable.length; index++) {
		if (iteratee(iterable[index], index, iterable)) {
			return true;
		}
	}

	return false;
};
