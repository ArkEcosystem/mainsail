import { isArray } from "./is-array.js";
import { reduceRightArray } from "./reduce-right-array.js";
import { reduceRightObject } from "./reduce-right-object.js";

type ArrayIteratee<T, V> = (accumulator: V, current: T, index: number, array: T[]) => V;

type ObjectIteratee<T extends Record<string, unknown>, V> = (
	accumulator: V,
	value: T[keyof T],
	key: keyof T,
	object: T,
) => V;

export function reduceRight<T, V>(iterable: T[], iteratee: ArrayIteratee<T, V>, initialValue: V): V;

export function reduceRight<T extends Record<string, unknown>, V>(
	iterable: T,
	iteratee: ObjectIteratee<T, V>,
	initialValue: V,
): V;

export function reduceRight(
	iterable: unknown[] | Record<string, unknown>,
	iteratee: ArrayIteratee<unknown, unknown> | ObjectIteratee<Record<string, unknown>, unknown>,
	initialValue: unknown,
): unknown {
	return isArray(iterable)
		? reduceRightArray(iterable as unknown[], iteratee as ArrayIteratee<unknown, unknown>, initialValue)
		: reduceRightObject(
				iterable as Record<string, unknown>,
				iteratee as ObjectIteratee<Record<string, unknown>, unknown>,
				initialValue,
			);
}
