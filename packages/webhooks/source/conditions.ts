import type { BigNumberType } from "@mainsail/utils";
import { BigNumber } from "@mainsail/utils";

type Primitive = string | number | boolean;
type BigNumberish = Exclude<BigNumberType, bigint>;
type Range = { min: BigNumberish; max: BigNumberish };

const toBoolean = (value): boolean => value.toString().toLowerCase().trim() === "true";

const compareBigNumber = (
	value: BigNumberish,
	expected: BigNumberish,
	comparison: Extract<keyof BigNumber, "isGreaterThan" | "isGreaterThanEqual" | "isLessThan" | "isLessThanEqual">,
): boolean => {
	try {
		return BigNumber.make(value)[comparison](expected);
	} catch {
		return false;
	}
};

const contains = (actual: string, expected: string): boolean => actual.includes(expected);

const eq = (actual: Primitive, expected: Primitive): boolean => JSON.stringify(actual) === JSON.stringify(expected);

const falsy = (actual: Primitive): boolean => actual === false || !toBoolean(actual);

const gt = (actual: BigNumberish, expected: BigNumberish): boolean =>
	compareBigNumber(actual, expected, "isGreaterThan");

const gte = (actual: BigNumberish, expected: BigNumberish): boolean =>
	compareBigNumber(actual, expected, "isGreaterThanEqual");

const lt = (actual: BigNumberish, expected: BigNumberish): boolean => compareBigNumber(actual, expected, "isLessThan");

const lte = (actual: BigNumberish, expected: BigNumberish): boolean =>
	compareBigNumber(actual, expected, "isLessThanEqual");

const between = (actual: BigNumberish, expected: Range): boolean =>
	gt(actual, expected.min) && lt(actual, expected.max);

const ne = (actual: Primitive, expected: Primitive): boolean => !eq(actual, expected);

const notBetween = (actual: BigNumberish, expected: Range): boolean => !between(actual, expected);

const regexp = (actual: string, expected: string | RegExp): boolean => new RegExp(expected).test(actual);

const truthy = (actual: Primitive): boolean => actual === true || toBoolean(actual);

export const conditions = {
	between,
	contains,
	eq,
	falsy,
	gt,
	gte,
	lt,
	lte,
	ne,
	notBetween,
	regexp,
	truthy,
};
