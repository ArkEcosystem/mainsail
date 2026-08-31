import { Identifiers, Events } from "@mainsail/constants";

import { Application } from "../../application";
import { describe } from "@mainsail/test-runner";
import { MemoryEventDispatcher } from "../events";
import { BlockJob } from "./block-job";

describe<{
	app: Application;
	job: BlockJob;
	eventDispatcher: MemoryEventDispatcher;
}>("BlockJob", ({ assert, beforeEach, it, spy, spyFn, match }) => {
	const expectFinishedEventData = () =>
		match({
			blockCount: match.number,
			executionTime: match.number,
		});

	beforeEach((context) => {
		context.app = new Application();
		context.eventDispatcher = context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher);

		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({ warn: () => {} });

		context.job = context.app.resolve<BlockJob>(BlockJob);
	});

	it("should execute on cron", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const function_ = spyFn();

		context.job.cron(3).execute(() => {
			function_.call();
		});

		function_.neverCalled();

		await context.eventDispatcher.dispatch(Events.BlockEvent.Applied, { number: 1 });
		await context.eventDispatcher.dispatch(Events.BlockEvent.Applied, { number: 3 });
		await context.eventDispatcher.dispatch(Events.BlockEvent.Applied, { number: 4 });
		await context.eventDispatcher.dispatch(Events.BlockEvent.Applied, { number: 6 });
		await context.eventDispatcher.dispatch(Events.BlockEvent.Applied, { number: 7 });
		await context.eventDispatcher.dispatch(Events.BlockEvent.Applied, { number: 9 });
		await context.eventDispatcher.dispatch(Events.BlockEvent.Applied, { number: 10 });

		function_.calledTimes(3);

		spyOnDispatch.calledTimes(10); // 7 + 3 calls for BlockJobFinished
		spyOnDispatch.calledWith(Events.ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should dispatch BlockJobFailed when the callback throws", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		context.job.cron(1).execute(() => {
			throw new Error("boom");
		});

		await context.eventDispatcher.dispatch(Events.BlockEvent.Applied, { number: 1 });

		spyOnDispatch.calledWith(Events.ScheduleEvent.BlockJobFailed, expectFinishedEventData());
	});

	it("should throw when the block count is not a positive integer", (context) => {
		assert.throws(() => context.job.cron(0));
		assert.throws(() => context.job.cron(-1));
		assert.throws(() => context.job.cron(1.5));
		assert.throws(() => context.job.cron(Number.NaN));
	});

	it("should not break the block.applied dispatch when result listeners throw", async (context) => {
		// Faulty listeners on BOTH result events must not propagate out of the block.applied
		// dispatch. The Finished->Failed fall-through is caught by the inner try/catch; the
		// Failed dispatch rejecting is what the explicit .catch() in BlockJob guards against.
		const throwingListener = {
			handle: () => {
				throw new Error("listener boom");
			},
		};
		context.eventDispatcher.listen(Events.ScheduleEvent.BlockJobFinished, throwingListener);
		context.eventDispatcher.listen(Events.ScheduleEvent.BlockJobFailed, throwingListener);

		const function_ = spyFn();
		context.job.cron(1).execute(() => function_.call());

		await assert.resolves(() => context.eventDispatcher.dispatch(Events.BlockEvent.Applied, { number: 1 }));

		function_.calledOnce();
	});
});
