import { Console, describe } from "../../../core-test-framework";
import { Output } from "./output";

describe<{
	output: Output;
}>("Output", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		const cli = new Console();

		context.output = cli.app.resolve(Output);
	});

	it("should mute and unmute the output", ({ output }) => {
		const spyWrite = spy(process.stdout, "write");

		console.log("this should be written to stdout");

		spyWrite.calledOnce();
		spyWrite.reset();

		output.mute();

		console.log("this should not be written to stdout");

		output.unmute();

		spyWrite.neverCalled();
	});

	it("should get and set the verbosity level", ({ output }) => {
		assert.equal(output.getVerbosity(), 1);

		output.setVerbosity(2);

		assert.equal(output.getVerbosity(), 2);
	});

	it("should determine if the verbosity level is quiet", ({ output }) => {
		output.setVerbosity(0);

		assert.true(output.isQuiet());

		output.setVerbosity(1);

		assert.false(output.isQuiet());
	});

	it("should determine if the verbosity level is normal", ({ output }) => {
		output.setVerbosity(1);

		assert.true(output.isNormal());

		output.setVerbosity(0);

		assert.false(output.isNormal());
	});

	it("should determine if the verbosity level is verbose", ({ output }) => {
		output.setVerbosity(2);

		assert.true(output.isVerbose());

		output.setVerbosity(0);

		assert.false(output.isVerbose());
	});

	it("should determine if the verbosity level is debug", ({ output }) => {
		output.setVerbosity(3);

		assert.true(output.isDebug());

		output.setVerbosity(0);

		assert.false(output.isDebug());
	});
});
