import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { StatisticReceiveMiddleware } from "./receive-statistic";

describe<{
	middleware: StatisticReceiveMiddleware;
	pings: unknown[][];
	failing: { value: boolean };
}>("StatisticReceiveMiddleware", ({ it, assert, beforeEach, clock }) => {
	const makeContext = (): any => ({
		connection: { remoteAddress: "1.1.1.1" },
		response: {},
		route: { path: "postMessage" },
	});

	beforeEach((context) => {
		context.pings = [];
		context.failing = { value: false };

		const app = new Application();
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {} });
		app.bind(Identifiers.P2P.Statistic.Service).toConstantValue({
			getCurrentRoundStatistic: () => ({
				addPing: (...arguments_: unknown[]) => {
					if (context.failing.value) {
						throw new Error("boom");
					}

					context.pings.push(arguments_);
				},
			}),
		});

		context.middleware = app.resolve(StatisticReceiveMiddleware);
	});

	it("should record a handled request with its duration", async ({ middleware, pings }) => {
		const fakeTimers = clock({ toFake: ["performance"] });
		const context = makeContext();

		await middleware.before(context);
		fakeTimers.tick(7);
		context.response.payload = Buffer.alloc(1);
		await middleware.finally(context);

		assert.equal(pings, [["1.1.1.1", "postMessage", { responseTime: 7, success: true }]]);
	});

	it("should record a request that produced no response as failed", async ({ middleware, pings }) => {
		const fakeTimers = clock({ toFake: ["performance"] });
		const context = makeContext();

		await middleware.before(context);
		fakeTimers.tick(3);
		await middleware.finally(context);

		assert.equal(pings, [["1.1.1.1", "postMessage", { responseTime: 3, success: false }]]);
	});

	it("should not fail the request when recording it fails", async ({ middleware, pings, failing }) => {
		const context = makeContext();
		failing.value = true;

		await middleware.before(context);
		await middleware.finally(context);

		assert.equal(pings, []);
	});
});
