import { FunctionReturning } from "./internal/index.js";
import { isArray } from "./is-array.js";
import { mapArray } from "./map-array.js";
import { mapObject } from "./map-object.js";

export const map = <T extends Record<string, any>, R>(iterable: T | T[], iteratee: FunctionReturning): R | R[] =>
	isArray(iterable) ? mapArray(iterable, iteratee) : mapObject(iterable, iteratee);
