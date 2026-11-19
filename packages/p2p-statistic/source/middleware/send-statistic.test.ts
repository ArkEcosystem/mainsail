import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { StatisticSendMiddleware } from "./send-statistic";

describe<{
	middleware: StatisticSendMiddleware;
	emits: unknown[][];
	failing: { value: boolean };
}>("StatisticSendMiddleware", ({ it, assert, beforeEach, clock }) => {
	const makeContext = (): any => ({ connection: { remoteAddress: "1.1.1.1" }, route: { path: "getStatus" } });

	beforeEach((context) => {
		context.emits = [];
		context.failing = { value: false };

		const app = new Application();
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {} });
		app.bind(Identifiers.P2P.Statistic.Service).toConstantValue({
			getCurrentRoundStatistic: () => ({
				addEmit: (...arguments_: unknown[]) => {
					if (context.failing.value) {
						throw new Error("boom");
					}

					context.emits.push(arguments_);
				},
			}),
		});

		context.middleware = app.resolve(StatisticSendMiddleware);
	});

	it("should record an answered request with its duration", async ({ middleware, emits }) => {
		const fakeTimers = clock({ toFake: ["performance"] });
		const context = makeContext();

		await middleware.before(context);
		fakeTimers.tick(42);
		await middleware.after(context);
		await middleware.finally(context);

		assert.equal(emits, [["1.1.1.1", "getStatus", { responseTime: 42, success: true }]]);
	});

	it("should record a request that did not reach its after step as failed", async ({ middleware, emits }) => {
		const fakeTimers = clock({ toFake: ["performance"] });
		const context = makeContext();

		await middleware.before(context);
		fakeTimers.tick(5000);
		await middleware.finally(context);

		assert.equal(emits, [["1.1.1.1", "getStatus", { responseTime: 5000, success: false }]]);
	});

	it("should keep requests in flight apart", async ({ middleware, emits }) => {
		const fakeTimers = clock({ toFake: ["performance"] });
		const first = makeContext();
		const second = makeContext();

		await middleware.before(first);
		fakeTimers.tick(10);
		await middleware.before(second);
		fakeTimers.tick(10);
		await middleware.after(second);
		await middleware.finally(second);
		await middleware.finally(first);

		assert.equal(emits, [
			["1.1.1.1", "getStatus", { responseTime: 10, success: true }],
			["1.1.1.1", "getStatus", { responseTime: 20, success: false }],
		]);
	});

	it("should not fail the request when recording it fails", async ({ middleware, emits, failing }) => {
		const context = makeContext();
		failing.value = true;

		await middleware.before(context);
		await middleware.finally(context);

		assert.equal(emits, []);
	});
});
