import { Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import rewiremock from "rewiremock";

import { Scheduler } from "./scheduler";

describe<{
	sandbox: Sandbox;
	scheduler: Scheduler;
}>("Scheduler", ({ beforeEach, it, assert, spy, spyFn, clock, stub }) => {
	let onDelay = (timeout: number) => {};
	let currentTimestamp = 0;

	const { Scheduler: SchedulerProxy } = rewiremock.proxy<{ Scheduler: Scheduler }>("./scheduler", {
		dayjs: () => ({ unix: () => currentTimestamp }),
		delay: async (timeout: number) => {
			onDelay(timeout);
		},
	});

	const delays = [1000, 3000, 5000];

	const consensus = {
		onTimeoutPrecommit: () => {},
		onTimeoutPrevote: () => {},
		onTimeoutPropose: () => {},
	};

	const config = {
		getMilestone: () => ({
			blockTime: 8000,
			stageTimeout: 1000,
			stageTimeoutIncrease: 2000,
		}),
	};

	const stateStore = {
		getLastBlock: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Consensus.Service).toConstantValue(consensus);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(config);
		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(stateStore);

		context.scheduler = context.sandbox.app.resolve(SchedulerProxy);
	});

	it("should be instantiated", async ({ scheduler }) => {
		assert.instance(scheduler, SchedulerProxy);
	});

	it("#delayProposal - should delay proposal for blockTime - difference", async ({ scheduler }) => {
		const spyDelay = spyFn();
		onDelay = (timeout) => {
			spyDelay.call(timeout);
		};
		const spyOnGetLatBlock = stub(stateStore, "getLastBlock").returnValue({
			data: {
				timestamp: 0,
			},
		});

		currentTimestamp = 2000;
		const promise = scheduler.delayProposal();

		await promise;
		spyOnGetLatBlock.calledOnce();
		spyDelay.calledOnce();
		spyDelay.calledWith(8000 - currentTimestamp);
	});

	it("#scheduleTimeoutPropose - should call onTimeoutPropose ", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPropose");

		void scheduler.scheduleTimeoutPropose(1, 2);
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPropose - should call onTimeoutPropose only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPropose");

		void scheduler.scheduleTimeoutPropose(1, 2);
		void scheduler.scheduleTimeoutPropose(1, 2);
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPropose - should increase delay on higher round ", async ({ scheduler }) => {
		const fakeTimers = clock();

		const timerValues: number[] = [];

		void scheduler.scheduleTimeoutPropose(1, 0);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		void scheduler.scheduleTimeoutPropose(1, 1);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		void scheduler.scheduleTimeoutPropose(1, 2);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);

		assert.equal(timerValues, delays);
	});

	it("#scheduleTimeoutPrevote - should call onTimeoutPrevote", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrevote");

		void scheduler.scheduleTimeoutPrevote(1, 2);
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrevote - should call onTimeoutPrevote only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrevote");

		void scheduler.scheduleTimeoutPrevote(1, 2);
		void scheduler.scheduleTimeoutPrevote(1, 2);
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrevote - should increase delay on higher round ", async ({ scheduler }) => {
		const fakeTimers = clock();

		const timerValues: number[] = [];

		void scheduler.scheduleTimeoutPrevote(1, 0);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		void scheduler.scheduleTimeoutPrevote(1, 1);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		void scheduler.scheduleTimeoutPrevote(1, 2);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);

		assert.equal(timerValues, delays);
	});

	it("#scheduleTimeoutPrecommit - should call onTimeoutPrecommit ", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrecommit");

		void scheduler.scheduleTimeoutPrecommit(1, 2);
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrecommit - should call onTimeoutPrecommit only once", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrecommit");

		void scheduler.scheduleTimeoutPrecommit(1, 2);
		void scheduler.scheduleTimeoutPrecommit(1, 2);
		await fakeTimers.nextAsync();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.calledOnce();
	});

	it("#scheduleTimeoutPrecommit - should increase delay on higher round ", async ({ scheduler }) => {
		const fakeTimers = clock();

		const timerValues: number[] = [];

		void scheduler.scheduleTimeoutPrecommit(1, 0);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		void scheduler.scheduleTimeoutPrecommit(1, 1);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);
		fakeTimers.now = 0;

		void scheduler.scheduleTimeoutPrecommit(1, 2);
		await fakeTimers.nextAsync();
		timerValues.push(fakeTimers.now);

		assert.equal(timerValues, delays);
	});

	it("#clear - should clear timeoutPropose", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPropose");

		void scheduler.scheduleTimeoutPropose(1, 2);
		scheduler.clear();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.neverCalled();
	});

	it("#clear - should clear timeoutPrevote", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrevote");

		void scheduler.scheduleTimeoutPrevote(1, 2);
		scheduler.clear();

		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.neverCalled();
	});

	it("#clear - should clear timeoutPrevote", async ({ scheduler }) => {
		const fakeTimers = clock();
		const spyOnTimeoutPropose = spy(consensus, "onTimeoutPrecommit");

		void scheduler.scheduleTimeoutPrecommit(1, 2);
		scheduler.clear();
		await fakeTimers.nextAsync();

		spyOnTimeoutPropose.neverCalled();
	});
});
