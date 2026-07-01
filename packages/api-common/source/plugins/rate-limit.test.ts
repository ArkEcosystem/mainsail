import { describe } from "@mainsail/test-runner";
import { Server } from "@hapi/hapi";
import { RLWrapperBlackAndWhite } from "rate-limiter-flexible";

import { rateLimit } from "./rate-limit";

const REMOTE = "1.2.3.4";

const makeServer = async (options: any): Promise<Server> => {
	const server = new Server();

	server.route({
		handler: () => "ok",
		method: "GET",
		path: "/",
	});

	await server.register({ options, plugin: rateLimit });

	return server;
};

describe<{
	clock: any;
}>("rateLimit", ({ it, beforeEach, afterEach, assert, spy, stub, clock }) => {
	beforeEach((context) => {
		// Only fake Date so Date.now() is deterministic without stalling Hapi's real timers.
		context.clock = clock({ now: 1_000_000, toFake: ["Date"] });
	});

	afterEach((context) => {
		context.clock.restore();
	});

	it("should expose name, version and once", () => {
		assert.is(rateLimit.name, "rate-limit");
		assert.is(rateLimit.version, "1.0.0");
		assert.true(rateLimit.once);
	});

	it("should register no extensions when disabled", async () => {
		const server = new Server();
		const ext = spy(server, "ext");

		await rateLimit.register(
			server as any,
			{
				blacklist: [],
				duration: 60,
				enabled: false,
				points: 5,
				trustProxy: false,
				whitelist: [],
			} as any,
		);

		ext.neverCalled();
	});

	it("should set rate-limit headers on a successful response within the limit", async () => {
		const server = await makeServer({
			blacklist: [],
			duration: 60,
			enabled: true,
			points: 5,
			trustProxy: false,
			whitelist: [],
		});

		const response = await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/" });

		assert.is(response.statusCode, 200);
		assert.is(response.headers["x-ratelimit-limit"], "5");
		// One point consumed out of 5.
		assert.is(response.headers["x-ratelimit-remaining"], "4");
		assert.defined(response.headers["x-ratelimit-reset"]);
	});

	it("should store rate-limit plugin data on the request", async () => {
		const server = await makeServer({
			blacklist: [],
			duration: 60,
			enabled: true,
			points: 5,
			trustProxy: false,
			whitelist: [],
		});

		let captured: any;
		server.route({
			handler: (request) => {
				captured = request.plugins["rate-limit"];
				return "ok";
			},
			method: "GET",
			path: "/capture",
		});

		await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/capture" });

		assert.defined(captured);
		assert.is(captured.remaining, 4);
		assert.is(captured.reset, Date.now() + 60_000);
	});

	it("should return 429 with rate-limit headers when the limit is exceeded", async () => {
		const server = await makeServer({
			blacklist: [],
			duration: 60,
			enabled: true,
			points: 1,
			trustProxy: false,
			whitelist: [],
		});

		const first = await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/" });
		assert.is(first.statusCode, 200);

		const second = await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/" });

		assert.is(second.statusCode, 429);
		assert.is(second.headers["x-ratelimit-limit"], "1");
		assert.is(second.headers["x-ratelimit-remaining"], "0");
		assert.defined(second.headers["x-ratelimit-reset"]);
		assert.defined(second.headers["retry-after"]);
	});

	it("should block a blacklisted IP with 429", async () => {
		const server = await makeServer({
			blacklist: [REMOTE],
			duration: 60,
			enabled: true,
			points: 5,
			trustProxy: false,
			whitelist: [],
		});

		const response = await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/" });

		assert.is(response.statusCode, 429);
	});

	it("should bypass limiting for a whitelisted IP (wildcard)", async () => {
		const server = await makeServer({
			blacklist: [],
			duration: 60,
			enabled: true,
			points: 1,
			trustProxy: false,
			whitelist: ["*"],
		});

		// Two requests from the same IP: without whitelist the 2nd would be 429.
		const first = await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/" });
		const second = await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/" });

		assert.is(first.statusCode, 200);
		assert.is(second.statusCode, 200);
	});

	it("should use the forwarded IP when trustProxy is enabled", async () => {
		const server = await makeServer({
			blacklist: ["9.9.9.9"],
			duration: 60,
			enabled: true,
			points: 5,
			trustProxy: true,
			whitelist: [],
		});

		const response = await server.inject({
			headers: { "x-forwarded-for": "9.9.9.9, 8.8.8.8" },
			method: "GET",
			remoteAddress: REMOTE,
			url: "/",
		});

		// The forwarded IP is blacklisted -> blocked, proving getIp used the header.
		assert.is(response.statusCode, 429);
	});

	it("should return Boom.internal when the limiter rejects with a real Error", async () => {
		const consume = stub(RLWrapperBlackAndWhite.prototype, "consume").rejectedValue(new Error("boom-internal"));

		try {
			const server = await makeServer({
				blacklist: [],
				duration: 60,
				enabled: true,
				points: 5,
				trustProxy: false,
				whitelist: [],
			});

			const response = await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/" });

			assert.is(response.statusCode, 500);
			// No rate-limit plugin data was stored, so no rate-limit headers are added.
			assert.not.defined(response.headers["x-ratelimit-limit"]);
			consume.called();
		} finally {
			consume.restore();
		}
	});
});
