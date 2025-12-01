import type { FunctionReturning } from "./internal/index.js";

export const uniqBy = <T, K>(iterable: T[], iteratee: FunctionReturning<[T], K>): T[] => {
	const result: T[] = [];
	const set = new Set<K>();

	for (const element of iterable) {
		const value = iteratee(element);

		if (set.has(value)) {
			continue;
		}

		set.add(value);
		result.push(element);
	}

	return result;
};
