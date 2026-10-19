import { describe } from "@mainsail/test-runner";

import { ADDRESS_A, ADDRESS_B, makeContract } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Contracts routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/contracts - groups contracts by name", async ({ server, repos }) => {
		repos.contract.data.many = [
			makeContract(),
			makeContract({
				activeImplementation: ADDRESS_A,
				address: ADDRESS_B,
				implementations: [{ abi: { abi: [] }, address: ADDRESS_A }],
				name: "UsernamesV1",
				proxy: "UUPS",
			}),
		];

		const response = await server.inject({ method: "GET", url: "/api/contracts" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), {
			data: {
				ConsensusV1: {
					activeImplementation: ADDRESS_B,
					address: ADDRESS_A,
					implementations: [ADDRESS_B],
					proxy: "UUPS",
				},
				UsernamesV1: {
					activeImplementation: ADDRESS_A,
					address: ADDRESS_B,
					implementations: [ADDRESS_A],
					proxy: "UUPS",
				},
			},
		});

		// Contracts are listed in a stable name/address order.
		assert.equal(repos.contract.qb.calls.orderBy, [["name"]]);
		assert.equal(repos.contract.qb.calls.addOrderBy, [["address"]]);
	});

	it("GET /api/contracts - returns an empty object without contracts", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/contracts" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data, {});
	});

	it("GET /api/contracts/{name}/{implementation}/abi - returns the abi", async ({ server, repos }) => {
		repos.contract.data.one = makeContract();

		const response = await server.inject({
			method: "GET",
			url: `/api/contracts/ConsensusV1/${ADDRESS_B}/abi`,
		});

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), { data: { abi: { abi: [] } } });
	});

	it("GET /api/contracts/{name}/{implementation}/abi - responds 404 for an unknown contract", async ({ server }) => {
		const response = await server.inject({
			method: "GET",
			url: `/api/contracts/ConsensusV1/${ADDRESS_B}/abi`,
		});

		assert.is(response.statusCode, 404);
		assert.equal(JSON.parse(response.payload).message, "contract not found");
	});

	it("GET /api/contracts/{name}/{implementation}/abi - responds 404 for an unknown implementation", async ({
		server,
		repos,
	}) => {
		repos.contract.data.one = makeContract();

		const response = await server.inject({
			method: "GET",
			url: `/api/contracts/ConsensusV1/${ADDRESS_A}/abi`,
		});

		assert.is(response.statusCode, 404);
		assert.equal(JSON.parse(response.payload).message, "abi not found");
	});

	it("GET /api/contracts/{name}/{implementation}/abi - rejects a malformed implementation address", async ({
		server,
	}) => {
		const response = await server.inject({ method: "GET", url: "/api/contracts/ConsensusV1/nope/abi" });

		assert.is(response.statusCode, 422);
	});

	it("GET /api/contracts/{name}/{implementation}/abi - rejects a name outside the length bounds", async ({
		server,
	}) => {
		assert.is((await server.inject({ method: "GET", url: `/api/contracts/abc/${ADDRESS_B}/abi` })).statusCode, 422);
		assert.is(
			(await server.inject({ method: "GET", url: `/api/contracts/${"a".repeat(16)}/${ADDRESS_B}/abi` }))
				.statusCode,
			422,
		);
	});
});
