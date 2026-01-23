import { Validator } from "@mainsail/validation";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { NetListeningAction } from "./index.js";

describe<{
	app: Application;
	action: NetListeningAction;
	validator: Validator;
}>("NetListeningAction", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		context.action = context.app.resolve(NetListeningAction);
		context.validator = context.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "net_listening");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		assert.equal(action.schema, {
			$id: "jsonRpc_net_listening",
			maxItems: 0,
			type: "array",
		});

		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_net_listening", []).errors);
		assert.defined(validator.validate("jsonRpc_net_listening", [1]).errors);
		assert.defined(validator.validate("jsonRpc_net_listening", {}).errors);
	});

	it("should return true", async ({ action }) => {
		assert.equal(await action.handle([]), true);
	});
});
