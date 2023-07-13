import { Validator } from "@mainsail/validation/source/validator";

import { schemas as cryptoBlockSchemas } from "../../../crypto-block/distribution";
import { schemas as cryptoValidationSchemas } from "../../../crypto-validation/distribution";
import { describe, Sandbox } from "../../../test-framework/distribution";
import { headers } from "../../test/fixtures/responses/headers";
import { constants } from "../constants";
import { getPeers } from "./get-peers";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("GetPeers Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach((context) => {
		data = {
			headers,
			peers: [{ ip: "127.0.0.1", port: 4000 }],
		};

		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		context.validator.addSchema(cryptoValidationSchemas.hex);
		context.validator.addSchema(cryptoBlockSchemas.blockId);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(getPeers, data);

		assert.undefined(result.error);
	});

	it("should not pass if peer.ip is missing", ({ validator }) => {
		const result = validator.validate(getPeers, { ...data, peers: [{ port: 4000 }] });

		assert.defined(result.error);
	});

	it("should pass if peer.ip is ipv4 or ipv6", ({ validator }) => {
		let result = validator.validate(getPeers, { ...data, peers: [{ ip: "127.0.0.1", port: 4000 }] });
		assert.undefined(result.error);

		result = validator.validate(getPeers, { ...data, peers: [{ ip: "::1", port: 4000 }] });
		assert.undefined(result.error);

		result = validator.validate(getPeers, { ...data, peers: [{ ip: 1, port: 4000 }] });
		assert.defined(result.error);
	});

	it("should not pass if peer.port is missing", ({ validator }) => {
		const result = validator.validate(getPeers, { ...data, peers: [{ ip: "127.0.0.1" }] });

		assert.defined(result.error);
	});

	it("should not pass if peer.length > MAX_PEERS_GET_PEERS", ({ validator }) => {
		const result = validator.validate(getPeers, {
			...data,
			peers: new Array(constants.MAX_PEERS_GET_PEERS + 1).fill({ ip: "127.0.0.1", port: 4000 }),
		});

		assert.defined(result.error);
	});

	each(
		"should not pass if required property is not defined",
		({ context, dataset }) => {
			delete data[dataset];
			const result = context.validator.validate(getPeers, data);

			assert.defined(result.error);
		},
		["peers", "headers"],
	);
});
