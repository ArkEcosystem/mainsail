import { Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { Scheduler } from "./scheduler";

describe<{
	sandbox: Sandbox;
	scheduler: Scheduler;
}>("Scheduler", ({ beforeEach, it, assert, spy, clock }) => {
	const consensus = {
		onTimeoutPropose: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Consensus.Service).toConstantValue(consensus);

		context.scheduler = context.sandbox.app.resolve(Scheduler);
	});

	it("should be instantiated", async ({ scheduler }) => {
		assert.instance(scheduler, Scheduler);
	});

	it("should call onTimeoutPropose", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPropose");

		const promise = scheduler.scheduleTimeoutPropose(1, 0);

		fakeTimers.tick(1000);

		await promise;

		spyOnTimeoutPropose.calledOnce();
	});
});
