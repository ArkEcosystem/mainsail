import { FunctionReturning } from "./internal/index.js";
import { isArray } from "./is-array.js";
import { reduceArray } from "./reduce-array.js";
import { reduceObject } from "./reduce-object.js";

export const reduce = <T extends {}, V>(
	iterable: T | T[],
	iteratee: FunctionReturning,
	initialValue: V,
): V | V[] | undefined =>
	isArray(iterable) ? reduceArray(iterable, iteratee, initialValue) : reduceObject(iterable, iteratee, initialValue);
