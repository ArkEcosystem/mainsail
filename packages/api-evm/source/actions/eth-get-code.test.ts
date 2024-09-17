import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation";

import { describe, Sandbox } from "../../../test-framework/source";
import { EthGetCodeAction } from "./index.js";

describe<{
	sandbox: Sandbox;
	action: EthGetCodeAction;
	validator: Validator;
	evm: any;
}>("EthGetCodeAction", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.evm = {
			codeAt: () => "0x0",
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Evm.Instance).toConstantValue(context.evm);

		context.action = context.sandbox.app.resolve(EthGetCodeAction);
		context.validator = context.sandbox.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_getCode");
	});

	it("schema should be ok", ({ action, validator }) => {
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
			validator.validate("jsonRpc_eth_getCode", ["0x0000000000000000000000000000000000000000", "latest"]).errors,
		);
		assert.defined(validator.validate("jsonRpc_eth_getCode", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_getCode", {}).errors);
	});

	it("should return code", async ({ action }) => {
		assert.equal(await action.handle(["0x0000000000", "latest"]), "0x0");
	});
});
