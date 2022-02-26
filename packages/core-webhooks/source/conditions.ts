import { BigNumber } from "@arkecosystem/utils";

const toBoolean = (value): boolean => (value.toString().toLowerCase().trim() === "true" ? true : false);

const compareBigNumber = (value, expected, comparison): boolean => {
	try {
		return BigNumber.make(value)[comparison](expected);
	} catch {
		return false;
	}
};

const contains = (actual, expected): boolean => actual.includes(expected);

const eq = (actual, expected): boolean => JSON.stringify(actual) === JSON.stringify(expected);

const falsy = (actual): boolean => actual === false || !toBoolean(actual);

const gt = (actual, expected): boolean => compareBigNumber(actual, expected, "isGreaterThan");

const gte = (actual, expected): boolean => compareBigNumber(actual, expected, "isGreaterThanEqual");

const lt = (actual, expected): boolean => compareBigNumber(actual, expected, "isLessThan");

const lte = (actual, expected): boolean => compareBigNumber(actual, expected, "isLessThanEqual");

const between = (actual, expected): boolean => gt(actual, expected.min) && lt(actual, expected.max);

const ne = (actual, expected): boolean => !eq(actual, expected);

const notBetween = (actual, expected): boolean => !between(actual, expected);

const regexp = (actual, expected): boolean => new RegExp(expected).test(actual);

const truthy = (actual): boolean => actual === true || toBoolean(actual);

export const conditions = {
	contains,
	eq,
	falsy,
	gt,
	gte,
	lt,
	lte,
	between,
	ne,
	notBetween,
	regexp,
	truthy,
};
