import { Validation } from "@arkecosystem/crypto";
import { SocketErrors } from "@packages/core-p2p/source/enums";
import { validate } from "@packages/core-p2p/source/socket-server/utils/validate";

describe("validate", () => {
	it("should validate using crypto validate()", () => {
		const spyValidate = jest.spyOn(Validation.validator, "validate");

		const schema = { type: "object", maxProperties: 0 };
		const data = {};
		validate(schema, data);

		expect(spyValidate).toBeCalledWith(schema, data);
	});

	it("should throw if crypto validate() returns errors", () => {
		const spyValidate = jest.spyOn(Validation.validator, "validate");

		const schema = { type: "object", maxProperties: 0 };
		const data = { oneProp: "1" };
		const expectedError = new Error("Data validation error : data must NOT have more than 0 items");
		expectedError.name = SocketErrors.Validation;

		expect(() => validate(schema, data)).toThrow(expectedError);

		expect(spyValidate).toBeCalledWith(schema, data);
	});
});
