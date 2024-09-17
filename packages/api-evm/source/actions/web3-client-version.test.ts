import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation";

import { describe, Sandbox } from "../../../test-framework/source";
import { Web3ClientVersionAction } from "./index.js";

describe<{
	sandbox: Sandbox;
	action: Web3ClientVersionAction;
	validator: Validator;
}>("Web3ClientVersionAction", ({ beforeEach, it, assert }) => {
	const version = "0.0.1";

	beforeEach(async (context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Application.Version).toConstantValue(version);

		context.action = context.sandbox.app.resolve(Web3ClientVersionAction);
		context.validator = context.sandbox.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "web3_clientVersion");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		assert.equal(action.schema, {
			$id: "jsonRpc_web3_clientVersion",
			maxItems: 0,
			type: "array",
		});

		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_web3_clientVersion", []).errors);
		assert.defined(validator.validate("jsonRpc_web3_clientVersion", [1]).errors);
		assert.defined(validator.validate("jsonRpc_web3_clientVersion", {}).errors);
	});

	it("should return the web3 client version", async ({ action }) => {
		assert.equal(
			await action.handle([]),
			`@mainsail/core/${version}/${process.platform}-${process.arch}/node-${process.version}`,
		);
	});
});
