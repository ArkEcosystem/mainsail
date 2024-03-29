import { FunctionReturning } from "./internal/index.js";
import { mapArray } from "./map-array.js";

export const maxBy = <T>(iterable: T[], iteratee: FunctionReturning): T => {
	const values: number[] = mapArray<T, number>(iterable, iteratee);

	let index = 0;
	let smallest: number = values[index];

	for (const [index_, value] of values.entries()) {
		if (value > smallest) {
			smallest = value;
			index = index_;
		}
	}

	return iterable[index];
};
