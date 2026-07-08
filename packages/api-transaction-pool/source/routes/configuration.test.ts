import { describe } from "@mainsail/test-runner";

import { bootstrapServer } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
}>("Configuration routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		const { server, serviceProvider } = await bootstrapServer({ processor: {}, transactions: [] });
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/configuration - returns version, block number and pool configuration", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/configuration" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), {
			data: {
				blockNumber: 42,
				core: { version: "0.0.1-test" },
				transactionPool: {
					maxTransactionAge: 2700,
					maxTransactionBytes: 1024,
					maxTransactionsInPool: 15_000,
					maxTransactionsPerRequest: 2,
					maxTransactionsPerSender: 150,
				},
			},
		});
	});

	it("GET /api/configuration/ - strips the trailing slash", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/configuration/" });

		assert.is(response.statusCode, 200);
	});
});
