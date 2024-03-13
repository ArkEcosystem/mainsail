import { flatten } from "./flatten.js";
import { uniqBy } from "./uniq-by.js";

export const unionBy = <T>(...arguments_: any[]): T[] => {
	const iteratee = arguments_.pop();

	return uniqBy(flatten(arguments_), iteratee);
};
