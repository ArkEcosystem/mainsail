import { Identifiers } from "@mainsail/constants";
import esmock from "esmock";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Scheduler } from "./scheduler";

let currentTimestamp: number;

const { Scheduler: SchedulerProxy } = await esmock("./scheduler", {
	dayjs: () => ({ valueOf: () => currentTimestamp }),
});

describe<{
	app: Application;
	scheduler: Scheduler;
	logger: any;
}>("Scheduler", ({ beforeEach, it, assert, spy, clock, stub }) => {
	currentTimestamp = 0;

	const delays = [1000, 3000, 5000];

	const consensus = {
		getBlockNumber: () => 1,
		getRound: () => 0,
		onTimeoutPrecommit: () => {},
		onTimeoutPrevote: () => {},
		onTimeoutPropose: () => {},
		onTimeoutStartRound: () => {},
	};

	const config = {
		getMilestone: () => ({
			timeouts: {
				blockPrepareTime: 4000,
				blockTime: 8000,
				stageTimeout: 1000,
				stageTimeoutIncrease: 2000,
			},
		}),
	};

	const store = {
		getLastBlock: () => {},
	};

	beforeEach((context) => {
		context.logger = {
			error: () => {},
		};

		context.app = new Application();

		context.app.bind(Identifiers.Consensus.Service).toConstantValue(consensus);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(config);
		context.app.bind(Identifiers.State.Store).toConstantValue(store);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.scheduler = context.app.resolve(SchedulerProxy);
	});

	it("should be instantiated", async ({ scheduler }) => {
		assert.instance(scheduler, SchedulerProxy);
	});

	it("#getNextBlockTimestamp - should return previous block timestamp + blockTime", async ({ scheduler }) => {
		const spyOnGetLatBlock = stub(store, "getLastBlock").returnValue({
			timestamp: 0,
		});

		assert.equal(scheduler.getNextBlockTimestamp(0), 8000);
		spyOnGetLatBlock.calledOnce();
	});

	it("#getNextBlockTimestamp - should return previous block commitTime + blockPrepareTime", async ({ scheduler }) => {
		const spyOnGetLatBlock = stub(store, "getLastBlock").returnValue({
			timestamp: 0,
		});

		assert.equal(scheduler.getNextBlockTimestamp(6000), 10_000);
		spyOnGetLatBlock.calledOnce();
	});

	it("#scheduleTimeoutBlockPrepare - should call onTimeoutStartRound", async ({ scheduler }) => {
		currentTimestamp = 2000;

		const fakeTimers = clock();
		const spyOnTimeoutStartRound = spy(consensus, "onTimeoutStartRound");

		assert.true(scheduler.scheduleTimeoutBlockPrepare(8000));
		await fakeTimers.nextAsync();

		spyOnTimeoutStartRound.calledOnce();
		assert.equal(fakeTimers.now, 6000); // 8000 - 2000
	});

	it("#scheduleTimeoutBlockPrepare - should call onTimeoutStartRound only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutStartRound = spy(consensus, "onTimeoutStartRound");

		assert.true(scheduler.scheduleTimeoutBlockPrepare(8000));
		assert.false(scheduler.scheduleTimeoutBlockPrepare(8000));
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnTimeoutStartRound.calledOnce();
	});

	it("#scheduleTimeoutPropose - should call onTimeoutPropose ", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPropose");

		assert.true(scheduler.scheduleTimeoutPropose(1, 2));
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPropose - should call onTimeoutPropose only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPropose");

		assert.true(scheduler.scheduleTimeoutPropose(1, 2));
		assert.false(scheduler.scheduleTimeoutPropose(1, 2));
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPropose - should increase delay on higher round ", async ({ scheduler }) => {
		const fakeTimers = clock();

		const timerValues: number[] = [];

		assert.true(scheduler.scheduleTimeoutPropose(1, 0));
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		assert.true(scheduler.scheduleTimeoutPropose(1, 1));
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		assert.true(scheduler.scheduleTimeoutPropose(1, 2));
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);

		assert.equal(timerValues, delays);
	});

	it("#scheduleTimeoutPrevote - should call onTimeoutPrevote", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrevote");

		assert.true(scheduler.scheduleTimeoutPrevote(1, 2));
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrevote - should call onTimeoutPrevote only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrevote");

		assert.true(scheduler.scheduleTimeoutPrevote(1, 2));
		assert.false(scheduler.scheduleTimeoutPrevote(1, 2));
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrevote - should increase delay on higher round ", async ({ scheduler }) => {
		const fakeTimers = clock();

		const timerValues: number[] = [];

		assert.true(scheduler.scheduleTimeoutPrevote(1, 0));
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		assert.true(scheduler.scheduleTimeoutPrevote(1, 1));
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		assert.true(scheduler.scheduleTimeoutPrevote(1, 2));
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);

		assert.equal(timerValues, delays);
	});

	it("#scheduleTimeoutPrecommit - should call onTimeoutPrecommit ", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrecommit");

		assert.true(scheduler.scheduleTimeoutPrecommit(1, 2));
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrecommit - should call onTimeoutPrecommit only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrecommit");

		assert.true(scheduler.scheduleTimeoutPrecommit(1, 2));
		assert.false(scheduler.scheduleTimeoutPrecommit(1, 2));
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrecommit - should increase delay on higher round ", async ({ scheduler }) => {
		const fakeTimers = clock();

		const timerValues: number[] = [];

		assert.true(scheduler.scheduleTimeoutPrecommit(1, 0));
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		assert.true(scheduler.scheduleTimeoutPrecommit(1, 1));
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		assert.true(scheduler.scheduleTimeoutPrecommit(1, 2));
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);

		assert.equal(timerValues, delays);
	});

	const failingHandlers: [string, string, (scheduler: Scheduler) => boolean][] = [
		["onTimeoutStartRound", "blockPrepare 1/0", (scheduler) => scheduler.scheduleTimeoutBlockPrepare(8000)],
		["onTimeoutPropose", "propose 1/2", (scheduler) => scheduler.scheduleTimeoutPropose(1, 2)],
		["onTimeoutPrevote", "prevote 1/2", (scheduler) => scheduler.scheduleTimeoutPrevote(1, 2)],
		["onTimeoutPrecommit", "precommit 1/2", (scheduler) => scheduler.scheduleTimeoutPrecommit(1, 2)],
	];

	for (const [handler, label, schedule] of failingHandlers) {
		it(`#${handler} - should report a failing handler and keep the node running`, async ({
			app,
			scheduler,
			logger,
		}) => {
			// Nothing awaits a timeout handler, so the scheduler has to catch and log a failure itself.
			const fakeTimers = clock();
			const spyTerminate = stub(app, "terminate").callsFake(() => new Promise(() => {}));
			const spyLoggerError = spy(logger, "error");
			const error = new Error("handler failed");
			stub(consensus, handler).rejectedValue(error);

			assert.true(schedule(scheduler));
			await fakeTimers.nextAsync();

			spyTerminate.neverCalled();
			spyLoggerError.calledOnce();
			// The message says which timeout failed, which the error on its own does not, and it carries
			// the stack, which is all an unexpected failure gives you to work from.
			assert.match(spyLoggerError.getCallArgs(0)[0], `Timeout handler ${label} failed:`);
			assert.match(spyLoggerError.getCallArgs(0)[0], error.stack);

			// The timeout no longer counts as pending, so the same one can be scheduled again.
			assert.true(schedule(scheduler));
		});
	}

	const runningHandlers: [string, (scheduler: Scheduler) => boolean][] = [
		["onTimeoutStartRound", (scheduler) => scheduler.scheduleTimeoutBlockPrepare(8000)],
		["onTimeoutPropose", (scheduler) => scheduler.scheduleTimeoutPropose(1, 2)],
		["onTimeoutPrevote", (scheduler) => scheduler.scheduleTimeoutPrevote(1, 2)],
		["onTimeoutPrecommit", (scheduler) => scheduler.scheduleTimeoutPrecommit(1, 2)],
	];

	for (const [handler, schedule] of runningHandlers) {
		it(`#${handler} - should free the slot before the handler runs`, async ({ scheduler }) => {
			const fakeTimers = clock();
			let release!: () => void;
			const spyHandler = stub(consensus, handler).callsFake(
				() => new Promise<void>((resolve) => (release = resolve)),
			);

			assert.true(schedule(scheduler));
			await fakeTimers.nextAsync();
			spyHandler.calledOnce();

			// The timer has fired, so a handler that moves consensus on (e.g. onTimeoutPrecommit starting the
			// next round) must be able to schedule the same kind of timeout again while it is still running.
			assert.true(schedule(scheduler));

			release();
			await fakeTimers.tickAsync(0);

			// The re-scheduled timeout stays tracked once the first handler has finished, so clear() cancels it.
			scheduler.clear();
			await fakeTimers.nextAsync();

			spyHandler.calledOnce();
		});
	}

	it("#clear - should clear timeoutBlockPrepare", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutStartRound = spy(consensus, "onTimeoutStartRound");

		assert.true(scheduler.scheduleTimeoutBlockPrepare(8000));
		scheduler.clear();
		await fakeTimers.nextAsync();

		spyOnTimeoutStartRound.neverCalled();
		// Cleared slots are free again.
		assert.true(scheduler.scheduleTimeoutBlockPrepare(8000));
	});

	it("#clear - should clear timeoutPropose", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPropose");

		assert.true(scheduler.scheduleTimeoutPropose(1, 2));
		scheduler.clear();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.neverCalled();
	});

	it("#clear - should clear timeoutPrevote", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPrevote = spy(consensus, "onTimeoutPrevote");

		assert.true(scheduler.scheduleTimeoutPrevote(1, 2));
		scheduler.clear();
		await fakeTimers.nextAsync();

		spyOnTimeoutPrevote.neverCalled();
	});

	it("#clear - should clear timeoutPrecommit", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPrecommit = spy(consensus, "onTimeoutPrecommit");

		assert.true(scheduler.scheduleTimeoutPrecommit(1, 2));
		scheduler.clear();
		await fakeTimers.nextAsync();

		spyOnTimeoutPrecommit.neverCalled();
	});

	it("#clear - should clear every pending timeout at once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spies = ["onTimeoutStartRound", "onTimeoutPropose", "onTimeoutPrevote", "onTimeoutPrecommit"].map(
			(handler) => spy(consensus, handler),
		);

		assert.true(scheduler.scheduleTimeoutBlockPrepare(8000));
		assert.true(scheduler.scheduleTimeoutPropose(1, 2));
		assert.true(scheduler.scheduleTimeoutPrevote(1, 2));
		assert.true(scheduler.scheduleTimeoutPrecommit(1, 2));
		scheduler.clear();
		await fakeTimers.runAllAsync();

		for (const spyHandler of spies) {
			spyHandler.neverCalled();
		}
	});
});
