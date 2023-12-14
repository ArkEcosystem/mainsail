import { FunctionReturning } from "./internal";

export const mapObject = <T extends {}, R>(iterable: T, iteratee: FunctionReturning): R[] => {
	const keys: string[] = Object.keys(iterable);
	const result: R[] = Array.from({length: keys.length});

	for (const [index, key] of keys.entries()) {
		result[index] = iteratee(iterable[key], key, iterable);
	}

	return result;
};
