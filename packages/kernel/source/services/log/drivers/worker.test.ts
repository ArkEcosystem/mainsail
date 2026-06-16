import { describe } from "@mainsail/test-runner";

import { Application } from "../../../application";
import { WorkerLogger } from "./worker";

describe<{
	logger: WorkerLogger;
}>("WorkerLogger", ({ assert, beforeEach, it, stub }) => {
	beforeEach(async (context) => {
		context.logger = (await new Application().resolve(WorkerLogger).make({})) as WorkerLogger;
	});

	it("make should return the logger instance", async ({ logger }) => {
		assert.instance(await logger.make({}), WorkerLogger);
	});

	it("should write each level to stdout with a level prefix", ({ logger }) => {
		const spyWrite = stub(process.stdout, "write");

		logger.alert("a");
		logger.error("b");
		logger.warn("c");
		logger.notice("d");
		logger.info("e");
		logger.debug("f");

		spyWrite.calledWith("[alert] a\n");
		spyWrite.calledWith("[error] b\n");
		spyWrite.calledWith("[warn] c\n");
		spyWrite.calledWith("[notice] d\n");
		spyWrite.calledWith("[info] e\n");
		spyWrite.calledWith("[debug] f\n");
		spyWrite.calledTimes(6);
	});

	it("should not write when console output is suppressed", ({ logger }) => {
		const spyWrite = stub(process.stdout, "write");

		logger.suppressConsoleOutput(true);
		logger.info("ignored");

		spyWrite.neverCalled();
	});

	it("should not write an empty message", ({ logger }) => {
		const spyWrite = stub(process.stdout, "write");

		logger.info("");

		spyWrite.neverCalled();
	});
});
