import { FunctionReturning } from "./internal";

export const mapValues = <T>(iterable: T, iteratee: FunctionReturning): object => {
	const keys: string[] = Object.keys(iterable);
	const result = {};

	for (const key of keys) {
		result[key] = iteratee(iterable[key], key, iterable);
	}

	return result;
};
