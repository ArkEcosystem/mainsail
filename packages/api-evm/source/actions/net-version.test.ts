import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation";

import { describe, Sandbox } from "../../../test-framework/source";
import { NetVersion } from "./index.js";

describe<{
	sandbox: Sandbox;
	action: NetVersion;
	validator: Validator;
}>("NetVersion", ({ beforeEach, it, assert }) => {
	const version = "0.0.1";

	beforeEach(async (context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({
			get: () => "nethash",
		});

		context.action = context.sandbox.app.resolve(NetVersion);
		context.validator = context.sandbox.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "net_version");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		assert.equal(action.schema, {
			$id: "jsonRpc_net_version",
			maxItems: 0,
			type: "array",
		});

		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_net_version", []).errors);
		assert.defined(validator.validate("jsonRpc_net_version", [1]).errors);
		assert.defined(validator.validate("jsonRpc_net_version", {}).errors);
	});

	it("should return the web3 client version", async ({ action }) => {
		assert.equal(await action.handle([]), `nethash`);
	});
});
