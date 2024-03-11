import { filter } from "./filter.js";
import { FunctionReturning } from "./internal/index.js";

export const pullAllBy = <T>(iterable: T[], values: T[], iteratee: FunctionReturning): T[] => {
	const iterateeValues = {};

	return filter(iterable, (iterableItem) => {
		const itemValue = iteratee(iterableItem);

		if (!iterateeValues[itemValue]) {
			iterateeValues[itemValue] = values.map((value) => iteratee(value));
		}

		return !iterateeValues[itemValue].includes(itemValue);
	}) as T[];
};
