import { describe } from "@mainsail/test-runner";

import { makeKeywords } from "./keywords.js";

describe<{
	stateStore: any;
}>("makeKeywords", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.stateStore = {
			getBlockNumber: () => 100,
		};
	});

	it("should return the currentHeight keyword definition", ({ stateStore }) => {
		const { currentHeight } = makeKeywords(stateStore);

		assert.is(currentHeight.keyword, "currentHeightHex");
		assert.equal(currentHeight.metaSchema, { type: "boolean" });
		assert.false(currentHeight.errors);
	});

	it("should compile a validate fn returning true when Number(data) equals current block number", ({
		stateStore,
	}) => {
		const { currentHeight } = makeKeywords(stateStore);
		const validate = currentHeight.compile!(true, {} as any, {} as any);

		assert.true(validate(100, {} as any));
		assert.true(validate("100", {} as any));
		assert.true(validate("0x64", {} as any));
	});

	it("should compile a validate fn returning false when Number(data) differs", ({ stateStore }) => {
		const { currentHeight } = makeKeywords(stateStore);
		const validate = currentHeight.compile!(true, {} as any, {} as any);

		assert.false(validate(99, {} as any));
		assert.false(validate("101", {} as any));
		assert.false(validate("not-a-number", {} as any));
	});

	it("should reflect the live block number from the store", ({ stateStore }) => {
		const { currentHeight } = makeKeywords(stateStore);
		const validate = currentHeight.compile!(true, {} as any, {} as any);

		assert.false(validate(200, {} as any));
		stateStore.getBlockNumber = () => 200;
		assert.true(validate(200, {} as any));
	});
});
