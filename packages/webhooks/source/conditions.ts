import type { Contracts } from "@mainsail/contracts";

const toBoolean = (value): boolean => value.toString().toLowerCase().trim() === "true";

const compareBigNumber = (
	value: Contracts.Webhooks.BigNumberType,
	expected: Contracts.Webhooks.BigNumberType,
	comparison: "isGreaterThan" | "isGreaterThanEqual" | "isLessThan" | "isLessThanEqual",
): boolean => {
	try {
		const v = BigInt(value);
		const e = BigInt(expected);

		switch (comparison) {
			case "isGreaterThan": {
				return v > e;
			}
			case "isGreaterThanEqual": {
				return v >= e;
			}
			case "isLessThan": {
				return v < e;
			}
			case "isLessThanEqual": {
				return v <= e;
			}
		}
	} catch {
		return false;
	}
};

const contains = (actual: string, expected: string): boolean => actual.includes(expected);

const eq = (actual: Contracts.Webhooks.ConditionPrimitive, expected: Contracts.Webhooks.ConditionPrimitive): boolean =>
	JSON.stringify(actual) === JSON.stringify(expected);

const falsy = (actual: Contracts.Webhooks.ConditionPrimitive): boolean => actual === false || !toBoolean(actual);

const gt = (actual: Contracts.Webhooks.BigNumberType, expected: Contracts.Webhooks.BigNumberType): boolean =>
	compareBigNumber(actual, expected, "isGreaterThan");

const gte = (actual: Contracts.Webhooks.BigNumberType, expected: Contracts.Webhooks.BigNumberType): boolean =>
	compareBigNumber(actual, expected, "isGreaterThanEqual");

const lt = (actual: Contracts.Webhooks.BigNumberType, expected: Contracts.Webhooks.BigNumberType): boolean =>
	compareBigNumber(actual, expected, "isLessThan");

const lte = (actual: Contracts.Webhooks.BigNumberType, expected: Contracts.Webhooks.BigNumberType): boolean =>
	compareBigNumber(actual, expected, "isLessThanEqual");

const between = (actual: Contracts.Webhooks.BigNumberType, expected: Contracts.Webhooks.ConditionRange): boolean =>
	gt(actual, expected.min) && lt(actual, expected.max);

const ne = (actual: Contracts.Webhooks.ConditionPrimitive, expected: Contracts.Webhooks.ConditionPrimitive): boolean =>
	!eq(actual, expected);

const notBetween = (actual: Contracts.Webhooks.BigNumberType, expected: Contracts.Webhooks.ConditionRange): boolean =>
	!between(actual, expected);

const regexp = (actual: string, expected: string | RegExp): boolean => new RegExp(expected).test(actual);

const truthy = (actual: Contracts.Webhooks.ConditionPrimitive): boolean => actual === true || toBoolean(actual);

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
