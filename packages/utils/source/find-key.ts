import { filterObject } from "./filter-object";
import { FunctionReturning } from "./internal";

export const findKey = <T extends {}>(iterable: T, iteratee: FunctionReturning): string =>
	Object.keys(filterObject(iterable, iteratee))[0];
