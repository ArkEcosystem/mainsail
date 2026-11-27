import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { headers, makeValidator, requestError, responseError } from "../../test/helpers/schemas";

describe<{
	validator: Validator;
}>("getApiNodes schema", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.validator = makeValidator();
	});

	it("request - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(requestError(validator, "getApiNodes", { headers }));
	});

	it("request - should not accept a request without the header", ({ validator }) => {
		assert.string(requestError(validator, "getApiNodes", {}));
	});

	const apiNode = { url: "https://api.example.com/api" };

	it("response - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(responseError(validator, "getApiNodes", { apiNodes: [apiNode], headers }));
	});

	it("response - should accept no nodes and the largest list", ({ validator }) => {
		assert.undefined(responseError(validator, "getApiNodes", { apiNodes: [], headers }));
		assert.undefined(
			responseError(validator, "getApiNodes", { apiNodes: Array.from({ length: 100 }, () => apiNode), headers }),
		);
	});

	it("response - should not accept a response without the header", ({ validator }) => {
		assert.string(responseError(validator, "getApiNodes", { apiNodes: [apiNode] }));
	});

	it("response - should not accept more nodes than the largest list", ({ validator }) => {
		assert.string(
			responseError(validator, "getApiNodes", { apiNodes: Array.from({ length: 101 }, () => apiNode), headers }),
		);
	});

	it("response - should not accept a url longer than 2048 characters", ({ validator }) => {
		const url = `https://api.example.com/${"a".repeat(2048)}`;

		assert.string(responseError(validator, "getApiNodes", { apiNodes: [{ url }], headers }));
	});
});
