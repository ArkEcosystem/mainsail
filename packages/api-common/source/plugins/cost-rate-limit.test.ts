import Boom from "@hapi/boom";
import { Server, ServerInjectResponse } from "@hapi/hapi";
import { describe } from "@mainsail/test-runner";

import { costRateLimit } from "./cost-rate-limit";
import { rateLimit } from "./rate-limit";

type Options = Parameters<typeof costRateLimit.register>[1];

const REMOTE = "1.2.3.4";
const WINDOW_END = "Thu, 01 Jan 1970 00:17:40 GMT";
const UNREPORTED = { limit: undefined, remaining: undefined, reset: undefined };

const defaults: Options = {
	duration: 60,
	enabled: true,
	headerPrefix: "X-ThingRateLimit",
	points: 5,
	trustProxy: false,
	whitelist: [],
};

let handled = 0;

const makeServer = async (options: Partial<Options> = {}, requestPoints?: number): Promise<Server> => {
	const server = new Server();

	if (requestPoints !== undefined) {
		await server.register({
			options: {
				blacklist: [],
				duration: 10,
				enabled: true,
				points: requestPoints,
				trustProxy: false,
				whitelist: [],
			},
			plugin: rateLimit,
		});
	}

	server.route({
		handler: () => {
			handled++;

			return "ok";
		},
		method: "GET",
		options: {
			plugins: { costRateLimit: { points: (request) => Number(request.params.points) } },
			validate: {
				query: (value) => {
					if (value.invalid) {
						throw new Error("invalid");
					}

					return value;
				},
			},
		},
		path: "/cost/{points}",
	});
	server.route({
		handler: () => {
			throw Boom.serverUnavailable();
		},
		method: "GET",
		options: { plugins: { costRateLimit: { points: () => 1 } } },
		path: "/down",
	});
	server.route({ handler: () => "ok", method: "GET", path: "/free" });

	await server.register({ options: { ...defaults, ...options }, plugin: costRateLimit });

	return server;
};

const spend = async (server: Server, points: number, remoteAddress = REMOTE, headers = {}) =>
	server.inject({ headers, method: "GET", remoteAddress, url: `/cost/${points}` });

const budget = (response: ServerInjectResponse) => ({
	limit: response.headers["x-thingratelimit-limit"],
	remaining: response.headers["x-thingratelimit-remaining"],
	reset: response.headers["x-thingratelimit-reset"],
});

describe<{
	clock: any;
}>("costRateLimit", ({ it, beforeEach, afterEach, assert, spy, clock }) => {
	beforeEach((context) => {
		context.clock = clock({ now: 1_000_000, toFake: ["Date", "performance", "setTimeout"] });
		handled = 0;
	});

	afterEach((context) => {
		context.clock.restore();
	});

	it("should register no extensions when disabled", async () => {
		const server = new Server();
		const ext = spy(server, "ext");

		await costRateLimit.register(server, { ...defaults, enabled: false });

		ext.neverCalled();
	});

	it("should refuse a request that costs more than the points left before it reaches the handler", async () => {
		const server = await makeServer();

		assert.is((await spend(server, 3)).statusCode, 200);

		const response = await spend(server, 3);

		assert.is(response.statusCode, 429);
		assert.equal(response.result, { error: "Too Many Requests", message: "Too Many Requests", statusCode: 429 });
		assert.is(handled, 1);
	});

	it("should refuse with the message it was given", async () => {
		const server = await makeServer({ message: "Too many things" });

		await spend(server, 5);

		assert.equal((await spend(server, 1)).result, {
			error: "Too Many Requests",
			message: "Too many things",
			statusCode: 429,
		});
	});

	it("should accept a request that costs exactly the points left", async () => {
		const server = await makeServer();

		assert.is((await spend(server, 3)).statusCode, 200);
		assert.is((await spend(server, 2)).statusCode, 200);
		assert.is((await spend(server, 1)).statusCode, 429);
	});

	it("should not charge a refused request", async () => {
		const server = await makeServer();

		assert.is((await spend(server, 3)).statusCode, 200);
		assert.is((await spend(server, 3)).statusCode, 429);
		assert.is((await spend(server, 2)).statusCode, 200);
	});

	it("should refuse a request that costs more than the whole limit without charging it", async () => {
		const server = await makeServer();

		assert.is((await spend(server, 6)).statusCode, 429);
		assert.is((await spend(server, 5)).statusCode, 200);
	});

	it("should neither charge nor report a request that fails validation", async () => {
		const server = await makeServer();

		const invalid = await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/cost/3?invalid=true" });

		assert.is(invalid.statusCode, 400);
		assert.equal(budget(invalid), UNREPORTED);
		assert.is((await spend(server, 5)).statusCode, 200);
	});

	it("should charge only one of two concurrent requests that do not fit together", async () => {
		const server = await makeServer();

		const responses = await Promise.all([spend(server, 4), spend(server, 4)]);

		assert.equal(responses.map((response) => response.statusCode).sort(), [200, 429]);
		assert.is((await spend(server, 1)).statusCode, 200);
		assert.is((await spend(server, 1)).statusCode, 429);
	});

	it("should say in retry-after when the window ends", async ({ clock }) => {
		const server = await makeServer();

		await spend(server, 5);
		clock.tick(20_500);

		const response = await spend(server, 1);

		assert.is(response.statusCode, 429);
		assert.is(response.headers["retry-after"], "40");
	});

	it("should start a new window when the duration has passed", async ({ clock }) => {
		const server = await makeServer();

		await spend(server, 5);
		clock.tick(59_999);

		assert.is((await spend(server, 1)).statusCode, 429);

		clock.tick(1);

		assert.is((await spend(server, 5)).statusCode, 200);
		assert.is((await spend(server, 1)).statusCode, 429);
	});

	it("should keep the window when the system clock is set back", async ({ clock }) => {
		const server = await makeServer();

		await spend(server, 5);
		clock.tick(10_000);
		clock.setSystemTime(clock.now - 3_600_000);

		assert.is((await spend(server, 1)).headers["retry-after"], "50");

		clock.tick(50_000);

		assert.is((await spend(server, 5)).statusCode, 200);
	});

	it("should keep the window when the system clock is set ahead", async ({ clock }) => {
		const server = await makeServer();

		await spend(server, 5);
		clock.tick(10_000);
		clock.setSystemTime(clock.now + 3_600_000);

		assert.is((await spend(server, 1)).headers["retry-after"], "50");
	});

	it("should say the window ends now while the timer of an ended window is late", async ({ clock: installed }) => {
		installed.restore();

		const late = clock({ now: 1_000_000, toFake: ["Date", "performance"] });
		const server = await makeServer();

		await spend(server, 5);
		late.tick(75_000);

		const response = await spend(server, 1);

		assert.is(response.headers["retry-after"], "1");
		assert.is(budget(response).reset, "Thu, 01 Jan 1970 00:17:55 GMT");
	});

	it("should drop a bucket when its window has passed", async ({ clock }) => {
		const server = await makeServer();
		const drop = spy(Map.prototype, "delete");

		await spend(server, 1);
		clock.tick(59_999);

		drop.notCalledWith(REMOTE);

		clock.tick(1);

		drop.calledWith(REMOTE);
	});

	it("should report the limit, the points left and the end of the window", async () => {
		const server = await makeServer();

		assert.equal(budget(await spend(server, 3)), { limit: "5", remaining: "2", reset: WINDOW_END });
		assert.equal(budget(await spend(server, 2)), { limit: "5", remaining: "0", reset: WINDOW_END });
	});

	it("should report the points left unchanged on a refused request", async ({ clock }) => {
		const server = await makeServer();

		await spend(server, 3);
		clock.tick(20_000);

		const response = await spend(server, 3);

		assert.is(response.statusCode, 429);
		assert.equal(budget(response), { limit: "5", remaining: "2", reset: WINDOW_END });
	});

	it("should report the budget when the handler fails", async () => {
		const server = await makeServer();

		const response = await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/down" });

		assert.is(response.statusCode, 503);
		assert.equal(budget(response), { limit: "5", remaining: "4", reset: WINDOW_END });
	});

	it("should report the end of the window in wall time when the system clock is set ahead", async ({ clock }) => {
		const server = await makeServer();

		await spend(server, 1);
		clock.tick(10_000);
		clock.setSystemTime(clock.now + 3_600_000);

		assert.is(budget(await spend(server, 1)).reset, "Thu, 01 Jan 1970 01:17:40 GMT");
	});

	it("should neither limit nor report on a route without points", async () => {
		const server = await makeServer();

		await spend(server, 5);

		const response = await server.inject({ method: "GET", remoteAddress: REMOTE, url: "/free" });

		assert.is(response.statusCode, 200);
		assert.equal(budget(response), UNREPORTED);
	});

	it("should neither limit nor report to a whitelisted address", async () => {
		const server = await makeServer({ whitelist: ["1.2.3.*"] });

		assert.is((await spend(server, 5)).statusCode, 200);

		const response = await spend(server, 5);

		assert.is(response.statusCode, 200);
		assert.equal(budget(response), UNREPORTED);
	});

	it("should match a whitelist entry that is not written in canonical form", async () => {
		const server = await makeServer({ whitelist: ["2001:0DB8:0000:0000:0000:0000:0000:0001"] });

		assert.is((await spend(server, 5, "2001:db8::1")).statusCode, 200);
		assert.is((await spend(server, 5, "2001:db8::1")).statusCode, 200);
	});

	it("should match the whitelist against the address and not its /64", async () => {
		const server = await makeServer({ whitelist: ["2001:db8:1:2::1"] });

		assert.is((await spend(server, 5, "2001:db8:1:2::1")).statusCode, 200);
		assert.is((await spend(server, 5, "2001:db8:1:2::1")).statusCode, 200);
		assert.is((await spend(server, 5, "2001:db8:1:2::2")).statusCode, 200);
		assert.is((await spend(server, 1, "2001:db8:1:2::2")).statusCode, 429);
	});

	it("should count ipv6 clients of the same /64 against one limit", async () => {
		const server = await makeServer();

		assert.is((await spend(server, 3, "2001:db8:1:2::1")).statusCode, 200);
		assert.is((await spend(server, 3, "2001:db8:1:2:ffff::9")).statusCode, 429);
		assert.is((await spend(server, 2, "2001:db8:1:2:ffff::9")).statusCode, 200);
		assert.is((await spend(server, 5, "2001:db8:1:3::1")).statusCode, 200);
	});

	it("should count the forwarded address behind a trusted proxy", async () => {
		const server = await makeServer({ trustProxy: true });

		assert.is((await spend(server, 5, REMOTE, { "x-forwarded-for": "5.6.7.8" })).statusCode, 200);
		assert.is((await spend(server, 1, REMOTE, { "x-forwarded-for": "5.6.7.8" })).statusCode, 429);
		assert.is((await spend(server, 5, REMOTE, { "x-forwarded-for": "5.6.7.9" })).statusCode, 200);
	});

	it("should keep its retry-after and its budget next to those of the request rate limit", async ({ clock }) => {
		const server = await makeServer({}, 100);

		await spend(server, 5);
		clock.tick(1000);

		const response = await spend(server, 1);

		assert.is(response.statusCode, 429);
		assert.is(response.headers["retry-after"], "59");
		assert.is(response.headers["x-ratelimit-remaining"], "98");
		assert.equal(budget(response), { limit: "5", remaining: "0", reset: WINDOW_END });
	});

	it("should not report a budget on a request the request rate limit refuses", async () => {
		const server = await makeServer({}, 1);

		assert.is((await spend(server, 1)).statusCode, 200);

		const response = await spend(server, 1);

		assert.is(response.statusCode, 429);
		assert.is(response.headers["x-ratelimit-remaining"], "0");
		assert.equal(budget(response), UNREPORTED);
	});
});
