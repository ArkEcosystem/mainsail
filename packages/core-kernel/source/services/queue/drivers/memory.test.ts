import { sleep } from "@arkecosystem/utils";
import { describe, Sandbox } from "../../../../../core-test-framework";

import { Container, Contracts, Enums } from "../../../index";
import { MemoryQueue } from "./memory";
import { EventEmitter } from "events";
import { performance } from "perf_hooks";
import sinon from "sinon";

EventEmitter.prototype.constructor = Object.prototype.constructor;

class DummyJob implements Contracts.Kernel.QueueJob {
	public constructor(private readonly method) {}

	public async handle(): Promise<void> {
		return await this.method();
	}
}

describe<{
	sandbox: Sandbox;
	driver: MemoryQueue;
	eventDispatcher: any;
	logger: any;
	jobMethod: any;
}>("MemoryQueue", ({ assert, beforeEach, it, spy, spyFn, stub, stubFn }) => {
	beforeEach((context) => {
		context.eventDispatcher = {
			dispatch: () => undefined,
		};
		context.logger = {
			warning: () => undefined,
		};
		context.jobMethod = () => undefined;

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Container.Identifiers.EventDispatcherService).toConstantValue(context.eventDispatcher);
		context.sandbox.app.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
		context.driver = context.sandbox.app.resolve<MemoryQueue>(MemoryQueue);
	});

	it("Start should process job", async (context) => {
		const jobMethodSpy = spy(context, "jobMethod");

		await context.driver.push(new DummyJob(context.jobMethod));
		await sleep(50);

		jobMethodSpy.neverCalled();

		await context.driver.start();
		await sleep(50);

		jobMethodSpy.calledOnce();
	});

	it("Start should process on push if already started", async (context) => {
		const jobMethodSpy = spy(context, "jobMethod");

		await context.driver.start();

		await context.driver.push(new DummyJob(context.jobMethod));
		await sleep(50);

		jobMethodSpy.calledOnce();
	});

	it("Start should remain started after all jobs are processed", async (context) => {
		const jobMethodSpy = spy(context, "jobMethod");

		await context.driver.push(new DummyJob(context.jobMethod));

		await context.driver.start();
		await sleep(50);

		jobMethodSpy.calledOnce();
		assert.true(context.driver.isStarted());
	});

	it("Start should not interfere with processing if called multiple times", async (context) => {
		let methodFinish1;
		let methodFinish2;

		const jobMethod1 = async () => {
			await sleep(5);
			methodFinish1 = performance.now();
		};

		const jobMethod2 = async () => {
			await sleep(5);
			methodFinish2 = performance.now();
		};

		const onDrain = spyFn();
		context.driver.on("drain", onDrain);

		await context.driver.push(new DummyJob(jobMethod1));
		await context.driver.push(new DummyJob(jobMethod2));

		const start1 = context.driver.start();
		const start2 = context.driver.start();

		await assert.resolves(() => start1);
		await assert.resolves(() => start2);

		await sleep(15);

		assert.gt(methodFinish2, methodFinish1);
		assert.gt(methodFinish2 - methodFinish1, 4);
		assert.lt(methodFinish2 - methodFinish1, 6);

		assert.true(onDrain.calledOnce);
	});

	it("Clear should clear all jobs when stopped", async (context) => {
		await context.driver.push(new DummyJob(context.jobMethod));

		assert.is(context.driver.size(), 1);

		await context.driver.clear();

		assert.is(context.driver.size(), 0);
	});

	it("Clear should clear all jobs when started and keep current job running", async (context) => {
		const jobMethodStub = stub(context, "jobMethod").callsFake(async () => {
			await sleep(10);
		});

		await context.driver.push(new DummyJob(context.jobMethod));
		await context.driver.push(new DummyJob(context.jobMethod));

		assert.is(context.driver.size(), 2);

		await context.driver.start();
		await context.driver.clear();

		assert.is(context.driver.size(), 0);
		assert.true(context.driver.isRunning());
		assert.true(context.driver.isStarted());
		jobMethodStub.calledOnce(); // Fist job runs instantly

		await sleep(20);
		assert.false(context.driver.isRunning());
		assert.true(context.driver.isStarted());
	});

	it("Stop should clear all jobs when stopped", async (context) => {
		await context.driver.push(new DummyJob(context.jobMethod));

		assert.is(context.driver.size(), 1);

		await context.driver.stop();

		assert.is(context.driver.size(), 0);
		assert.false(context.driver.isStarted());
	});

	it("Stop should clear all jobs when started and wait till current is processed", async (context) => {
		const jobMethodStub = stub(context, "jobMethod").callsFake(async () => {
			await sleep(10);
		});

		await context.driver.push(new DummyJob(context.jobMethod));
		await context.driver.push(new DummyJob(context.jobMethod));

		assert.is(context.driver.size(), 2);

		await context.driver.start();
		await context.driver.stop();

		assert.is(context.driver.size(), 0);
		assert.false(context.driver.isRunning());
		assert.false(context.driver.isStarted());
		jobMethodStub.calledOnce(); // Fist job is run after start
	});

	it("Stop should resolve multiple stop promises", async (context) => {
		const jobMethodStub = stub(context, "jobMethod").callsFake(async () => {
			await sleep(10);
		});

		await context.driver.push(new DummyJob(context.jobMethod));
		await context.driver.push(new DummyJob(context.jobMethod));

		assert.is(context.driver.size(), 2);

		await context.driver.start();
		const stop1 = context.driver.stop();
		const stop2 = context.driver.stop();

		await context.driver.stop();

		assert.is(context.driver.size(), 0);
		assert.false(context.driver.isRunning());
		assert.false(context.driver.isStarted());
		jobMethodStub.calledOnce(); // Fist job is run after start

		await assert.resolves(() => stop1);
		await assert.resolves(() => stop2);
	});

	it("Stop should not process new jobs after stop", async (context) => {
		const jobMethodSpy = spy(context, "jobMethod");

		await context.driver.start();
		await context.driver.stop();

		await context.driver.push(new DummyJob(context.jobMethod));
		await context.driver.push(new DummyJob(context.jobMethod));

		await sleep(10);

		assert.is(context.driver.size(), 2);
		assert.false(context.driver.isRunning());
		assert.false(context.driver.isStarted());
		jobMethodSpy.neverCalled();
	});

	it("Pause should pause after current job is processed", async (context) => {
		const jobMethod1 = stubFn().callsFake(async () => {
			await sleep(50);
		});

		const jobMethod2 = stubFn().callsFake(async () => {
			await sleep(50);
		});

		await context.driver.push(new DummyJob(jobMethod1));
		await context.driver.push(new DummyJob(jobMethod2));

		assert.is(context.driver.size(), 2);

		await context.driver.start();

		await context.driver.pause();

		assert.true(jobMethod1.calledOnce);
		assert.true(jobMethod2.notCalled);

		assert.is(context.driver.size(), 1);
		assert.false(context.driver.isRunning());
		assert.false(context.driver.isStarted());
	});

	it("Pause should pause after current job is processed with error", async (context) => {
		const warningLoggerSpy = spy(context.logger, "warning");
		const jobMethod1 = stubFn().callsFake(async () => {
			await sleep(50);
			throw new Error();
		});
		const jobMethod2 = stubFn().callsFake(async () => {
			await sleep(50);
		});

		await context.driver.push(new DummyJob(jobMethod1));
		await context.driver.push(new DummyJob(jobMethod2));

		assert.is(context.driver.size(), 2);

		await context.driver.start();

		await context.driver.pause();

		assert.true(jobMethod1.calledOnce);
		assert.true(jobMethod2.notCalled);

		assert.is(context.driver.size(), 1);
		assert.false(context.driver.isRunning());
		assert.false(context.driver.isStarted());

		warningLoggerSpy.calledOnce();
	});

	it("Pause should not process new jobs after pause", async (context) => {
		await context.driver.push(new DummyJob(context.jobMethod));

		assert.is(context.driver.size(), 1);

		await context.driver.start();
		await context.driver.pause();

		assert.is(context.driver.size(), 0);
		assert.false(context.driver.isRunning());
		assert.false(context.driver.isStarted());

		await context.driver.push(new DummyJob(context.jobMethod));

		assert.is(context.driver.size(), 1);
		assert.false(context.driver.isRunning());
		assert.false(context.driver.isStarted());
	});

	it("Pause should resolve all if called multiple times", async (context) => {
		const jobMethod1 = stubFn().callsFake(async () => {
			await sleep(50);
		});
		const jobMethod2 = stubFn().callsFake(async () => {
			await sleep(50);
		});

		await context.driver.push(new DummyJob(jobMethod1));
		await context.driver.push(new DummyJob(jobMethod2));

		assert.is(context.driver.size(), 2);

		await context.driver.start();

		const pause1 = context.driver.pause();
		await context.driver.pause();

		await assert.resolves(() => pause1);

		assert.true(jobMethod1.calledOnce);
		assert.true(jobMethod2.notCalled);

		assert.is(context.driver.size(), 1);
		assert.false(context.driver.isRunning());
		assert.false(context.driver.isStarted());
	});

	it("Resume should resume processing after pause", async (context) => {
		await context.driver.pause();

		await context.driver.push(new DummyJob(context.jobMethod));

		assert.is(context.driver.size(), 1);
		assert.false(context.driver.isStarted());

		await context.driver.resume();

		await sleep(10);

		assert.is(context.driver.size(), 0);
		assert.true(context.driver.isStarted());
	});

	it("Resume should resume processing after stop", async (context) => {
		await context.driver.stop();

		await context.driver.push(new DummyJob(context.jobMethod));

		assert.is(context.driver.size(), 1);
		assert.false(context.driver.isStarted());

		await context.driver.resume();

		await sleep(10);

		assert.is(context.driver.size(), 0);
		assert.true(context.driver.isStarted());
	});

	it("Resume should not interfere with start", async (context) => {
		let methodFinish1;
		let methodFinish2;

		const jobMethod1 = stubFn().callsFake(async () => {
			await sleep(50);
			methodFinish1 = performance.now();
		});
		const jobMethod2 = stubFn().callsFake(async () => {
			await sleep(50);
			methodFinish2 = performance.now();
		});

		const onDrain = spyFn();
		context.driver.on("drain", onDrain);

		await context.driver.push(new DummyJob(jobMethod1));
		await context.driver.push(new DummyJob(jobMethod2));

		const start1 = context.driver.start();
		const resume1 = context.driver.resume();

		await assert.resolves(() => start1);
		await assert.resolves(() => resume1);

		await sleep(150);

		assert.gt(methodFinish2, methodFinish1);
		assert.gt(methodFinish2 - methodFinish1, 40);
		assert.lt(methodFinish2 - methodFinish1, 60);

		assert.true(onDrain.calledOnce);
	});

	it("Resume should not interfere with another resume", async (context) => {
		let methodFinish1;
		let methodFinish2;

		const jobMethod1 = stubFn().callsFake(async () => {
			await sleep(50);
			methodFinish1 = performance.now();
		});
		const jobMethod2 = stubFn().callsFake(async () => {
			await sleep(50);
			methodFinish2 = performance.now();
		});

		const onDrain = spyFn();
		context.driver.on("drain", onDrain);

		await context.driver.push(new DummyJob(jobMethod1));
		await context.driver.push(new DummyJob(jobMethod2));

		const resume1 = context.driver.resume();
		const resume2 = context.driver.resume();

		await assert.resolves(() => resume1);
		await assert.resolves(() => resume2);

		await sleep(150);

		assert.gt(methodFinish2, methodFinish1);
		assert.gt(methodFinish2 - methodFinish1, 40);
		assert.lt(methodFinish2 - methodFinish1, 60);

		assert.true(onDrain.calledOnce);
	});

	it("Later should push job with delay", async (context) => {
		await context.driver.later(50, new DummyJob(context.jobMethod));

		assert.is(context.driver.size(), 0);

		await sleep(60);

		assert.is(context.driver.size(), 1);
	});

	it("Bulk should push multiple jobs", async (context) => {
		await context.driver.bulk([new DummyJob(context.jobMethod), new DummyJob(context.jobMethod)]);

		assert.is(context.driver.size(), 2);
	});

	it("EventEmitter should emit jobDone", async (context) => {
		const onJobDone = spyFn();
		context.driver.on("jobDone", onJobDone);

		const jobMethodStub = stub(context, "jobMethod").returnValue("dummy_data");
		const job1 = new DummyJob(context.jobMethod);
		const job2 = new DummyJob(context.jobMethod);

		await context.driver.push(job1);
		await context.driver.push(job2);
		await context.driver.start();

		await sleep(10);

		jobMethodStub.calledTimes(2);
		assert.true(onJobDone.calledTwice);
		assert.true(onJobDone.calledWith(job1, "dummy_data"));
		assert.true(onJobDone.calledWith(job2, "dummy_data"));
	});

	it("EventEmitter should emit jobError and continue processing", async (context) => {
		const onJobDone = spyFn();
		context.driver.on("jobDone", onJobDone);

		const onJobError = spyFn();
		context.driver.on("jobError", onJobError);

		const jobMethodStub = stub(context, "jobMethod").returnValue("dummy_data");

		const error = new Error("dummy_error");
		const errorMethod = stubFn().callsFake(async () => {
			throw error;
		});

		const job1 = new DummyJob(errorMethod);
		const job2 = new DummyJob(context.jobMethod);

		await context.driver.push(job1);
		await context.driver.push(job2);
		await context.driver.start();

		await sleep(10);

		assert.true(errorMethod.calledOnce);
		jobMethodStub.calledOnce();

		assert.true(onJobError.calledOnce);
		assert.true(onJobError.calledWith(job1, error));

		assert.true(onJobDone.calledOnce);
		assert.true(onJobDone.calledWith(job2, "dummy_data"));
	});

	it("EventEmitter should emit drain", async (context) => {
		const jobMethodSpy = spy(context, "jobMethod");

		const onDrain = spyFn();
		context.driver.on("drain", onDrain);

		await context.driver.push(new DummyJob(context.jobMethod));
		await context.driver.start();

		await sleep(10);

		// Second iteration
		jobMethodSpy.calledOnce();
		assert.true(onDrain.calledOnce);

		await context.driver.push(new DummyJob(context.jobMethod));
		await context.driver.start();

		await sleep(10);

		jobMethodSpy.calledTimes(2);
		assert.true(onDrain.calledTwice);
	});

	it("should dispatch 'queue.finished' after every processed job", async (context) => {
		const jobMethodStub = stub(context, "jobMethod").returnValue("dummy_data");
		const dispatchSpy = spy(context.eventDispatcher, "dispatch");

		await context.driver.push(new DummyJob(context.jobMethod));
		await context.driver.push(new DummyJob(context.jobMethod));

		await context.driver.start();
		await sleep(10);

		jobMethodStub.calledTimes(2);
		dispatchSpy.calledTimes(2);
		dispatchSpy.calledWith(
			Enums.QueueEvent.Finished,
			sinon.match({
				driver: "memory",
				executionTime: sinon.match.number,
				data: "dummy_data",
			}),
		);
	});

	it("should dispatch 'queue.failed' after every failed job", async (context) => {
		const error = new Error("dummy_error");
		const jobMethodStub = stub(context, "jobMethod").callsFake(async () => {
			throw error;
		});
		const dispatchSpy = spy(context.eventDispatcher, "dispatch");
		const warningLoggerSpy = spy(context.logger, "warning");

		await context.driver.push(new DummyJob(context.jobMethod));
		await context.driver.push(new DummyJob(context.jobMethod));

		await context.driver.start();
		await sleep(10);

		jobMethodStub.calledTimes(2);
		warningLoggerSpy.calledTimes(2);
		dispatchSpy.calledTimes(2);
		dispatchSpy.calledWith(
			Enums.QueueEvent.Failed,
			sinon.match({
				driver: "memory",
				executionTime: sinon.match.number,
				error: sinon.match(error),
			}),
		);
	});
});
