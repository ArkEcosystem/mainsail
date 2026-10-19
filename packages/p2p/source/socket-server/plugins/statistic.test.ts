import { Server } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { StatisticPlugin } from "./statistic";

describe<{
	app: Application;
	server: Server;
	recorded: { ip: string; endpoint: string }[];
}>("StatisticPlugin", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach((context) => {
		context.recorded = [];

		const roundStatistic = {
			addPing: (ip: string, endpoint: string) => {
				context.recorded.push({ endpoint, ip });
			},
		};

		context.app = new Application();
		context.app
			.bind(Identifiers.P2P.Statistic.Service)
			.toConstantValue({ getCurrentRoundStatistic: () => roundStatistic });

		context.server = new Server({ host: "127.0.0.1", port: 0 });
		context.server.route({
			method: "POST",
			options: { handler: () => ({ ok: true }), id: "getStatus" },
			path: "/getStatus",
		});

		context.app.resolve(StatisticPlugin).register(context.server);
	});

	afterEach(async ({ server }) => {
		await server.stop();
	});

	it("should record a request that matched a route, keyed on the route id", async ({ server, recorded }) => {
		const response = await server.inject({ method: "POST", url: "/getStatus" });

		assert.equal(response.statusCode, 200);
		assert.equal(recorded, [{ endpoint: "getStatus", ip: "127.0.0.1" }]);
	});

	it("should not record an unmatched path", async ({ server, recorded }) => {
		const response = await server.inject({ method: "POST", url: `/${"a".repeat(2048)}` });

		assert.equal(response.statusCode, 404);
		assert.equal(recorded, []);
	});

	it("should not record a method that no route accepts", async ({ server, recorded }) => {
		const response = await server.inject({ method: "GET", url: "/getStatus" });

		assert.equal(response.statusCode, 404);
		assert.equal(recorded, []);
	});
});
