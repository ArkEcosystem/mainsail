import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { headers, makeValidator, requestError, responseError } from "../../test/helpers/schemas";

describe<{
	validator: Validator;
}>("getBlocks schema", ({ it, assert, beforeEach, each }) => {
	beforeEach((context) => {
		context.validator = makeValidator();
	});

	it("request - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(requestError(validator, "getBlocks", { fromBlockNumber: 1, headers, limit: 400 }));
	});

	it("request - should accept a request from the genesis block", ({ validator }) => {
		assert.undefined(requestError(validator, "getBlocks", { fromBlockNumber: 0, headers, limit: 1 }));
	});

	it("request - should not accept a request without the header", ({ validator }) => {
		assert.string(requestError(validator, "getBlocks", { fromBlockNumber: 1, limit: 400 }));
	});

	each(
		"request - should not accept",
		({ dataset: [, limit], context }) => {
			assert.string(requestError(context.validator, "getBlocks", { fromBlockNumber: 1, headers, limit }));
		},
		[
			["no limit", 0],
			["a limit above the largest batch", 401],
		] as [string, number][],
	);

	it("response - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(responseError(validator, "getBlocks", { blocks: [Buffer.from("block")], headers }));
	});

	it("response - should accept no blocks and the largest batch", ({ validator }) => {
		assert.undefined(responseError(validator, "getBlocks", { blocks: [], headers }));
		assert.undefined(
			responseError(validator, "getBlocks", {
				blocks: Array.from({ length: 400 }, () => Buffer.from("b")),
				headers,
			}),
		);
	});

	it("response - should not accept a response without the header", ({ validator }) => {
		assert.string(responseError(validator, "getBlocks", { blocks: [] }));
	});

	it("response - should not accept more blocks than the largest batch", ({ validator }) => {
		assert.string(
			responseError(validator, "getBlocks", {
				blocks: Array.from({ length: 401 }, () => Buffer.from("b")),
				headers,
			}),
		);
	});
});
