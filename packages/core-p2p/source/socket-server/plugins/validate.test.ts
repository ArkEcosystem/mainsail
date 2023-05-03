import { Contracts, Identifiers } from "@mainsail/core-contracts";
import { describe, Sandbox } from "../../../../core-test-framework";
import { Server } from "@hapi/hapi";
import Joi from "joi";
import rewiremock from "rewiremock";

import { ValidatePlugin } from "./validate";

describe<{
	sandbox: Sandbox;
	validatePlugin: ValidatePlugin;
}>("ValidatePlugin", ({ it, assert, beforeEach, spy, match, stub }) => {
	const utils = {
		isValidVersion: () => true,
	};

	const { ValidatePlugin: ValidatePluginProxy } = rewiremock.proxy<{
		ValidatePlugin: Contracts.Types.Class<ValidatePlugin>;
	}>("./validate", {
		"../../utils": utils,
	});

	const logger = { debug: () => {}, warning: () => {} };

	const responsePayload = { status: "ok" };
	const mockRouteByPath = {
		"/p2p/peer/mockroute": {
			handler: () => responsePayload,
			id: "p2p.peer.getPeers",
			validation: Joi.object().max(0),
		},
	};
	const mockRoute = {
		config: {
			handler: mockRouteByPath["/p2p/peer/mockroute"].handler,
			id: mockRouteByPath["/p2p/peer/mockroute"].id,
		},
		method: "POST",
		path: "/p2p/peer/mockroute",
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);

		context.validatePlugin = context.sandbox.app.resolve(ValidatePluginProxy);
	});

	it("should register the validate plugin", async ({ validatePlugin, sandbox }) => {
		stub(sandbox.app, "resolve").returnValue({ getRoutesConfigByPath: () => mockRouteByPath });

		const server = new Server({ port: 4100 });
		server.route(mockRoute);

		const spyExtension = spy(server, "ext");

		validatePlugin.register(server);

		spyExtension.calledOnce();
		spyExtension.calledWith(match.has("type", "onPostAuth"));

		// try the route with a valid payload
		const responseValid = await server.inject({
			method: "POST",
			payload: {},
			url: "/p2p/peer/mockroute",
		});

		assert.equal(JSON.parse(responseValid.payload), responsePayload);
		assert.equal(responseValid.statusCode, 200);

		// try with an invalid payload
		const responseInvalid = await server.inject({
			method: "POST",
			payload: { unwantedProp: 1 },
			url: "/p2p/peer/mockroute",
		});

		assert.equal(responseInvalid.statusCode, 400);
		assert.equal(responseInvalid.result, {
			error: "Bad Request",
			message: "Validation failed",
			statusCode: 400,
		});

		// try with an invalid version
		const spyIsValidVersion = stub(utils, "isValidVersion").returnValue(false);

		const responseInvalidVersion = await server.inject({
			method: "POST",
			payload: { headers: { version: "2.0.0" } },
			url: "/p2p/peer/mockroute",
		});

		spyIsValidVersion.calledOnce();
		assert.equal(responseInvalidVersion.statusCode, 400);
		assert.equal(responseInvalidVersion.result, {
			error: "Bad Request",
			message: "Validation failed (invalid version)",
			statusCode: 400,
		});

		// try with another route
		const testRoute = {
			config: {
				handler: () => ({ status: "ok" }),
			},
			method: "POST",
			path: "/p2p/peer/testroute",
		};

		server.route(testRoute);
		const responseValidAnotherRoute = await server.inject({
			method: "POST",
			payload: {},
			url: "/p2p/peer/testroute",
		});

		assert.equal(JSON.parse(responseValidAnotherRoute.payload), responsePayload);
		assert.equal(responseValidAnotherRoute.statusCode, 200);
	});
});
