import { Server } from "@hapi/hapi";
import { describe } from "@mainsail/test-runner";

import { concurrencyLimitPerIp } from "./concurrency-limit-per-ip";

type Options = Parameters<typeof concurrencyLimitPerIp.register>[1];

const limited = { plugins: { concurrencyLimit: { enabled: true } } };

const makeServer = async (options: Options) => {
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

	await server.register({ options, plugin: concurrencyLimitPerIp });

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

const from = (ip: string, url = "/slow") => ({ remoteAddress: ip, url });

const forwarded = (ip: string, url = "/slow") => ({
	headers: { "x-forwarded-for": ip },
	remoteAddress: "10.0.0.9",
	url,
});

describe("concurrencyLimitPerIp", ({ it, assert, spy }) => {
	it("should expose name, version and once", () => {
		assert.is(concurrencyLimitPerIp.name, "concurrency-limit-per-ip");
		assert.is(concurrencyLimitPerIp.version, "1.0.0");
		assert.true(concurrencyLimitPerIp.once);
	});

	it("should register nothing when the limit is 0", async () => {
		const server = new Server();
		const ext = spy(server, "ext");

		await concurrencyLimitPerIp.register(server, { limit: 0 });

		ext.neverCalled();
	});

	it("should reject requests past the limit of their ip with a 429 until one finishes", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({ limit: 1 });

		const first = server.inject(from("10.0.0.1"));
		await waitForPending(1);

		const rejected = await server.inject(from("10.0.0.1", "/"));
		assert.is(rejected.statusCode, 429);
		assert.undefined((rejected.request.response as { isBoom?: boolean }).isBoom);
		assert.equal(JSON.parse(rejected.payload), {
			error: "Too Many Requests",
			message: "Too many concurrent requests",
			statusCode: 429,
		});
		assert.is((await server.inject(from("10.0.0.2", "/"))).statusCode, 200);

		releaseAll();
		assert.is((await first).statusCode, 200);

		assert.is((await server.inject(from("10.0.0.1", "/"))).statusCode, 200);
	});

	it("should not limit whitelisted ips", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({ limit: 1, whitelist: ["10.0.0.*"] });

		const held = [server.inject(from("10.0.0.1")), server.inject(from("10.0.0.1"))];
		await waitForPending(2);

		assert.is((await server.inject(from("10.0.0.1", "/"))).statusCode, 200);

		held.push(server.inject(from("10.1.0.1")));
		await waitForPending(3);

		assert.is((await server.inject(from("10.1.0.1", "/"))).statusCode, 429);

		releaseAll();
		for (const response of await Promise.all(held)) {
			assert.is(response.statusCode, 200);
		}
	});

	it("should ignore forwarded ips without trusting the proxy", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({ limit: 1 });

		const first = server.inject(forwarded("1.1.1.1"));
		await waitForPending(1);

		assert.is((await server.inject(forwarded("2.2.2.2", "/"))).statusCode, 429);

		releaseAll();
		await first;
	});

	it("should count the forwarded ip when trusting the proxy", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({ limit: 1, trustProxy: true });

		const first = server.inject(forwarded("1.1.1.1"));
		await waitForPending(1);

		assert.is((await server.inject(forwarded("1.1.1.1", "/"))).statusCode, 429);
		assert.is((await server.inject(forwarded("2.2.2.2", "/"))).statusCode, 200);

		releaseAll();
		await first;
	});

	it("should not limit routes that do not opt in", async () => {
		const { pending, releaseAll, server, waitForPending } = await makeServer({ limit: 1 });

		const held = server.inject("/slow");
		await waitForPending(1);

		const open = [server.inject("/open"), server.inject("/disabled")];
		await waitForPending(3);

		assert.length(pending, 3);
		assert.is((await server.inject("/")).statusCode, 429);

		releaseAll();
		for (const response of await Promise.all([held, ...open])) {
			assert.is(response.statusCode, 200);
		}
	});

	it("should free the slot of a request that fails validation", async () => {
		const { server } = await makeServer({ limit: 1 });

		assert.is((await server.inject("/validated")).statusCode, 400);
		assert.is((await server.inject("/validated?valid=true")).statusCode, 200);
	});

	it("should free the slot when the handler fails", async () => {
		const { server } = await makeServer({ limit: 1 });

		assert.is((await server.inject("/error")).statusCode, 500);
		assert.is((await server.inject("/")).statusCode, 200);
	});
});
