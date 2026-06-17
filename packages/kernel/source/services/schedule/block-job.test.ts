import { Identifiers, Events } from "@mainsail/constants";

import { Application } from "../../application";
import { describe } from "@mainsail/test-runner";
import { MemoryEventDispatcher } from "../events";
import { BlockJob } from "./block-job";

describe<{
	app: Application;
	job: BlockJob;
	eventDispatcher: MemoryEventDispatcher;
}>("BlockJob", ({ beforeEach, it, spy, spyFn, match }) => {
	const expectFinishedEventData = () =>
		match({
			blockCount: match.number,
			executionTime: match.number,
		});

	beforeEach((context) => {
		context.app = new Application();
		context.eventDispatcher = context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher);

		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);

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
});
