import { describe } from "@mainsail/test-runner";

import { makeBlock, makeState } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Blockchain routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/blockchain - returns the latest block and the supply", async ({ server, repos }) => {
		repos.block.data.one = makeBlock({ hash: "aa".repeat(32), number: "90" });
		// Distinct from the block number so the header provably comes from getLatestHeight().
		repos.block.data.latestHeight = 123;
		repos.state.data.one = makeState({ supply: "12345" });

		const response = await server.inject({ method: "GET", url: "/api/blockchain" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), {
			data: {
				block: { hash: "aa".repeat(32), number: 90 },
				supply: "12345",
			},
		});
		// Every non-503 response carries the current height.
		assert.is(response.headers["x-block-number"], 123);
	});

	it("GET /api/blockchain - returns a null block and zero supply on an empty database", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/blockchain" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), {
			data: { block: null, supply: "0" },
		});
		// getLatestHeight() is undefined on an empty database -> the header is omitted.
		assert.undefined(response.headers["x-block-number"]);
	});

	it("GET /api/blockchain - responds 503 while the database is in maintenance", async ({ server, repos }) => {
		repos.system.inMaintenance = async () => true;

		const response = await server.inject({ method: "GET", url: "/api/blockchain" });

		assert.is(response.statusCode, 503);
		assert.equal(JSON.parse(response.payload).reason, "Database not ready");
		assert.is(response.headers["retry-after"], "10");
		// The height lookup is skipped for 503 responses.
		assert.undefined(response.headers["x-block-number"]);
	});

	it("GET /api/blockchain - responds 503 when the maintenance check fails", async ({ server, repos }) => {
		repos.system.inMaintenance = async () => {
			throw new Error("connection refused");
		};

		const response = await server.inject({ method: "GET", url: "/api/blockchain" });

		assert.is(response.statusCode, 503);
	});
});
