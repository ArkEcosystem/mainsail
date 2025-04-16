import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation";
import { schemas as cryptoValidationSchemas } from "@mainsail/crypto-validation";

import { describe, Sandbox } from "../../../test-framework/source";
import { Web3Sha3 } from "./index.js";

describe<{
	sandbox: Sandbox;
	action: Web3Sha3;
	validator: Validator;
}>("Web3Sha3", ({ beforeEach, it, assert }) => {
	const version = "0.0.1";

	beforeEach(async (context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Application.Version).toConstantValue(version);

		context.action = context.sandbox.app.resolve(Web3Sha3);
		context.validator = context.sandbox.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "web3_sha3");
	});

	it("schema should be ok", ({ action, validator }) => {
		validator.addSchema(cryptoValidationSchemas.prefixedQuantityHex);

		assert.equal(action.schema, {
			$id: `jsonRpc_web3_sha3`,
			maxItems: 1,
			minItems: 1,

			prefixItems: [{ $ref: "prefixedQuantityHex" }],
			type: "array",
		});

		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_web3_sha3", ["0x0"]).errors);
		assert.defined(validator.validate("jsonRpc_web3_sha3", ["0x0", ""]).errors);
		assert.defined(validator.validate("jsonRpc_web3_sha3", [1]).errors);
		assert.defined(validator.validate("jsonRpc_web3_sha3", {}).errors);
	});

	it("should return the keccak256 of provided data", async ({ action }) => {
		assert.equal(
			await action.handle(["0x68656c6c6f20776f726c64"]),
			"0x47173285a8d7341e5e972fc677286384f802f8ef42a5ec5f03bbfa254cb01fad",
		);
	});
});
