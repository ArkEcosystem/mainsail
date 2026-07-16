import { describe } from "@mainsail/test-runner";

import { makePage, makeState, makeTransaction, TRANSACTION_HASH } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

const VOTE_FUNCTION_SIG = "0x6dd7d8ea";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Votes routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/votes - restricts the criteria to vote transactions", async ({ server, repos }) => {
		repos.transaction.data.page = makePage([makeTransaction({ data: VOTE_FUNCTION_SIG })]);
		repos.state.data.one = makeState();

		const response = await server.inject({ method: "GET", url: "/api/votes" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);
		assert.equal(body.data[0].hash, TRANSACTION_HASH);

		// The vote function signature is forced into the search criteria.
		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria.data, VOTE_FUNCTION_SIG);
	});

	it("GET /api/votes/{hash} - returns the vote transaction", async ({ server, repos }) => {
		repos.transaction.data.one = makeTransaction({ data: VOTE_FUNCTION_SIG });
		repos.state.data.one = makeState();

		const response = await server.inject({ method: "GET", url: `/api/votes/${TRANSACTION_HASH}` });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.hash, TRANSACTION_HASH);

		// The lookup filters on the vote function signature prefix.
		const [, parameters] = repos.transaction.qb.calls.andWhere[0];
		assert.equal(parameters, { data: String.raw`\x6dd7d8ea` });
	});

	it("GET /api/votes/{hash} - responds 404 when the hash is not a vote", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/votes/${"f".repeat(64)}` });

		assert.is(response.statusCode, 404);
		assert.equal(JSON.parse(response.payload).message, "Vote not found");
	});
});
