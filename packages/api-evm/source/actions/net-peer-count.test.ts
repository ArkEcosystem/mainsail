import { Identifiers } from "@mainsail/contracts";
import { Validator } from "@mainsail/validation";

import { describe, Sandbox } from "../../../test-framework/source";
import { NetPeerCountAction } from "./index.js";

describe<{
	sandbox: Sandbox;
	action: NetPeerCountAction;
	validator: Validator;
	state: any;
}>("NetPeerCountAction", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.state = {
			peerCount: 0,
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Evm.State).toConstantValue(context.state);

		context.action = context.sandbox.app.resolve(NetPeerCountAction);
		context.validator = context.sandbox.app.resolve(Validator);
	});

	it("should have a name", ({ action }) => {
		assert.equal(action.name, "net_peerCount");
	});

	it("schema should be array with 0 parameters", ({ action, validator }) => {
		assert.equal(action.schema, {
			$id: "jsonRpc_net_peerCount",
			maxItems: 0,
			type: "array",
		});

		validator.addSchema(action.schema);

		assert.undefined(validator.validate("jsonRpc_net_peerCount", []).errors);
		assert.defined(validator.validate("jsonRpc_net_peerCount", [1]).errors);
		assert.defined(validator.validate("jsonRpc_net_peerCount", {}).errors);
	});

	it("should return true", async ({ action, state }) => {
		assert.equal(await action.handle([]), 0);

		state.peerCount = 1;
		assert.equal(await action.handle([]), 1);
	});
});
