import { Utils } from "@arkecosystem/crypto";
import { FindOperator } from "typeorm";
import { describe } from "../../../core-test-framework";

import { transformBigInt, transformVendorField } from "./transform";

describe("transformBigInt.from", ({ assert, beforeEach, it, stub }) => {
	it("should transform string value to BigNumber", () => {
		const original = "5";
		const transformed = transformBigInt.from(original);
		assert.equal(transformed, Utils.BigNumber.make("5"));
	});

	it("should not transform undefined value", () => {
		const original = undefined;
		const transformed = transformBigInt.from(original);
		assert.undefined(transformed);
	});
});

describe("transformBigInt.to", ({ assert, beforeEach, it, stub }) => {
	it("should transform BigNumber value to string", () => {
		const original = Utils.BigNumber.make("5");
		const transformed = transformBigInt.to(original);
		assert.equal(transformed, "5");
	});

	it("should return FindOperator.value", () => {
		const original = new FindOperator("equal", Utils.BigNumber.make("5"));
		const transformed = transformBigInt.to(original);
		assert.equal(transformed, Utils.BigNumber.make("5"));
	});
});

describe("transformVendorField.from", ({ assert, beforeEach, it, stub }) => {
	it("should transform string value to BigNumber", () => {
		const original = Buffer.from("hello world", "utf-8");
		const transformed = transformVendorField.from(original);
		assert.equal(transformed, "hello world");
	});

	it("should not transform undefined value", () => {
		const original = undefined;
		const transformed = transformVendorField.from(original);
		assert.undefined(transformed);
	});
});

describe("transformVendorField.to", ({ assert, beforeEach, it, stub }) => {
	it("should transform BigNumber value to string", () => {
		const original = "hello world";
		const transformed = transformVendorField.to(original);
		assert.equal(transformed, Buffer.from("hello world", "utf-8"));
	});

	it("should return FindOperator.value", () => {
		const original = new FindOperator("equal", "hello world");
		const transformed = transformVendorField.to(original);
		assert.equal(transformed, Buffer.from("hello world", "utf-8"));
	});
});
