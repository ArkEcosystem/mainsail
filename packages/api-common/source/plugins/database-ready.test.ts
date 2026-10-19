import { Server } from "@hapi/hapi";
import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { databaseReady } from "./database-ready";

describe<{
	app: Application;
	server: Server;
	inMaintenance: boolean;
	throws: boolean;
}>("DatabaseReady", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.inMaintenance = false;
		context.throws = false;

		context.app = new Application();
		context.app.bind(ApiDatabaseIdentifiers.SystemRepositoryFactory).toConstantValue(() => ({
			inMaintenance: async () => {
				if (context.throws) {
					throw new Error("boom");
				}
				return context.inMaintenance;
			},
		}));

		context.server = new Server();
		(context.server.app as any).app = context.app;
		databaseReady.register(context.server as any);
		context.server.route({
			handler: () => ({ ok: true }),
			method: "GET",
			path: "/",
		});
	});

	it("should have plugin metadata", () => {
		assert.is(databaseReady.name, "database-ready");
		assert.is(databaseReady.version, "1.0.0");
	});

	it("should continue with 200 when not in maintenance", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/" });

		assert.is(response.statusCode, 200);
		assert.equal(response.result, { ok: true });
	});

	it("should return 503 with retry header when in maintenance", async (context) => {
		const { server } = context;
		context.inMaintenance = true;

		const response = await server.inject({ method: "GET", url: "/" });

		assert.is(response.statusCode, 503);
		assert.equal(response.result, { error: "Service Unavailable", reason: "Database not ready" });
		assert.is(response.headers["retry-after"], "10");
	});

	it("should treat a thrown error as maintenance and return 503", async (context) => {
		const { server } = context;
		context.throws = true;

		const response = await server.inject({ method: "GET", url: "/" });

		assert.is(response.statusCode, 503);
		assert.equal(response.result, { error: "Service Unavailable", reason: "Database not ready" });
		assert.is(response.headers["retry-after"], "10");
	});

	it("getOnRequestHandler should return h.continue when not in maintenance", async ({ app }) => {
		const handler = databaseReady.getOnRequestHandler(app as any);

		const continueSymbol = Symbol("continue");
		const h = { continue: continueSymbol } as any;

		const result = await handler({} as any, h);

		assert.is(result, continueSymbol);
	});
});
