import { describe } from "@mainsail/test-runner";

import { makeState } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

const makeCryptoConfiguration = () => ({
	genesisBlock: { block: { timestamp: 1_700_000_000_000 } },
	network: {
		client: { explorer: "https://explorer.example.org", symbol: "TÑ", token: "TEST" },
		nethash: "nethash",
		pubKeyHash: 30,
		wif: 186,
	},
});

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Node routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/node/status - reports synced when at most one block behind", async ({ server, repos }) => {
		repos.state.data.one = makeState({ blockNumber: "95" });
		repos.peer.data.peerBlockNumberP90 = 96;

		const response = await server.inject({ method: "GET", url: "/api/node/status" });

		assert.is(response.statusCode, 200);

		const { data } = JSON.parse(response.payload);
		assert.equal(data.synced, true);
		assert.equal(data.now, 95);
		assert.equal(data.blocksCount, 1);
		assert.number(data.timestamp);
	});

	it("GET /api/node/status - reports out of sync when trailing the network", async ({ server, repos }) => {
		repos.state.data.one = makeState({ blockNumber: "90" });
		repos.peer.data.peerBlockNumberP90 = 95;

		const response = await server.inject({ method: "GET", url: "/api/node/status" });

		const { data } = JSON.parse(response.payload);
		assert.equal(data.synced, false);
		assert.equal(data.blocksCount, 5);
	});

	it("GET /api/node/syncing - mirrors the status as a syncing flag", async ({ server, repos }) => {
		repos.state.data.one = makeState({ blockNumber: "90", id: 7 });
		repos.peer.data.peerBlockNumberP90 = 95;

		const response = await server.inject({ method: "GET", url: "/api/node/syncing" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data, {
			blockNumber: 90,
			blocks: 5,
			id: 7,
			syncing: true,
		});
	});

	it("GET /api/node/syncing - falls back to id 0 on a fresh database", async ({ server, repos }) => {
		// No state row: getState() falls back to { blockNumber: "0", supply: "0" } without an id.
		repos.peer.data.peerBlockNumberP90 = 5;

		const response = await server.inject({ method: "GET", url: "/api/node/syncing" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data, {
			blockNumber: 0,
			blocks: 5,
			id: 0,
			syncing: true,
		});
	});

	it("GET /api/node/fees - returns the aggregated fee statistics", async ({ server, repos }) => {
		repos.configuration.data.one = { cryptoConfiguration: makeCryptoConfiguration() };
		repos.transaction.data.feeStatistics = { avg: "5", max: "10", min: "1", sum: "100" };

		const response = await server.inject({ method: "GET", url: "/api/node/fees?days=7" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), {
			data: { evmCall: { avg: "5", max: "10", min: "1", sum: "100" } },
			meta: { days: 7 },
		});

		// The statistics are anchored on the genesis timestamp.
		assert.equal(repos.transaction.calls.getFeeStatistics[0], [1_700_000_000_000, 7]);
	});

	it("GET /api/node/fees - falls back to zeroes without any transactions", async ({ server, repos }) => {
		repos.configuration.data.one = { cryptoConfiguration: makeCryptoConfiguration() };

		const response = await server.inject({ method: "GET", url: "/api/node/fees" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.evmCall, { avg: "0", max: "0", min: "0", sum: "0" });
	});

	it("GET /api/node/fees - rejects an out of range days parameter", async ({ server }) => {
		assert.is((await server.inject({ method: "GET", url: "/api/node/fees?days=0" })).statusCode, 422);
		assert.is((await server.inject({ method: "GET", url: "/api/node/fees?days=31" })).statusCode, 422);
	});

	it("GET /api/node/configuration - exposes network constants and plugin ports", async ({ server, repos }) => {
		repos.configuration.data.one = {
			activeMilestones: { blockTime: 8000 },
			cryptoConfiguration: makeCryptoConfiguration(),
			version: "1.2.3",
		};
		repos.plugin.data.many = [
			// Nested server configuration wins over the top-level port.
			{
				configuration: { enabled: true, port: 4000, server: { enabled: true, port: 4102 } },
				name: "@mainsail/p2p",
			},
			// No nested server -> top-level port.
			{ configuration: { enabled: true, port: 5432 }, name: "@mainsail/api-database" },
			// Nested server present but disabled -> top-level port.
			{
				configuration: { enabled: true, port: 4004, server: { enabled: false, port: 9999 } },
				name: "@mainsail/webhooks",
			},
			// Plugins outside the known set are ignored.
			{ configuration: { enabled: true, port: 9999 }, name: "@mainsail/unknown" },
		];

		const response = await server.inject({ method: "GET", url: "/api/node/configuration" });

		assert.is(response.statusCode, 200);

		const { data } = JSON.parse(response.payload);
		assert.equal(data.constants, { blockTime: 8000 });
		assert.equal(data.core, { version: "1.2.3" });
		assert.equal(data.explorer, "https://explorer.example.org");
		assert.equal(data.nethash, "nethash");
		assert.equal(data.symbol, "TÑ");
		assert.equal(data.token, "TEST");
		assert.equal(data.version, 30);
		assert.equal(data.wif, 186);
		assert.equal(data.ports, { "@mainsail/api-database": 5432, "@mainsail/p2p": 4102 });
	});

	it("GET /api/node/configuration/crypto - returns the full crypto configuration", async ({ server, repos }) => {
		repos.configuration.data.one = { cryptoConfiguration: makeCryptoConfiguration() };

		const response = await server.inject({ method: "GET", url: "/api/node/configuration/crypto" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.network.nethash, "nethash");
	});

	it("GET /api/node/configuration/crypto - returns an empty object on a fresh database", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/node/configuration/crypto" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data, {});
	});
});
