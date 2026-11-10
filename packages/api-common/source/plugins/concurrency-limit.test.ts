import { Server } from "@hapi/hapi";
import { describe } from "@mainsail/test-runner";
import { get, IncomingMessage, request as httpRequest } from "http";
import { AddressInfo } from "net";

import { concurrencyLimit } from "./concurrency-limit";

type Options = Parameters<typeof concurrencyLimit.register>[1];

const limited = { plugins: { concurrencyLimit: { enabled: true } } };

const makeServer = async (options: Options) => {
	const server = new Server({ host: "127.0.0.1", port: 0 });
	const pending: Array<{ id: string; resolve: () => void }> = [];
	const hold = (request) =>
		new Promise((resolve) => pending.push({ id: request.query.id as string, resolve: () => resolve("ok") }));

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

	await server.register({ options, plugin: concurrencyLimit });

	const waitForPending = async (count: number) => {
		const startedAt = Date.now();

		while (pending.length < count) {
			if (Date.now() - startedAt > 1000) {
				throw new Error(`Expected ${count} pending requests, got ${pending.length}`);
			}

			await new Promise((resolve) => setImmediate(resolve));
		}
	};

	const releaseNext = () => pending.shift()?.resolve();

	const releaseAll = () => {
		for (const { resolve } of pending.splice(0)) {
			resolve();
		}
	};

	return { pending, releaseAll, releaseNext, server, waitForPending };
};

const request = (port: number, path: string) =>
	new Promise<IncomingMessage>((resolve, reject) => {
		get({ host: "127.0.0.1", path, port }, resolve).on("error", reject);
	});

const readBody = (response: IncomingMessage) =>
	new Promise<string>((resolve, reject) => {
		let body = "";
		response.on("data", (chunk) => (body += chunk));
		response.on("end", () => resolve(body));
		response.on("error", reject);
	});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const statusWithin = (response: Promise<{ statusCode: number }>) =>
	Promise.race([response.then(({ statusCode }) => statusCode), sleep(200).then(() => "still pending")]);

describe("concurrencyLimit", ({ it, assert, spy }) => {
	it("should expose name, version and once", () => {
		assert.is(concurrencyLimit.name, "concurrency-limit");
		assert.is(concurrencyLimit.version, "1.0.0");
		assert.true(concurrencyLimit.once);
	});

	it("should register nothing when the limit is 0", async () => {
		const server = new Server();
		const ext = spy(server, "ext");

		await concurrencyLimit.register(server, { limit: 0, queueLimit: 10, queueTimeout: 1000 });

		ext.neverCalled();
	});

	it("should reject requests past the limit with a 503 until one finishes", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({ limit: 2 });

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

	it("should queue requests past the limit until a slot frees", async () => {
		const { pending, releaseNext, server, waitForPending } = await makeServer({
			limit: 1,
			queueLimit: 10,
			queueTimeout: 1000,
		});

		const first = server.inject("/slow?id=1");
		await waitForPending(1);

		const queued = server.inject("/slow?id=2");
		await sleep(10);

		assert.length(pending, 1);

		releaseNext();
		await waitForPending(1);

		assert.is(pending[0].id, "2");

		releaseNext();

		assert.is((await first).statusCode, 200);
		assert.is((await queued).statusCode, 200);
	});

	it("should serve queued requests in arrival order", async () => {
		const { pending, releaseNext, server, waitForPending } = await makeServer({
			limit: 1,
			queueLimit: 10,
			queueTimeout: 1000,
		});

		const responses = [server.inject("/slow?id=1")];
		await waitForPending(1);
		responses.push(server.inject("/slow?id=2"), server.inject("/slow?id=3"));
		await sleep(10);

		const served: string[] = [];
		for (let index = 0; index < 3; index++) {
			await waitForPending(1);
			served.push(pending[0].id);
			releaseNext();
		}

		assert.equal(served, ["1", "2", "3"]);
		for (const response of await Promise.all(responses)) {
			assert.is(response.statusCode, 200);
		}
	});

	it("should reject with a 503 when the queue is full", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({
			limit: 1,
			queueLimit: 1,
			queueTimeout: 1000,
		});

		const first = server.inject("/slow");
		await waitForPending(1);
		const queued = server.inject("/slow");
		await sleep(10);

		assert.is(await statusWithin(server.inject("/")), 503);

		releaseAll();
		await first;
		await waitForPending(1);
		releaseAll();

		assert.is((await queued).statusCode, 200);
	});

	it("should reject with a 503 when the wait times out and keep the slot count", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({
			limit: 1,
			limitPerIp: 1,
			queueLimit: 10,
			queueTimeout: 20,
		});

		const first = server.inject({ remoteAddress: "10.0.0.2", url: "/slow" });
		await waitForPending(1);

		assert.is(await statusWithin(server.inject({ remoteAddress: "10.0.0.1", url: "/" })), 503);

		releaseAll();
		await first;

		assert.is((await server.inject({ remoteAddress: "10.0.0.1", url: "/" })).statusCode, 200);
		assert.is((await server.inject({ remoteAddress: "10.0.0.2", url: "/" })).statusCode, 200);
	});

	it("should expire only the queued requests whose wait is over", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({
			limit: 1,
			queueLimit: 10,
			queueTimeout: 200,
		});

		const first = server.inject("/slow");
		await waitForPending(1);

		const early = server.inject("/");
		await sleep(100);
		const late = server.inject("/");

		assert.is((await early).statusCode, 503);

		releaseAll();
		assert.is((await first).statusCode, 200);
		assert.is((await late).statusCode, 200);
	});

	it("should skip queued requests whose client went away", async () => {
		const { pending, releaseAll, releaseNext, server, waitForPending } = await makeServer({
			limit: 1,
			limitPerIp: 3,
			queueLimit: 10,
			queueTimeout: 1000,
		});
		await server.start();

		const { port } = server.listener.address() as AddressInfo;
		const status = async (path: string) => {
			try {
				const response = await request(port, path);
				await readBody(response);

				return response.statusCode;
			} catch (error) {
				return error.code;
			}
		};

		try {
			const first = status("/slow?id=1");
			await waitForPending(1);

			const gone = httpRequest({ host: "127.0.0.1", path: "/slow?id=2", port });
			gone.on("error", () => {});
			gone.end();
			await sleep(20);
			gone.destroy();
			await sleep(20);

			const live = status("/slow?id=3");
			await sleep(20);

			releaseNext();
			await waitForPending(1);

			assert.is(pending[0].id, "3");

			releaseNext();

			assert.is(await first, 200);
			assert.is(await live, 200);

			const again = [status("/slow?id=4"), status("/slow?id=5"), status("/slow?id=6")];
			for (let served = 0; served < 3; served++) {
				await sleep(20);
				releaseAll();
			}

			assert.equal(await Promise.all(again), [200, 200, 200]);
		} finally {
			await server.stop({ timeout: 0 });
		}
	});

	it("should reject requests past the limit per ip", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({ limit: 10, limitPerIp: 1 });

		const first = server.inject({ remoteAddress: "10.0.0.1", url: "/slow" });
		await waitForPending(1);

		assert.is(await statusWithin(server.inject({ remoteAddress: "10.0.0.1", url: "/" })), 503);
		assert.is((await server.inject({ remoteAddress: "10.0.0.2", url: "/" })).statusCode, 200);

		releaseAll();
		assert.is((await first).statusCode, 200);

		assert.is((await server.inject({ remoteAddress: "10.0.0.1", url: "/" })).statusCode, 200);
	});

	it("should count queued requests towards the limit per ip", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({
			limit: 1,
			limitPerIp: 2,
			queueLimit: 10,
			queueTimeout: 1000,
		});
		const from = (ip: string) => ({ remoteAddress: ip, url: "/slow" });

		const first = server.inject(from("10.0.0.1"));
		await waitForPending(1);
		const queued = [server.inject(from("10.0.0.1")), server.inject(from("10.0.0.2"))];
		await sleep(10);

		assert.is(await statusWithin(server.inject({ remoteAddress: "10.0.0.1", url: "/" })), 503);

		for (let served = 0; served < 3; served++) {
			await waitForPending(1);
			releaseAll();
		}

		for (const response of await Promise.all([first, ...queued])) {
			assert.is(response.statusCode, 200);
		}

		assert.is((await server.inject({ remoteAddress: "10.0.0.1", url: "/" })).statusCode, 200);
	});

	it("should not limit whitelisted ips per ip but count them towards the limit", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({
			limit: 3,
			limitPerIp: 1,
			limitPerIpWhitelist: ["10.0.0.*"],
		});
		const from = (ip: string, url = "/slow") => ({ remoteAddress: ip, url });

		const held = [server.inject(from("10.0.0.1")), server.inject(from("10.0.0.1"))];
		await waitForPending(2);

		assert.is(await statusWithin(server.inject(from("10.1.0.1", "/"))), 200);

		held.push(server.inject(from("10.1.0.1")));
		await waitForPending(3);

		assert.is(await statusWithin(server.inject(from("10.0.0.1", "/"))), 503);

		releaseAll();
		for (const response of await Promise.all(held)) {
			assert.is(response.statusCode, 200);
		}

		held.splice(0, held.length, server.inject(from("10.1.0.1")));
		await waitForPending(1);

		assert.is(await statusWithin(server.inject(from("10.1.0.1", "/"))), 503);

		releaseAll();
		await Promise.all(held);
	});

	it("should ignore forwarded ips without trusting the proxy", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({ limit: 10, limitPerIp: 1 });
		const from = (ip: string) => ({ headers: { "x-forwarded-for": ip }, remoteAddress: "10.0.0.9" });

		const first = server.inject({ ...from("1.1.1.1"), url: "/slow" });
		await waitForPending(1);

		assert.is(await statusWithin(server.inject({ ...from("2.2.2.2"), url: "/" })), 503);

		releaseAll();
		await first;
	});

	it("should count the forwarded ip when trusting the proxy", async () => {
		const { releaseAll, server, waitForPending } = await makeServer({
			limit: 10,
			limitPerIp: 1,
			trustProxy: true,
		});
		const from = (ip: string) => ({ headers: { "x-forwarded-for": ip }, remoteAddress: "10.0.0.9" });

		const first = server.inject({ ...from("1.1.1.1"), url: "/slow" });
		await waitForPending(1);

		assert.is(await statusWithin(server.inject({ ...from("1.1.1.1"), url: "/" })), 503);
		assert.is((await server.inject({ ...from("2.2.2.2"), url: "/" })).statusCode, 200);

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
		assert.is(await statusWithin(server.inject("/")), 503);

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
