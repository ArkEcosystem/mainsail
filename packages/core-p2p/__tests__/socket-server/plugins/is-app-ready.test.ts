import { Server } from "@hapi/hapi";
import { Container } from "@packages/core-kernel";
import { protocol } from "@packages/core-p2p/source/hapi-nes/utils";
import { IsAppReadyPlugin } from "@packages/core-p2p/source/socket-server/plugins/is-app-ready";
import Joi from "joi";

afterEach(() => {
	jest.clearAllMocks();
});

describe("IsAppReadyPlugin", () => {
	let isAppReadyPlugin: IsAppReadyPlugin;

	const container = new Container.Container();

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

	const blockchainService = { isBooted: jest.fn().mockReturnValue(true) };
	const app = {
		resolve: jest.fn().mockReturnValue({ getRoutesConfigByPath: () => mockRouteByPath }),
	};

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.Application).toConstantValue(app);
		container.bind(Identifiers.BlockchainService).toConstantValue(blockchainService);
	});

	beforeEach(() => {
		isAppReadyPlugin = container.resolve<IsAppReadyPlugin>(IsAppReadyPlugin);
	});

	it("should register the plugin", async () => {
		const server = new Server({ port: 4100 });
		server.route(mockRoute);

		const spyExtension = jest.spyOn(server, "ext");

		isAppReadyPlugin.register(server);

		expect(spyExtension).toBeCalledWith(expect.objectContaining({ type: "onPostAuth" }));

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
		expect(blockchainService.isBooted).toBeCalledTimes(1);
	});

	it("should return a forbidden error when blockchain service is not booted", async () => {
		const server = new Server({ port: 4100 });
		server.route(mockRoute);
		isAppReadyPlugin.register(server);

		blockchainService.isBooted.mockReturnValueOnce(false);

		// try the route with a valid payload
		const remoteAddress = "187.166.55.44";
		const response = await server.inject({
			method: "POST",
			payload: {},
			remoteAddress,
			url: "/p2p/peer/mockroute",
		});
		expect(response.statusCode).toBe(protocol.gracefulErrorStatusCode);
		expect(blockchainService.isBooted).toBeCalledTimes(1);
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

		isAppReadyPlugin.register(server);

		expect(spyExtension).toBeCalledWith(expect.objectContaining({ type: "onPostAuth" }));

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
		expect(blockchainService.isBooted).toBeCalledTimes(1);
	});
});
