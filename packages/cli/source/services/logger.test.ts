import { Console, describe } from "@mainsail/test-framework";
import { Identifiers } from "@mainsail/constants";
import { Output } from "../output";
import { Logger } from "./logger";

describe<{
	logger: Logger;
	cli: Console;
}>("Logger", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.cli = new Console();

		context.logger = context.cli.app.resolve(Logger);
	});

	it("should log an alert message", ({ logger }) => {
		const spyConsole = spy(console, "error");

		logger.alert("this should be written to stdout");

		spyConsole.calledOnce();
	});

	it("should log an error message", ({ logger }) => {
		const spyConsole = spy(console, "error");

		logger.error("this should be written to stdout");

		spyConsole.calledOnce();
	});

	it("should log a warn message", ({ logger }) => {
		const spyConsole = spy(console, "warn");

		logger.warn("this should be written to stdout");

		spyConsole.calledOnce();
	});

	it("should log a notice message", ({ logger }) => {
		const spyConsole = spy(console, "info");

		logger.notice("this should be written to stdout");

		spyConsole.calledOnce();
	});

	it("should log an info message", ({ logger }) => {
		const spyConsole = spy(console, "info");

		logger.info("this should be written to stdout");

		spyConsole.calledOnce();
	});

	it("should log a debug message", ({ logger }) => {
		const spyConsole = spy(console, "debug");

		logger.debug("this should be written to stdout");

		spyConsole.calledOnce();
	});

	it("should log a message", ({ logger }) => {
		const spyConsole = spy(console, "log");

		logger.log("this should be written to stdout");

		spyConsole.calledOnce();
	});

	it("should not log a message if the output is quiet", ({ cli, logger }) => {
		cli.app.get<Output>(Identifiers.Cli.Output.Instance).setVerbosity(0);

		const spyConsole = spy(console, "log");

		logger.log("this should be written to stdout");

		spyConsole.neverCalled();
	});
});
