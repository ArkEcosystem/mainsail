import "jest-extended";

import { cloneDeep } from "./clone-deep";

describe("#cloneDeep", () => {
	it("should work with objects", () => {
		const object = { a: 1 };

		expect(cloneDeep(object)).toEqual(object);
	});

	it("should work with class instances", () => {
		class Wallet {
			constructor(readonly address) {}

			public isDelegate() {
				return true;
			}
		}

		const original = new Wallet("address");

		expect(original).toEqual(original);
		expect(original.isDelegate()).toBeTrue();
		expect(original.address).toBe("address");

		const clone = cloneDeep(original);

		expect(clone).toEqual(original);
		expect(clone.isDelegate()).toBeTrue();
		expect(clone.address).toBe("address");
	});
});
