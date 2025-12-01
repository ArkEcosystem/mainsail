import { flatten } from "./flatten.js";
import type { FunctionReturning } from "./internal/types.js";
import { uniqBy } from "./uniq-by.js";

export const unionBy = <T>(...arguments_: T[]): T[] => {
	const iteratee = arguments_.pop() as FunctionReturning | undefined;
	if (!iteratee) {
		return [];
	}

	return uniqBy(flatten(arguments_), iteratee);
};
