import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { Web3Sha3 } from "./index.js";

describe<{
	app: Application;
	action: Web3Sha3;
	validator: Contracts.Crypto.Validator;
}>("Web3Sha3", ({ beforeEach, it, assert }) => {
	const version = "0.0.1";

	beforeEach(async (context) => {
		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();
		context.app.bind(Identifiers.Application.Version).toConstantValue(version);

		context.action = context.app.resolve(Web3Sha3);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "web3_sha3");
	});

	it("schema should validate a single prefixed data hex string", ({ action, validator }) => {
		assert.equal(action.schema, {
			$id: `jsonRpc_web3_sha3`,
			maxItems: 1,
			minItems: 1,

			prefixItems: [{ $ref: "prefixedDataHex" }],
			type: "array",
		});

		validator.addSchema(action.schema);

		// DATA is a byte string: empty "0x" and even-length hex are valid.
		assert.undefined(validator.validate("jsonRpc_web3_sha3", ["0x"]).errors);
		assert.undefined(validator.validate("jsonRpc_web3_sha3", ["0x00"]).errors);
		// odd-length hex is not a valid byte string.
		assert.defined(validator.validate("jsonRpc_web3_sha3", ["0x0"]).errors);
		assert.defined(validator.validate("jsonRpc_web3_sha3", ["0x00", ""]).errors);
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
