import { cloneArray } from "./clone-array.js";
import { cloneObject } from "./clone-object.js";
import { isArray } from "./is-array.js";

export const clone = <T extends {}>(iterable: T | T[]): T | T[] =>
	isArray(iterable) ? cloneArray(iterable) : cloneObject(iterable);
