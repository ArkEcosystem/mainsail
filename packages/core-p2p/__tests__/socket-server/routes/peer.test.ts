import { Container } from "@arkecosystem/core-kernel";
import { PeerRoute } from "@packages/core-p2p/source/socket-server/routes/peer";

describe("PeerRoute", () => {
	let peerRoute: PeerRoute;

	const container = new Container.Container();

	const logger = { debug: jest.fn(), warning: jest.fn() };
	const controller = { getPeers: jest.fn() }; // a mock peer controller
	const app = { resolve: jest.fn().mockReturnValue(controller) };
	const server = { bind: jest.fn(), route: jest.fn() };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.LogService).toConstantValue(logger);
		container.bind(Identifiers.Application).toConstantValue(app);
	});

	beforeEach(() => {
		peerRoute = container.resolve<PeerRoute>(PeerRoute);
	});

	it("should bind the controller to the server and register the routes", () => {
		const routes = peerRoute.getRoutesConfigByPath();
		const routesExpected = Object.entries(routes).map(([path, config]) => ({
			config: {
				handler: config.handler,
				id: config.id,
				isInternal: true,
				payload: {
					maxBytes: config.maxBytes,
				},
			},
			method: "POST",
			path,
		}));

		peerRoute.register(server);

		expect(server.bind).toBeCalledTimes(1);
		expect(server.bind).toBeCalledWith(controller);

		expect(server.route).toBeCalledTimes(routesExpected.length);
		for (const route of routesExpected) {
			expect(server.route).toBeCalledWith(route);
		}
	});
});
