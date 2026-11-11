import { Server } from "@hapi/hapi";
import { describe } from "@mainsail/test-runner";

import { concurrencyLimit } from "./concurrency-limit";

const limited = { plugins: { concurrencyLimit: { enabled: true } } };

const makeServer = async (limit: number) => {
	const server = new Server();
	const pending: Array<() => void> = [];
	const hold = () => new Promise((resolve) => pending.push(() => resolve("ok")));

	server.route({ handler: hold, method: "GET", options: limited, path: "/slow" });
	server.route({ handler: () => "ok", method: "GET", options: limited, path: "/" });
	server.route({
		handler: () => {
			throw new Error("failed");
		},
		method: "GET",
		options: limited,
		path: "/error",
	});
	server.route({
		handler: () => "ok",
		method: "GET",
		options: {
			...limited,
			validate: {
				query: (value) => {
					if (value.valid !== "true") {
						throw new Error("invalid");
					}

					return value;
				},
			},
		},
		path: "/validated",
	});
	server.route({
		handler: hold,
		method: "GET",
		options: { plugins: { concurrencyLimit: { enabled: false } } },
		path: "/disabled",
	});
	server.route({ handler: hold, method: "GET", path: "/open" });

	await server.register({ options: { limit }, plugin: concurrencyLimit });

	const waitForPending = async (count: number) => {
		const startedAt = Date.now();

		while (pending.length < count) {
			if (Date.now() - startedAt > 1000) {
				throw new Error(`Expected ${count} pending requests, got ${pending.length}`);
			}

			await new Promise((resolve) => setImmediate(resolve));
		}
	};

	const releaseAll = () => {
		for (const resolve of pending.splice(0)) {
			resolve();
		}
	};

	return { pending, releaseAll, server, waitForPending };
};

describe("concurrencyLimit", ({ it, assert, spy }) => {
	it("should expose name, version and once", () => {
		assert.is(concurrencyLimit.name, "concurrency-limit");
		assert.is(concurrencyLimit.version, "1.0.0");
		assert.true(concurrencyLimit.once);
	});

	it("should register nothing when the limit is 0", async () => {
		const server = new Server();
		const ext = spy(server, "ext");

		await concurrencyLimit.register(server, { limit: 0 });

		ext.neverCalled();
	});

	it("should reject requests past the limit with a 503 until one finishes", async () => {
		const { releaseAll, server, waitForPending } = await makeServer(2);

		const first = server.inject("/slow");
		const second = server.inject("/slow");
		await waitForPending(2);

		const rejected = await server.inject("/");
		assert.is(rejected.statusCode, 503);
		assert.undefined((rejected.request.response as { isBoom?: boolean }).isBoom);
		assert.equal(JSON.parse(rejected.payload), {
			error: "Service Unavailable",
			message: "Too many concurrent requests",
			statusCode: 503,
		});

		releaseAll();
		assert.is((await first).statusCode, 200);
		assert.is((await second).statusCode, 200);

		assert.is((await server.inject("/")).statusCode, 200);
	});

	it("should not limit routes that do not opt in", async () => {
		const { pending, releaseAll, server, waitForPending } = await makeServer(1);

		const held = server.inject("/slow");
		await waitForPending(1);

		const open = [server.inject("/open"), server.inject("/disabled")];
		await waitForPending(3);

		assert.length(pending, 3);
		assert.is((await server.inject("/")).statusCode, 503);

		releaseAll();
		for (const response of await Promise.all([held, ...open])) {
			assert.is(response.statusCode, 200);
		}
	});

	it("should free the slot of a request that fails validation", async () => {
		const { server } = await makeServer(1);

		assert.is((await server.inject("/validated")).statusCode, 400);
		assert.is((await server.inject("/validated?valid=true")).statusCode, 200);
	});

	it("should free the slot when the handler fails", async () => {
		const { server } = await makeServer(1);

		assert.is((await server.inject("/error")).statusCode, 500);
		assert.is((await server.inject("/")).statusCode, 200);
	});
});
