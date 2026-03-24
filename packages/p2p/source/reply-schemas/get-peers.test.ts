import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { headers } from "../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { constants } from "../constants";
import { getPeers } from "./get-peers";

type Context = {
	app: Application;
	validator: Contracts.Crypto.Validator;
};

describe<Context>("GetPeers Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach(async (context) => {
		data = {
			headers,
			peers: [{ ip: "127.0.0.1", port: 4000, protocol: Enums.Api.Protocol.Http }],
		};

		context.app = new Application();
		await prepareValidatorContext(context);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(getPeers, data);

		assert.undefined(result.error);
	});

	it("should not pass if peer.ip is missing", ({ validator }) => {
		const result = validator.validate(getPeers, {
			...data,
			peers: [{ port: 4000, protocol: Enums.Api.Protocol.Http }],
		});

		assert.defined(result.error);
	});

	it("should pass if peer.ip is ipv4 or ipv6", ({ validator }) => {
		let result = validator.validate(getPeers, {
			...data,
			peers: [{ ip: "127.0.0.1", port: 4000, protocol: Enums.Api.Protocol.Http }],
		});
		assert.undefined(result.error);

		result = validator.validate(getPeers, {
			...data,
			peers: [{ ip: "::1", port: 4000, protocol: Enums.Api.Protocol.Http }],
		});
		assert.undefined(result.error);

		result = validator.validate(getPeers, {
			...data,
			peers: [{ ip: 1, port: 4000, protocol: Enums.Api.Protocol.Http }],
		});
		assert.defined(result.error);
	});

	it("should not pass if peer.port is missing", ({ validator }) => {
		const result = validator.validate(getPeers, {
			...data,
			peers: [{ ip: "127.0.0.1", protocol: Enums.Api.Protocol.Http }],
		});

		assert.defined(result.error);
	});

	it("should not pass if peer.length > MAX_PEERS_GET_PEERS", ({ validator }) => {
		const result = validator.validate(getPeers, {
			...data,
			peers: new Array(constants.MAX_PEERS_GET_PEERS + 1).fill({
				ip: "127.0.0.1",
				port: 4000,
				protocol: Enums.Api.Protocol.Http,
			}),
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
