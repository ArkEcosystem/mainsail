import { describe } from "@mainsail/test-runner";

import { makeLegacyColdWallet } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

const LEGACY_ADDRESS = makeLegacyColdWallet().address as string;

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Legacy routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/legacy/cold-wallets - returns cold wallets in a pagination envelope", async ({ server, repos }) => {
		repos.legacyColdWallet.data.manyAndCount = [[makeLegacyColdWallet()], 3];

		const response = await server.inject({ method: "GET", url: "/api/legacy/cold-wallets" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 3);
		assert.equal(body.data[0].address, LEGACY_ADDRESS);
		assert.equal(body.data[0].balance, "500");
	});

	it("GET /api/legacy/cold-wallets - orders by address and windows by the query pagination", async ({
		server,
		repos,
	}) => {
		await server.inject({ method: "GET", url: "/api/legacy/cold-wallets?page=2&limit=10" });

		assert.equal(repos.legacyColdWallet.qb.calls.addOrderBy, [["address", "ASC"]]);
		assert.equal(repos.legacyColdWallet.qb.calls.offset, [[10]]);
		assert.equal(repos.legacyColdWallet.qb.calls.limit, [[10]]);
	});

	it("GET /api/legacy/cold-wallets/{address} - returns the cold wallet", async ({ server, repos }) => {
		repos.legacyColdWallet.data.one = makeLegacyColdWallet();

		const response = await server.inject({ method: "GET", url: `/api/legacy/cold-wallets/${LEGACY_ADDRESS}` });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.address, LEGACY_ADDRESS);

		assert.equal(repos.legacyColdWallet.qb.calls.where[0], [
			"address = :legacyAddress",
			{ legacyAddress: LEGACY_ADDRESS },
		]);
	});

	it("GET /api/legacy/cold-wallets/{address} - responds 404 for an unknown wallet", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/legacy/cold-wallets/${LEGACY_ADDRESS}` });

		assert.is(response.statusCode, 404);
		assert.equal(JSON.parse(response.payload).message, "Cold Wallet not found");
	});

	it("GET /api/legacy/cold-wallets/{address} - rejects a malformed legacy address", async ({ server }) => {
		// 0 and O are not part of the base58 alphabet.
		const response = await server.inject({
			method: "GET",
			url: "/api/legacy/cold-wallets/O0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O0O",
		});

		assert.is(response.statusCode, 422);
	});

	it("GET /api/legacy/cold-wallets/{address} - rejects a too short legacy address", async ({ server }) => {
		// Valid base58 characters, but one character short of the minimum length.
		const response = await server.inject({
			method: "GET",
			url: `/api/legacy/cold-wallets/${"D".repeat(32)}`,
		});

		assert.is(response.statusCode, 422);
	});
});
