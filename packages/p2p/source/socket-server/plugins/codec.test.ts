import { Server } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { CodecPlugin } from "./codec";

describe<{
	app: Application;
	codecPlugin: CodecPlugin;
	peerDisposer: { banPeer: (ip: string, error: Error) => void; disposePeer: (ip: string) => void };
	server: Server;
	handlerPayloads: unknown[];
}>("CodecPlugin", ({ it, assert, beforeEach, spy }) => {
	const logger = { error: () => {} };
	const configuration = { getRequired: () => false };

	const deserialized = { fields: "deserialized" };
	const responsePayload = { status: "ok" };

	const route = {
		getRoutesConfigByPath: () => ({
			"/p2p/peer/mockroute": {
				codec: {
					request: {
						deserialize: (payload: Buffer) => {
							if (payload[0] === 0xff) {
								throw new Error("Bitmap of 10 validators must be 2 bytes, got 1");
							}

							return deserialized;
						},
					},
					response: {
						serialize: (object: unknown) => Buffer.from(JSON.stringify(object)),
					},
				},
			},
		}),
	};

	beforeEach((context) => {
		context.app = new Application();

		context.peerDisposer = { banPeer: () => {}, disposePeer: () => {} };

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue(configuration);
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		context.app.bind(Identifiers.P2P.Routes).toConstantValue(route);

		context.codecPlugin = context.app.resolve(CodecPlugin);

		// Wired like Server.initialize(): routes register first — each Route.register() calls
		// server.bind(controller), so that controller is what hapi hands to
		// extensions as `this` — and only then the codec plugin adds its extensions.
		context.handlerPayloads = [];
		const controller = {
			handle: (request) => {
				context.handlerPayloads.push(request.payload);
				return responsePayload;
			},
		};

		context.server = new Server({ port: 4102 });
		context.server.bind(controller);
		context.server.route({
			method: "POST",
			options: {
				handler: controller.handle.bind(controller),
				payload: { parse: false },
			},
			path: "/p2p/peer/mockroute",
		});

		context.codecPlugin.register(context.server);
	});

	it("should deserialize the request payload and serialize the response", async ({
		server,
		handlerPayloads,
		peerDisposer,
	}) => {
		const disposePeer = spy(peerDisposer, "disposePeer");

		const response = await server.inject({
			method: "POST",
			payload: Buffer.from("aa", "hex"),
			url: "/p2p/peer/mockroute",
		});

		assert.equal(response.statusCode, 200);
		assert.equal(handlerPayloads, [deserialized]);
		disposePeer.neverCalled();
	});

	it("should dispose the peer and return a bad request when deserializing fails", async ({
		server,
		peerDisposer,
		handlerPayloads,
	}) => {
		const disposePeer = spy(peerDisposer, "disposePeer");

		const response = await server.inject({
			method: "POST",
			payload: Buffer.from("ff", "hex"),
			url: "/p2p/peer/mockroute",
		});

		assert.equal(response.statusCode, 400);
		assert.true(response.payload.startsWith("Payload deserializing failed"));
		assert.equal(handlerPayloads, []);
		disposePeer.calledOnce();
		disposePeer.calledWith("127.0.0.1");
	});
});
