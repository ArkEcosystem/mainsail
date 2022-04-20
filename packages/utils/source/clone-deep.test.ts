import { describe } from "../../core-test-framework";
import { cloneDeep } from "./clone-deep";

describe("#cloneDeep", ({ it, assert }) => {
	it("should work with objects", () => {
		const object = { a: 1 };

		assert.equal(cloneDeep(object), object);
	});

	it("should work with class instances", () => {
		class Wallet {
			constructor(readonly address) {}

			public isDelegate() {
				return true;
			}
		}

		const original = new Wallet("address");

		assert.equal(original, original);
		assert.true(original.isDelegate());
		assert.equal(original.address, "address");

		const clone = cloneDeep(original);

		assert.equal(clone, original);
		assert.true(clone.isDelegate());
		assert.equal(clone.address, "address");
	});
});
