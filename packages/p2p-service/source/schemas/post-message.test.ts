import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { headers, makeValidator, requestError } from "../../test/helpers/schemas";

describe<{
	validator: Validator;
}>("postMessage schema", ({ it, assert, beforeEach }) => {
	const message = Buffer.from("message");

	beforeEach((context) => {
		context.validator = makeValidator();
	});

	it("request - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(requestError(validator, "postMessage", { headers, message }));
	});

	it("request - should not accept a request without the header", ({ validator }) => {
		assert.string(requestError(validator, "postMessage", { message }));
	});
});
