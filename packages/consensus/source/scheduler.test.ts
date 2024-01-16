import { Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import rewiremock from "rewiremock";

import { Scheduler } from "./scheduler";

describe<{
	sandbox: Sandbox;
	scheduler: Scheduler;
}>("Scheduler", ({ beforeEach, it, assert, spy, clock, stub }) => {
	let currentTimestamp = 0;

	const { Scheduler: SchedulerProxy } = rewiremock.proxy<{ Scheduler: Scheduler }>("./scheduler", {
		dayjs: () => ({ valueOf: () => currentTimestamp }),
	});

	const delays = [1000, 3000, 5000];

	const consensus = {
		onTimeoutPrecommit: () => {},
		onTimeoutPrevote: () => {},
		onTimeoutPropose: () => {},
		onTimeoutStartRound: () => {},
	};

	const config = {
		getMilestone: () => ({
			blockTime: 8000,
			stageTimeout: 1000,
			stageTimeoutIncrease: 2000,
		}),
	};

	const store = {
		getLastBlock: () => {},
	};

	const stateService = {
		getStore: () => store,
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Consensus.Service).toConstantValue(consensus);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(config);
		context.sandbox.app.bind(Identifiers.State.Service).toConstantValue(stateService);

		context.scheduler = context.sandbox.app.resolve(SchedulerProxy);
	});

	it("should be instantiated", async ({ scheduler }) => {
		assert.instance(scheduler, SchedulerProxy);
	});

	it("#scheduleTimeoutStartRound - should call onTimeoutStartRound ", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutStartRound = spy(consensus, "onTimeoutStartRound");
		const spyOnGetLatBlock = stub(store, "getLastBlock").returnValue({
			data: {
				timestamp: 0,
			},
		});

		currentTimestamp = 2000;

		scheduler.scheduleTimeoutStartRound();
		await fakeTimers.nextAsync();

		spyOnGetLatBlock.calledOnce();
		spyOnTimeoutStartRound.calledOnce();
		assert.equal(fakeTimers.now, 6000); // 8000 - 2000
	});

	it("#scheduleTimeoutPropose - should call onTimeoutStartRound only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutStartRound = spy(consensus, "onTimeoutStartRound");
		const spyOnGetLatBlock = stub(store, "getLastBlock").returnValue({
			data: {
				timestamp: 0,
			},
		});

		scheduler.scheduleTimeoutStartRound();
		scheduler.scheduleTimeoutStartRound();
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnGetLatBlock.calledOnce();
		spyOnTimeoutStartRound.calledOnce();
	});

	it("#scheduleTimeoutPropose - should call onTimeoutPropose ", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPropose");

		scheduler.scheduleTimeoutPropose(1, 2);
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPropose - should call onTimeoutPropose only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPropose");

		scheduler.scheduleTimeoutPropose(1, 2);
		scheduler.scheduleTimeoutPropose(1, 2);
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPropose - should increase delay on higher round ", async ({ scheduler }) => {
		const fakeTimers = clock();

		const timerValues: number[] = [];

		scheduler.scheduleTimeoutPropose(1, 0);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		scheduler.scheduleTimeoutPropose(1, 1);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		scheduler.scheduleTimeoutPropose(1, 2);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);

		assert.equal(timerValues, delays);
	});

	it("#scheduleTimeoutPrevote - should call onTimeoutPrevote", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrevote");

		scheduler.scheduleTimeoutPrevote(1, 2);
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrevote - should call onTimeoutPrevote only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrevote");

		scheduler.scheduleTimeoutPrevote(1, 2);
		scheduler.scheduleTimeoutPrevote(1, 2);
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrevote - should increase delay on higher round ", async ({ scheduler }) => {
		const fakeTimers = clock();

		const timerValues: number[] = [];

		scheduler.scheduleTimeoutPrevote(1, 0);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		scheduler.scheduleTimeoutPrevote(1, 1);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		scheduler.scheduleTimeoutPrevote(1, 2);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);

		assert.equal(timerValues, delays);
	});

	it("#scheduleTimeoutPrecommit - should call onTimeoutPrecommit ", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrecommit");

		scheduler.scheduleTimeoutPrecommit(1, 2);
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrecommit - should call onTimeoutPrecommit only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrecommit");

		scheduler.scheduleTimeoutPrecommit(1, 2);
		scheduler.scheduleTimeoutPrecommit(1, 2);
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrecommit - should increase delay on higher round ", async ({ scheduler }) => {
		const fakeTimers = clock();

		const timerValues: number[] = [];

		scheduler.scheduleTimeoutPrecommit(1, 0);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		scheduler.scheduleTimeoutPrecommit(1, 1);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		scheduler.scheduleTimeoutPrecommit(1, 2);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);

		assert.equal(timerValues, delays);
	});

	it("#clear - should clear timeoutPropose", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPropose");

		scheduler.scheduleTimeoutPropose(1, 2);
		scheduler.clear();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.neverCalled();
	});

	it("#clear - should clear timeoutPrevote", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrevote");

		scheduler.scheduleTimeoutPrevote(1, 2);
		scheduler.clear();

		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.neverCalled();
	});

	it("#clear - should clear timeoutPrevote", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrecommit");

		scheduler.scheduleTimeoutPrecommit(1, 2);
		scheduler.clear();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.neverCalled();
	});
});
