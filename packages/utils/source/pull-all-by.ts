import type { FunctionReturning } from "./internal/index.js";

import { filter } from "./filter.js";

export const pullAllBy = <T, K>(iterable: T[], values: T[], iteratee: FunctionReturning<[T], K>): T[] => {
	const iterateeValues = new Map<K, K[]>();

	return filter(iterable, (iterableItem) => {
		const itemValue = iteratee(iterableItem);

		let cached = iterateeValues.get(itemValue);
		if (!cached) {
			cached = values.map((value) => iteratee(value));
			iterateeValues.set(itemValue, cached);
		}

		return !cached.includes(itemValue);
	}) as T[];
};
