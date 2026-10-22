import { Server } from "@hapi/hapi";
import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { responseHeaders } from "./response-headers";

describe<{
	app: Application;
	server: Server;
	getLatestHeightCalls: number;
	height: number;
	throws: boolean;
}>("ResponseHeaders", ({ it, beforeEach, assert, clock }) => {
	beforeEach((context) => {
		context.getLatestHeightCalls = 0;
		context.height = 123;
		context.throws = false;

		context.app = new Application();
		context.app.bind(ApiDatabaseIdentifiers.BlockRepositoryFactory).toConstantValue(() => ({
			getLatestHeight: async () => {
				context.getLatestHeightCalls++;
				if (context.throws) {
					throw new Error("timeout exceeded when trying to connect");
				}
				return context.height;
			},
		}));

		context.server = new Server();
		(context.server.app as any).app = context.app;
		responseHeaders.register(context.server as any);
	});

	it("should have plugin metadata", () => {
		assert.is(responseHeaders.name, "response-headers");
		assert.is(responseHeaders.version, "1.0.0");
	});

	it("should set x-block-number header on a normal response", async (context) => {
		const { server } = context;
		server.route({
			handler: () => ({ ok: true }),
			method: "GET",
			path: "/",
		});

		const response = await server.inject({ method: "GET", url: "/" });

		assert.is(response.statusCode, 200);
		assert.is(response.headers["x-block-number"], 123);
		assert.is(context.getLatestHeightCalls, 1);
	});

	it("should set x-block-number header on a boom/error response", async (context) => {
		const { server } = context;
		server.route({
			handler: () => {
				throw new Error("boom");
			},
			method: "GET",
			path: "/error",
		});

		const response = await server.inject({ method: "GET", url: "/error" });

		assert.is(response.statusCode, 500);
		assert.is(response.headers["x-block-number"], 123);
		assert.is(context.getLatestHeightCalls, 1);
	});

	it("should look the block number up once per second, but again after a failed lookup", async (context) => {
		const { server } = context;
		server.route({
			handler: () => ({ ok: true }),
			method: "GET",
			path: "/",
		});
		const fake = clock({ now: 1000, toFake: ["Date"] });
		const header = async () => (await server.inject({ method: "GET", url: "/" })).headers["x-block-number"];

		assert.is(await header(), 123);

		context.height = 124;
		fake.tick(999);
		assert.is(await header(), 123);
		assert.is(context.getLatestHeightCalls, 1);

		fake.tick(1);
		assert.is(await header(), 124);
		assert.is(context.getLatestHeightCalls, 2);

		context.throws = true;
		fake.tick(1000);
		assert.undefined(await header());
		assert.undefined(await header());
		assert.is(context.getLatestHeightCalls, 4);
	});

	it("should return early on a 503 response without calling getLatestHeight", async (context) => {
		const { server } = context;
		server.route({
			handler: (_request, h) => h.response({ error: "unavailable" }).code(503),
			method: "GET",
			path: "/unavailable",
		});

		const response = await server.inject({ method: "GET", url: "/unavailable" });

		assert.is(response.statusCode, 503);
		assert.undefined(response.headers["x-block-number"]);
		assert.is(context.getLatestHeightCalls, 0);
	});
});
