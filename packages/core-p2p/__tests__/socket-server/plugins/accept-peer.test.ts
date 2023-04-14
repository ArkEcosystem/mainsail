import { Container } from "@arkecosystem/core-kernel";
import { Server } from "@hapi/hapi";
import { AcceptPeerPlugin } from "@packages/core-p2p/source/socket-server/plugins/accept-peer";
import Joi from "joi";

afterEach(() => {
	jest.clearAllMocks();
});

describe("AcceptPeerPlugin", () => {
	let acceptPeerPlugin: AcceptPeerPlugin;

	const container = new Container.Container();

	const logger = { debug: jest.fn(), warning: jest.fn() };
	const peerProcessor = { validateAndAcceptPeer: jest.fn() };

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
	const app = { resolve: jest.fn().mockReturnValue({ getRoutesConfigByPath: () => mockRouteByPath }) };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.LogService).toConstantValue(logger);
		container.bind(Identifiers.Application).toConstantValue(app);
		container.bind(Identifiers.PeerProcessor).toConstantValue(peerProcessor);
	});

	beforeEach(() => {
		acceptPeerPlugin = container.resolve<AcceptPeerPlugin>(AcceptPeerPlugin);
	});

	it("should register the validate plugin", async () => {
		const server = new Server({ port: 4100 });
		server.route(mockRoute);

		const spyExtension = jest.spyOn(server, "ext");

		acceptPeerPlugin.register(server);

		expect(spyExtension).toBeCalledWith(expect.objectContaining({ type: "onPreHandler" }));

		// try the route with a valid payload
		const remoteAddress = "187.166.55.44";
		const responseValid = await server.inject({
			method: "POST",
			payload: {},
			remoteAddress,
			url: "/p2p/peer/mockroute",
		});
		expect(JSON.parse(responseValid.payload)).toEqual(responsePayload);
		expect(responseValid.statusCode).toBe(200);
		expect(peerProcessor.validateAndAcceptPeer).toBeCalledTimes(1);
		expect(peerProcessor.validateAndAcceptPeer).toBeCalledWith({ ip: remoteAddress });
	});

	it("should not be called on another route", async () => {
		const testRoute = {
			config: {
				handler: () => ({ status: "ok" }),
			},
			method: "POST",
			path: "/p2p/peer/testroute",
		};

		const server = new Server({ port: 4100 });
		server.route(testRoute);
		server.route(mockRoute);

		const spyExtension = jest.spyOn(server, "ext");

		acceptPeerPlugin.register(server);

		expect(spyExtension).toBeCalledWith(expect.objectContaining({ type: "onPreHandler" }));

		// try the route with a valid payload
		const remoteAddress = "187.166.55.44";
		const responseValid = await server.inject({
			method: "POST",
			payload: {},
			remoteAddress,
			url: "/p2p/peer/testroute",
		});
		expect(JSON.parse(responseValid.payload)).toEqual(responsePayload);
		expect(responseValid.statusCode).toBe(200);
		expect(peerProcessor.validateAndAcceptPeer).toBeCalledTimes(0);
	});
});
