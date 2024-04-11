import { filterArray } from "./filter-array.js";
import { filterObject } from "./filter-object.js";
import { FunctionReturning } from "./internal/index.js";
import { isArray } from "./is-array.js";

export const filter = <T extends {}>(iterable: T | T[], iteratee: FunctionReturning): T | T[] =>
	isArray(iterable) ? filterArray(iterable, iteratee) : filterObject(iterable, iteratee);
