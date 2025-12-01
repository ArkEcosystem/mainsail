import type { FunctionReturning } from "./internal/index.js";
import { isArray } from "./is-array.js";
import { reduceArray } from "./reduce-array.js";
import { reduceObject } from "./reduce-object.js";

export const reduce = <TItem, TAccumulator>(
	iterable: TItem[] | Record<string, TItem>,
	iteratee: FunctionReturning<[TAccumulator, TItem, number | string, TItem[] | Record<string, TItem>], TAccumulator>,
	initialValue: TAccumulator,
): TAccumulator => {
	if (isArray(iterable)) {
		// Array branch
		return reduceArray(
			iterable as TItem[],
			iteratee as FunctionReturning<[TAccumulator, TItem, number, TItem[]], TAccumulator>,
			initialValue,
		);
	}

	// Object branch
	return reduceObject(
		iterable as Record<string, TItem>,
		iteratee as FunctionReturning<[TAccumulator, TItem, string, Record<string, TItem>], TAccumulator>,
		initialValue,
	);
};
