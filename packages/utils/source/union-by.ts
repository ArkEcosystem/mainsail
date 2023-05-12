import { flatten } from "./flatten";
import { uniqBy } from "./uniq-by";

export const unionBy = <T>(...arguments_: any[]): T[] => {
	const iteratee = arguments_.pop();

	return uniqBy(flatten(arguments_), iteratee);
};
