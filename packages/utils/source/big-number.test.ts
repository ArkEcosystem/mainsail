import BigNum from "bignumber.js";

import { describe } from "../../core-test-framework";
import { BigNumber } from "./big-number";

describe("#BigNumber", ({ it, assert }) => {
	it("should be created from hex", () => {
		assert.equal(new BigNumber("0x20").toFixed(), new BigNum("0x20", 16).toFixed());
	});

	it("should work with a BigNumber instance as input", () => {
		assert.equal(new BigNumber(1e8).plus(new BigNumber(1e8)).toFixed(), new BigNum(1e8).plus(1e8).toFixed());
	});

	it(".make", () => {
		assert.equal(BigNumber.make(1e8).plus(1e8).toFixed(), new BigNum(1e8).plus(1e8).toFixed());
	});

	it(".plus", () => {
		assert.equal(new BigNumber(1e8).plus(1e8).toFixed(), new BigNum(1e8).plus(1e8).toFixed());
	});

	it(".minus", () => {
		assert.equal(new BigNumber(1e8).minus(1e8).toFixed(), new BigNum(1e8).minus(1e8).toFixed());
	});

	it(".times", () => {
		assert.equal(new BigNumber(1e8).times(1e8).toFixed(), new BigNum(1e8).times(1e8).toFixed());
	});

	it(".dividedBy", () => {
		assert.equal(new BigNumber(1e8).dividedBy(1e8).toFixed(), new BigNum(1e8).dividedBy(1e8).toFixed());
	});

	it(".div", () => {
		assert.equal(new BigNumber(1e8).div(1e8).toFixed(), new BigNum(1e8).div(1e8).toFixed());
	});

	it(".isZero", () => {
		assert.true(new BigNumber(0).isZero());
	});

	it(".comparedTo", () => {
		assert.equal(new BigNumber(5).comparedTo(5), 0);
		assert.equal(new BigNumber(0).comparedTo(5), -1);
		assert.equal(new BigNumber(5).comparedTo(0), 1);
	});

	it(".isLessThan", () => {
		assert.true(new BigNumber(5).isLessThan(10));
	});

	it(".isLessThanEqual", () => {
		assert.true(new BigNumber(5).isLessThanEqual(10));
		assert.true(new BigNumber(5).isLessThanEqual(5));
	});

	it(".isGreaterThan", () => {
		assert.true(new BigNumber(10).isGreaterThan(5));
	});

	it(".isGreaterThanEqual", () => {
		assert.true(new BigNumber(10).isGreaterThanEqual(10));
		assert.true(new BigNumber(10).isGreaterThanEqual(5));
	});

	it(".isEqualTo", () => {
		assert.true(new BigNumber(10).isEqualTo(10));
	});

	it(".isNegative", () => {
		assert.true(new BigNumber(-10).isNegative());
	});

	it(".toFixed", () => {
		assert.equal(new BigNumber(1e8).toFixed(), `${1e8}`);
	});

	it(".toString", () => {
		assert.equal(new BigNumber(1e8).toString(), `${1e8}`);
		assert.equal(new BigNumber(255).toString(16), `ff`);
	});

	it(".toJSON", () => {
		assert.equal(new BigNumber(1e8).toJSON(), `${1e8}`);
	});

	it(".toBigInt", () => {
		assert.equal(new BigNumber(1e8).toBigInt(), BigInt(1e8));
		assert.equal(new BigNumber(255).toBigInt(), BigInt(255));
	});
});
