import { filter } from "./filter.js";
import { FunctionReturning } from "./internal/index.js";

export const reject = <T>(iterable: T[], iteratee: FunctionReturning): T[] =>
	filter(iterable, (item) => !iteratee(item)) as T[];
