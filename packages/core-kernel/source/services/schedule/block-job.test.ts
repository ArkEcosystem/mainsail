import { describe, Sandbox } from "../../../../core-test-framework";

import { BlockEvent, ScheduleEvent } from "../../enums";
import { Identifiers } from "../../ioc";
import { MemoryEventDispatcher } from "../events";
import { BlockJob } from "./block-job";
import sinon from "sinon";

const delay = async (timeout) => {
	await new Promise<void>((resolve) => {
		setTimeout(() => {
			resolve();
		}, timeout);
	});
};

const expectFinishedEventData = () => {
	return sinon.match({
		executionTime: sinon.match.number,
		blockCount: sinon.match.number,
	});
};

describe<{
	sandbox: Sandbox;
	job: BlockJob;
	eventDispatcher: MemoryEventDispatcher;
}>("BlockJob", ({ assert, beforeEach, it, spy, spyFn }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.eventDispatcher = context.sandbox.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher);

		context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(context.eventDispatcher);

		context.job = context.sandbox.app.resolve<BlockJob>(BlockJob);
	});

	it("should execute on cron", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const fn = spyFn();

		context.job.cron(3).execute(fn);

		assert.true(fn.notCalled);

		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 1 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 3 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 4 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 6 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 7 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 9 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 10 });

		await delay(100);

		assert.true(fn.calledThrice);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every block", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const fn = spyFn();

		context.job.everyBlock().execute(fn);

		assert.true(fn.notCalled);

		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 1 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 1 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 1 });

		await delay(100);

		assert.true(fn.calledThrice);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every five blocks", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const fn = spyFn();

		context.job.everyFiveBlocks().execute(fn);

		assert.true(fn.notCalled);

		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 1 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 5 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 6 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 10 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 11 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 15 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 16 });

		await delay(100);

		assert.true(fn.calledThrice);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every ten blocks", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const fn = spyFn();

		context.job.everyTenBlocks().execute(fn);

		assert.true(fn.notCalled);

		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 1 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 10 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 11 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 20 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 21 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 30 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 31 });

		await delay(100);

		assert.true(fn.calledThrice);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every fifteen blocks", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const fn = spyFn();

		context.job.everyFifteenBlocks().execute(fn);

		assert.true(fn.notCalled);

		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 1 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 15 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 16 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 30 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 31 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 45 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 46 });

		await delay(100);

		assert.true(fn.calledThrice);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every thirty blocks", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const fn = spyFn();

		context.job.everyThirtyBlocks().execute(fn);

		assert.true(fn.notCalled);

		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 1 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 30 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 31 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 60 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 61 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 90 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 91 });

		await delay(100);

		assert.true(fn.calledThrice);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every round", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const fn = spyFn();

		context.job.everyRound().execute(fn);

		assert.true(fn.notCalled);

		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 1 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 51 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 52 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 102 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 103 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 153 });
		context.eventDispatcher.dispatchSync(BlockEvent.Received, { height: 154 });

		await delay(100);

		assert.true(fn.calledThrice);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});
});
