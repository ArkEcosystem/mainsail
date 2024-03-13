import { filterObject } from "./filter-object.js";
import { FunctionReturning } from "./internal/index.js";

export const findKey = <T extends {}>(iterable: T, iteratee: FunctionReturning): string =>
	Object.keys(filterObject(iterable, iteratee))[0];
