import { describe } from "@arkecosystem/core-test-framework";

import { SocketErrors } from "../../enums";
import { validate } from "./validate";

describe("validate", ({ it, assert, spy, stub }) => {
	const validator = {
		validate: () => ({}),
	};

	it("should validate using crypto validate()", () => {
		const spyValidate = spy(validator, "validate");

		const schema = { maxProperties: 0, type: "object" };
		const data = {};
		validate(schema, data, validator);

		spyValidate.calledOnce();
		spyValidate.calledWith(schema, data);
	});

	it("should throw if crypto validate() returns errors", () => {
		const expectedError = new Error("Data validation error : data must NOT have more than 0 items");
		expectedError.name = SocketErrors.Validation;

		const spyValidate = stub(validator, "validate").returnValue({ error: expectedError });
		const schema = { maxProperties: 0, type: "object" };
		const data = { oneProp: "1" };

		assert.throws(() => validate(schema, data, validator), expectedError);

		spyValidate.calledOnce();
		spyValidate.calledWith(schema, data);
	});
});
