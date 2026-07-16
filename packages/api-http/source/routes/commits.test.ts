import { describe } from "@mainsail/test-runner";

import { ADDRESS_A, ADDRESS_B, BLOCK_HASH, makeBlock, makeValidatorRound } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

const ADDRESS_C = "0xdddddddddddddddddddddddddddddddddddddddd";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Commits routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/commits/{id} - unpacks the validator bitmask by position", async ({ server, repos }) => {
		// 0b101 -> the first and third round validator signed, the second did not.
		repos.block.data.one = makeBlock({ validatorSet: "5" });
		repos.validatorRound.data.one = makeValidatorRound({
			validators: [ADDRESS_A, ADDRESS_B, ADDRESS_C],
		});

		const response = await server.inject({ method: "GET", url: "/api/commits/90" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), {
			data: {
				blockNumber: "90",
				signature: makeBlock().signature,
				// Positional selection: NOT the first two validators.
				validators: [ADDRESS_A, ADDRESS_C],
			},
		});
	});

	it("GET /api/commits/{id} - returns no validators without a matching round", async ({ server, repos }) => {
		repos.block.data.one = makeBlock({ validatorSet: "5" });

		const response = await server.inject({ method: "GET", url: `/api/commits/${BLOCK_HASH}` });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.validators, []);
	});

	it("GET /api/commits/{id} - responds 404 for an unknown block", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/commits/90" });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/commits/{id} - rejects a malformed id", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/commits/nope" });

		assert.is(response.statusCode, 422);
	});
});
