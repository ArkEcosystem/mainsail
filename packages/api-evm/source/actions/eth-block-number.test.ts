import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation";

import { describe, Sandbox } from "../../../test-framework/source";
import { EthBlockNumberAction } from "./index.js";

describe<{
	sandbox: Sandbox;
	action: EthBlockNumberAction;
	validator: Validator;
	store: any;
}>("EthBlockNumberAction", ({ beforeEach, it, assert }) => {
	let height = 0;

	beforeEach(async (context) => {
		context.store = {
			getHeight() {
				return height;
			},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.State.Store).toConstantValue(context.store);

		context.action = context.sandbox.app.resolve(EthBlockNumberAction);
		context.validator = context.sandbox.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "eth_blockNumber");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		assert.equal(action.schema, {
			$id: "jsonRpc_eth_blockNumber",
			maxItems: 0,
			type: "array",
		});

		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_eth_blockNumber", []).errors);
		assert.defined(validator.validate("jsonRpc_eth_blockNumber", [1]).errors);
		assert.defined(validator.validate("jsonRpc_eth_blockNumber", {}).errors);
	});

	it("should return true", async ({ action }) => {
		assert.equal(await action.handle([]), "0x0");

		height = 1;
		assert.equal(await action.handle([]), "0x1");

		height = 10;
		assert.equal(await action.handle([]), "0xa");

		height = 20;
		assert.equal(await action.handle([]), "0x14");
	});
});
