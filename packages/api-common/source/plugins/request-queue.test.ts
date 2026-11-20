import { Server } from "@hapi/hapi";
import { describe } from "@mainsail/test-runner";
import http from "node:http";

import { requestQueue } from "./request-queue";

const queued = { plugins: { requestQueue: { enabled: true } } };

const makeServer = async (options: { concurrent: number; queued: number }) => {
	const server = new Server({ host: "127.0.0.1", port: 0 });
	const pending: Array<() => void> = [];
	const started: string[] = [];
	const hold = (request: { query: { name?: string } }) => {
		started.push(request.query.name ?? "");

		return new Promise((resolve) => pending.push(() => resolve("ok")));
	};

	server.route({ handler: hold, method: "GET", options: queued, path: "/slow" });
	server.route({ handler: () => "ok", method: "GET", options: queued, path: "/" });
	server.route({
		handler: () => {
			throw new Error("failed");
		},
		method: "GET",
		options: queued,
		path: "/error",
	});
	server.route({
		handler: () => "ok",
		method: "POST",
		options: {
			...queued,
			validate: {
				payload: () => {
					throw new Error("invalid");
				},
			},
		},
		path: "/validated",
	});
	server.route({ handler: hold, method: "GET", path: "/open" });

	await server.register({ options, plugin: requestQueue });

	const waitFor = async (condition: () => boolean) => {
		const startedAt = Date.now();

		while (!condition()) {
			if (Date.now() - startedAt > 1000) {
				throw new Error("Condition was not met in time");
			}

			await new Promise((resolve) => setImmediate(resolve));
		}
	};

	const releaseOne = () => pending.shift()?.();

	const releaseAll = () => {
		for (const resolve of pending.splice(0)) {
			resolve();
		}
	};

	return { pending, releaseAll, releaseOne, server, started, waitFor };
};

describe("requestQueue", ({ it, assert, nock, spy }) => {
	it("should expose name, version and once", () => {
		assert.is(requestQueue.name, "request-queue");
		assert.is(requestQueue.version, "1.0.0");
		assert.true(requestQueue.once);
	});

	it("should register nothing when no request may run", async () => {
		const server = new Server();
		const ext = spy(server, "ext");

		await requestQueue.register(server, { concurrent: 0, queued: 8 });

		ext.neverCalled();
	});

	it("should run the allowed number of requests and start the waiting ones in arrival order", async () => {
		const { releaseAll, releaseOne, server, started, waitFor } = await makeServer({ concurrent: 2, queued: 2 });

		const responses = ["a", "b", "c", "d"].map((name) => server.inject(`/slow?name=${name}`));
		await waitFor(() => started.length === 2);
		await new Promise((resolve) => setTimeout(resolve, 10));

		assert.equal(started, ["a", "b"]);

		releaseOne();
		await waitFor(() => started.length === 3);

		assert.equal(started, ["a", "b", "c"]);

		releaseOne();
		await waitFor(() => started.length === 4);
		releaseAll();

		assert.equal(started, ["a", "b", "c", "d"]);
		for (const response of await Promise.all(responses)) {
			assert.is(response.statusCode, 200);
		}
	});

	it("should refuse requests with a 429 before validating them once the queue is full", async () => {
		const { releaseAll, server, started, waitFor } = await makeServer({ concurrent: 1, queued: 1 });

		const running = server.inject("/slow?name=a");
		await waitFor(() => started.length === 1);
		const waiting = server.inject("/slow?name=b");
		await new Promise((resolve) => setTimeout(resolve, 10));

		const refused = await server.inject({ method: "POST", payload: {}, url: "/validated" });

		assert.is(refused.statusCode, 429);
		assert.undefined((refused.request.response as { isBoom?: boolean }).isBoom);
		assert.equal(JSON.parse(refused.payload), {
			error: "Too Many Requests",
			message: "Too many concurrent requests",
			statusCode: 429,
		});

		releaseAll();
		assert.is((await running).statusCode, 200);
		await waitFor(() => started.length === 2);
		releaseAll();
		assert.is((await waiting).statusCode, 200);
	});

	it("should leave routes that do not opt in alone", async () => {
		const { releaseAll, server, started, waitFor } = await makeServer({ concurrent: 1, queued: 0 });

		const held = server.inject("/slow?name=a");
		await waitFor(() => started.length === 1);
		const open = server.inject("/open?name=open");
		await waitFor(() => started.length === 2);

		assert.is((await server.inject("/")).statusCode, 429);

		releaseAll();
		assert.is((await held).statusCode, 200);
		assert.is((await open).statusCode, 200);
	});

	it("should free the slot of a request that fails validation or whose handler fails", async () => {
		const { server } = await makeServer({ concurrent: 1, queued: 0 });

		assert.is((await server.inject({ method: "POST", payload: {}, url: "/validated" })).statusCode, 400);
		assert.is((await server.inject("/error")).statusCode, 500);
		assert.is((await server.inject("/")).statusCode, 200);
	});

	it("should give the place of a client that left the queue to the next request", async () => {
		const { releaseAll, releaseOne, server, started, waitFor } = await makeServer({ concurrent: 1, queued: 1 });
		nock.enableNetConnect("127.0.0.1");
		await server.start();

		const running = server.inject("/slow?name=a");
		await waitFor(() => started.length === 1);

		const leaving = http.get(`${server.info.uri}/slow?name=left`);
		leaving.on("error", () => {});
		await new Promise((resolve) => setTimeout(resolve, 50));

		assert.is((await server.inject("/")).statusCode, 429);

		leaving.destroy();
		await new Promise((resolve) => setTimeout(resolve, 50));

		const next = server.inject("/slow?name=b");
		await new Promise((resolve) => setTimeout(resolve, 10));
		releaseOne();
		await waitFor(() => started.length === 2);
		releaseAll();

		assert.equal(started, ["a", "b"]);
		assert.is((await running).statusCode, 200);
		assert.is((await next).statusCode, 200);
		assert.is((await server.inject("/")).statusCode, 200);

		await server.stop();
	});
});
