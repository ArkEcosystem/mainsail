import { FunctionReturning } from "./internal";

export const filterObject = <T>(iterable: T, iteratee: FunctionReturning): T => {
	const keys = Object.keys(iterable);
	const length: number = keys.length;
	const result = {};

	for (let index = 0; index < length; index++) {
		const key = keys[index];

		if (iteratee(iterable[key], key, iterable)) {
			result[key] = iterable[key];
		}
	}

	return result as T;
};
