import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation";

import { describeSkip, Sandbox } from "../../../test-framework/source";
import { EthGetTransactionCount } from "./index.js";

describeSkip<{
	sandbox: Sandbox;
	action: EthGetTransactionCount;
	validator: Validator;
	evm: any;
}>("EthGetTransactionCount", ({ beforeEach, it, assert }) => {
	const balance = BigInt(0);
	let nonce = BigInt(0);

	beforeEach(async (context) => {
		context.evm = {
			getAccountInfo: () => ({
					balance,
					nonce,
				})
		}

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);

		context.action = context.sandbox.app.resolve(EthGetTransactionCount);
		context.validator = context.sandbox.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getTransactionCount");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		validator.addSchema({
			$id: "address",
			allOf: [
				{
					maxLength: 42,
					minLength: 42,
					pattern: "^0x[0123456789a-fA-F]+$",
				},
			],
			type: "string",
		});
		validator.addSchema(action.schema);

		assert.undefined(
			validator.validate("jsonRpc_eth_getTransactionCount", [
				"0x0000000000000000000000000000000000000000",
				"latest",
			]).errors,
		);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionCount", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getTransactionCount", {}).errors);
	});

	it("should return true", async ({ action }) => {
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x0");

		nonce = BigInt(20);
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x14");
	});
});
