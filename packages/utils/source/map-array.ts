import { FunctionReturning } from "./internal";

export const mapArray = <T, R>(iterable: T[], iteratee: FunctionReturning): R[] => {
	const result: R[] = new Array(iterable.length);

	for (let index = 0; index < iterable.length; index++) {
		result[index] = iteratee(iterable[index], index, iterable);
	}

	return result;
};
