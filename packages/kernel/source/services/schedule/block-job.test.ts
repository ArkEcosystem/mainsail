import { Identifiers, Events } from "@mainsail/constants";

import crypto from "../../../../core/bin/config/devnet/core/crypto.json";
import { Configuration } from "../../../../crypto-config/distribution/index";
import { Application } from "../../application";
import { Container } from "@mainsail/container";
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

	const delay = async (timeout) => {
		await new Promise<void>((resolve) => {
			setTimeout(() => {
				resolve();
			}, timeout);
		});
	};

	beforeEach((context) => {
		context.app = new Application(new Container());
		context.eventDispatcher = context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher);

		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(crypto);

		context.job = context.app.resolve<BlockJob>(BlockJob);
	});

	it("should execute on cron", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const function_ = spyFn();

		context.job.cron(3).execute(() => {
			function_.call();
		});

		function_.neverCalled();

		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 1 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 3 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 4 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 6 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 7 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 9 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 10 });

		await delay(100);

		function_.calledTimes(3);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(Events.ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every block", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const function_ = spyFn();

		context.job.everyBlock().execute(() => {
			function_.call();
		});

		function_.neverCalled();

		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 1 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 1 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 1 });

		await delay(100);

		function_.calledTimes(3);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(Events.ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every five blocks", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const function_ = spyFn();

		context.job.everyFiveBlocks().execute(() => {
			function_.call();
		});

		function_.neverCalled();

		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 1 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 5 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 6 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 10 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 11 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 15 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 16 });

		await delay(100);

		function_.calledTimes(3);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(Events.ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every ten blocks", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const function_ = spyFn();

		context.job.everyTenBlocks().execute(() => {
			function_.call();
		});

		function_.neverCalled();

		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 1 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 10 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 11 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 20 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 21 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 30 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 31 });

		await delay(100);

		function_.calledTimes(3);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(Events.ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every fifteen blocks", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const function_ = spyFn();

		context.job.everyFifteenBlocks().execute(() => {
			function_.call();
		});

		function_.neverCalled();

		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 1 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 15 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 16 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 30 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 31 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 45 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 46 });

		await delay(100);

		function_.calledTimes(3);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(Events.ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every thirty blocks", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const function_ = spyFn();

		context.job.everyThirtyBlocks().execute(() => {
			function_.call();
		});

		function_.neverCalled();

		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 1 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 30 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 31 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 60 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 61 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 90 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 91 });

		await delay(100);

		function_.calledTimes(3);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(Events.ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});

	it("should execute every round", async (context) => {
		const spyOnDispatch = spy(context.eventDispatcher, "dispatch");

		const function_ = spyFn();

		context.job.everyRound().execute(() => {
			function_.call();
		});

		function_.neverCalled();

		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 1 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 51 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 53 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 102 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 106 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 153 });
		context.eventDispatcher.dispatchSync(Events.BlockEvent.Received, { number: 159 });

		await delay(100);

		function_.calledTimes(3);

		spyOnDispatch.calledTimes(3);
		spyOnDispatch.calledWith(Events.ScheduleEvent.BlockJobFinished, expectFinishedEventData());
	});
});
