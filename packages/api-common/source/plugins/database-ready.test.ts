import { Server } from "@hapi/hapi";
import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { databaseReady } from "./database-ready";

describe<{
	app: Application;
	server: Server;
	inMaintenance: boolean;
	reads: number;
	throws: boolean;
	error: string;
	pending?: Promise<boolean>;
}>("DatabaseReady", ({ it, beforeEach, assert, clock }) => {
	const settle = () => new Promise((resolve) => setImmediate(resolve));

	beforeEach((context) => {
		context.inMaintenance = false;
		context.reads = 0;
		context.throws = false;
		context.error = "boom";
		context.pending = undefined;

		context.app = new Application();
		context.app.bind(ApiDatabaseIdentifiers.SystemRepositoryFactory).toConstantValue(() => ({
			inMaintenance: async () => {
				context.reads++;
				if (context.pending) {
					return context.pending;
				}
				if (context.throws) {
					throw new Error(context.error);
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

	it("should answer from the last flag while a read is pending", async (context) => {
		const { server } = context;
		const fake = clock({ now: 1000, toFake: ["Date"] });
		const status = async () => (await server.inject({ method: "GET", url: "/" })).statusCode;

		assert.is(await status(), 200);

		let resolve!: (value: boolean) => void;
		context.pending = new Promise((r) => (resolve = r));
		fake.tick(1000);
		assert.is(await status(), 200);
		assert.is(await status(), 200);
		assert.is(context.reads, 2);

		resolve(true);
		await settle();
		assert.is(await status(), 503);
	});

	it("should keep the last flag when no database connection is available in time", async (context) => {
		const { server } = context;
		const fake = clock({ now: 1000, toFake: ["Date"] });
		const status = async () => (await server.inject({ method: "GET", url: "/" })).statusCode;

		assert.is(await status(), 200);

		context.throws = true;
		for (const error of [
			"timeout exceeded when trying to connect",
			"Connection terminated due to connection timeout",
		]) {
			context.error = error;
			fake.tick(1000);
			await status();
			await settle();
			assert.is(await status(), 200);
		}
		assert.is(context.reads, 5);
	});

	it("should read the flag again when a read does not answer in time", async (context) => {
		const { server } = context;
		const fake = clock({ now: 1000, toFake: ["Date", "setTimeout", "clearTimeout"] });
		const status = async () => (await server.inject({ method: "GET", url: "/" })).statusCode;

		assert.is(await status(), 200);

		context.pending = new Promise(() => {});
		fake.tick(1000);
		assert.is(await status(), 200);

		fake.tick(10_000);
		await settle();
		context.pending = undefined;
		context.inMaintenance = true;
		await status();
		await settle();
		assert.is(await status(), 503);
		assert.is(context.reads, 3);
	});

	it("should return 503 for other errors after the flag was read", async (context) => {
		const { server } = context;
		const fake = clock({ now: 1000, toFake: ["Date"] });
		const status = async () => (await server.inject({ method: "GET", url: "/" })).statusCode;

		assert.is(await status(), 200);

		context.throws = true;
		fake.tick(1000);
		await status();
		await settle();
		assert.is(await status(), 503);
	});

	it("should return 503 when no pooled connection is free before the flag was ever read", async (context) => {
		const { server } = context;
		context.throws = true;
		context.error = "timeout exceeded when trying to connect";

		const response = await server.inject({ method: "GET", url: "/" });

		assert.is(response.statusCode, 503);
	});

	it("should read the flag once per second, but again after a failed read", async (context) => {
		const { server } = context;
		const fake = clock({ now: 1000, toFake: ["Date"] });
		const status = async () => (await server.inject({ method: "GET", url: "/" })).statusCode;

		assert.is(await status(), 200);

		context.inMaintenance = true;
		fake.tick(999);
		assert.is(await status(), 200);
		assert.is(context.reads, 1);

		fake.tick(1);
		await status();
		await settle();
		assert.is(await status(), 503);
		assert.is(context.reads, 2);

		context.throws = true;
		fake.tick(1000);
		await status();
		await settle();
		assert.is(await status(), 503);
		await settle();
		assert.is(context.reads, 4);
	});

	it("getOnRequestHandler should return h.continue when not in maintenance", async ({ app }) => {
		const handler = databaseReady.getOnRequestHandler(app as any);

		const continueSymbol = Symbol("continue");
		const h = { continue: continueSymbol } as any;

		const result = await handler({} as any, h);

		assert.is(result, continueSymbol);
	});
});
