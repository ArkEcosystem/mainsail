import { Identifiers } from "@mainsail/contracts";
import esmock from "esmock";

import { describe, Sandbox } from "../../test-framework/source";
import { Scheduler } from "./scheduler";

let currentTimestamp: number;

const { Scheduler: SchedulerProxy } = await esmock("./scheduler", {
	dayjs: () => ({ valueOf: () => currentTimestamp }),
});

describe<{
	sandbox: Sandbox;
	scheduler: Scheduler;
}>("Scheduler", ({ beforeEach, it, assert, spy, clock, stub }) => {
	currentTimestamp = 0;

	const delays = [1000, 3000, 5000];

	const consensus = {
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
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Consensus.Service).toConstantValue(consensus);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(config);
		context.sandbox.app.bind(Identifiers.State.Store).toConstantValue(store);

		context.scheduler = context.sandbox.app.resolve(SchedulerProxy);
	});

	it("should be instantiated", async ({ scheduler }) => {
		assert.instance(scheduler, SchedulerProxy);
	});

	it("#getNextBlockTimestamp - should return previous block timestamp + blockTime", async ({ scheduler }) => {
		const spyOnGetLatBlock = stub(store, "getLastBlock").returnValue({
			data: {
				timestamp: 0,
			},
		});

		assert.equal(scheduler.getNextBlockTimestamp(0), 8000);
		spyOnGetLatBlock.calledOnce();
	});

	it("#getNextBlockTimestamp - should return previous block commitTime + blockPrepareTime", async ({ scheduler }) => {
		const spyOnGetLatBlock = stub(store, "getLastBlock").returnValue({
			data: {
				timestamp: 0,
			},
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
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrevote");

		assert.true(scheduler.scheduleTimeoutPrevote(1, 2));
		scheduler.clear();

		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.neverCalled();
	});

	it("#clear - should clear timeoutPrevote", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrecommit");

		assert.true(scheduler.scheduleTimeoutPrecommit(1, 2));
		scheduler.clear();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.neverCalled();
	});
});
