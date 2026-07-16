import { describe } from "@mainsail/test-runner";

import { makeApiNode, makePage } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("ApiNodes routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/api-nodes - returns api nodes in a pagination envelope", async ({ server, repos }) => {
		repos.apiNode.data.page = makePage([makeApiNode()]);

		const response = await server.inject({ method: "GET", url: "/api/api-nodes" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);
		assert.equal(body.data[0].url, "http://127.0.0.1:4003");

		// The api node listing never estimates the total count.
		const [, , , options] = repos.apiNode.calls.findManyByCriteria[0];
		assert.equal(options, { estimateTotalCount: false });
	});

	it("GET /api/api-nodes - returns an empty page without nodes", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/api-nodes" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data, []);
	});
});
