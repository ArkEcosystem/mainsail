import { FunctionReturning } from "./internal";

export const reduceObject = <T, V>(iterable: T, iteratee: FunctionReturning, initialValue: V): V => {
	const keys: string[] = Object.keys(iterable);

	let result: V = initialValue;

	for (const key of keys) {
		result = iteratee(result, iterable[key], key, iterable);
	}

	return result;
};
