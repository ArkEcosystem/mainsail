import { FunctionReturning } from "./internal";

export const find = <T>(iterable: T[], iteratee: FunctionReturning): T | undefined => {
	for (let index = 0; index < iterable.length; index++) {
		const item: T = iterable[index];

		if (iteratee(item, index, iterable)) {
			return item;
		}
	}

	return undefined;
};
