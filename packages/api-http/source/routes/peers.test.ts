import { describe } from "@mainsail/test-runner";

import { makePage, makePeer } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Peers routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/peers - returns transformed peers in a pagination envelope", async ({ server, repos }) => {
		repos.peer.data.page = makePage([makePeer({ plugins: { "api-http": {} }, ports: { "api-http": 4003 } })]);

		const response = await server.inject({ method: "GET", url: "/api/peers" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);
		assert.equal(body.data[0], {
			blockNumber: 95,
			ip: "127.0.0.1",
			latency: 10,
			plugins: { "api-http": {} },
			port: 4002,
			ports: { "api-http": 4003 },
			version: "1.0.0",
		});

		// The peer listing never estimates the total count.
		const [, , , options] = repos.peer.calls.findManyByCriteria[0];
		assert.equal(options, { estimateTotalCount: false });
	});

	it("GET /api/peers - forwards the version filter as criteria", async ({ server, repos }) => {
		await server.inject({ method: "GET", url: "/api/peers?version=1.0.0" });

		const [criteria] = repos.peer.calls.findManyByCriteria[0];
		assert.equal(criteria.version, "1.0.0");
	});

	it("GET /api/peers - rejects a malformed ip filter", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/peers?ip=not-an-ip" });

		assert.is(response.statusCode, 422);
	});

	it("GET /api/peers/{ip} - returns the peer", async ({ server, repos }) => {
		repos.peer.data.one = makePeer();

		const response = await server.inject({ method: "GET", url: "/api/peers/127.0.0.1" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.ip, "127.0.0.1");

		assert.equal(repos.peer.qb.calls.where[0], ["ip = :ip", { ip: "127.0.0.1" }]);
	});

	it("GET /api/peers/{ip} - responds 404 for an unknown peer", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/peers/10.0.0.1" });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/peers/{ip} - rejects a malformed ip", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/peers/nope" });

		assert.is(response.statusCode, 422);
	});
});
