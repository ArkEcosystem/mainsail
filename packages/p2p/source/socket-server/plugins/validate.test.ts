import { Server } from "@hapi/hapi";
import { Contracts, Identifiers } from "@mainsail/contracts";
import Joi from "joi";
import rewiremock from "rewiremock";

import { describe, Sandbox } from "../../../../test-framework/source";
import { ValidatePlugin } from "./validate";

describe<{
	sandbox: Sandbox;
	validatePlugin: ValidatePlugin;
}>("ValidatePlugin", ({ it, assert, beforeEach, spy, match, stub }) => {
	const utils = {
		getPeerIp: () => "",
		isValidVersion: () => true,
	};

	const { ValidatePlugin: ValidatePluginProxy } = rewiremock.proxy<{
		ValidatePlugin: Contracts.Types.Class<ValidatePlugin>;
	}>("./validate", {
		"../../utils": utils,
	});

	const logger = { debug: () => {}, warning: () => {} };
	const configuration = { getRequired: () => {} };

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

		context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue(configuration);
		context.sandbox.app.bind(Identifiers.P2P.Peer.Processor).toConstantValue({ validatePeerIp: () => true });
		context.sandbox.app
			.bind(Identifiers.P2P.Peer.Disposer)
			.toConstantValue({ banPeer: () => {}, disposePeer: () => {} });

		context.validatePlugin = context.sandbox.app.resolve(ValidatePluginProxy);
	});

	// TODO: fix stub
	it.skip("should register the validate plugin", async ({ validatePlugin, sandbox }) => {
		stub(sandbox.app, "resolve").returnValue({ getRoutesConfigByPath: () => mockRouteByPath });

		const server = new Server({ port: 4100 });
		server.route(mockRoute);

		const spyExtension = spy(server, "ext");
		const spyConfiguration = stub(configuration, "getRequired").returnValue(false);

		validatePlugin.register(server);

		spyConfiguration.calledOnce();
		spyConfiguration.calledWith("developmentMode.enabled");
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
			message: "Validation failed (bad payload)",
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

	it("should not register the validate plugin if development mode is used", async ({ validatePlugin, sandbox }) => {
		stub(sandbox.app, "resolve").returnValue({ getRoutesConfigByPath: () => mockRouteByPath });

		const server = new Server({ port: 4100 });
		server.route(mockRoute);

		const spyExtension = spy(server, "ext");
		const spyConfiguration = stub(configuration, "getRequired").returnValue(true);

		validatePlugin.register(server);

		spyConfiguration.calledOnce();
		spyConfiguration.calledWith("developmentMode.enabled");
		spyExtension.neverCalled();
	});
});
