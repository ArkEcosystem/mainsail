import { isArray } from "./is-array.js";

export const concat = <T>(...values: (T | T[])[]): T[] => {
	const result: T[] = [];

	for (const item of values) {
		if (isArray(item)) {
			const childLength: number = item.length;

			for (let index = 0; index < childLength; index++) {
				result.push(item[index]);
			}
		} else {
			result.push(item);
		}
	}

	return result;
};
