import { describe } from "../../../../../core-test-framework";

import { Application } from "../../../application";
import { Logger } from "../../../contracts/kernel";
import { Container } from "inversify";
import { MemoryLogger } from "./memory";
import capcon from "capture-console";

describe<{
	logger: Logger;
	message: string | undefined;
}>("Logger", ({ afterAll, afterEach, assert, beforeAll, beforeEach, it }) => {
	beforeEach(async (context) => {
		capcon.startCapture(process.stdout, (stdout) => (context.message = stdout.toString()));

		capcon.startCapture(process.stderr, (stderr) => (context.message = stderr.toString()));

		// @ts-ignore
		capcon.startCapture(console._stdout, (stdout) => (context.message = stdout.toString()));

		// @ts-ignore
		capcon.startCapture(console._stderr, (stderr) => (context.message = stderr.toString()));
		const app = new Application(new Container());

		context.logger = await app.resolve<Logger>(MemoryLogger).make();
	});

	afterEach((context) => {
		context.message = undefined;
		capcon.stopCapture(process.stdout);
		capcon.stopCapture(process.stderr);
		// @ts-ignore
		capcon.stopCapture(console._stdout);
		// @ts-ignore
		capcon.stopCapture(console._stderr);
	});

	it("should not be logged if empty", (context) => {
		context.logger.info(undefined);

		assert.undefined(context.message);
	});

	it("should modify the message if it is not a string", (context) => {
		context.logger.info(["Hello World"]);

		assert.string(context.message!.trim());
	});

	it("should log a message with the [emergency] level", (context) => {
		context.logger.emergency("emergency_message");

		assert.match(context.message, /emergency/);
		assert.match(context.message, /emergency_message/);
	});

	it("should log a message with the [alert] level", (context) => {
		context.logger.alert("alert_message");

		assert.match(context.message, /alert/);
		assert.match(context.message, /alert_message/);
	});

	it("should log a message with the [critical] level", (context) => {
		context.logger.critical("critical_message");

		assert.match(context.message, /critical/);
		assert.match(context.message, /critical_message/);
	});

	it("should log a message with the [error] level", (context) => {
		context.logger.error("error_message");

		assert.match(context.message, /error/);
		assert.match(context.message, /error_message/);
	});

	it("should log a message with the [warning] level", (context) => {
		context.logger.warning("warning_message");

		assert.match(context.message, /warning/);
		assert.match(context.message, /warning_message/);
	});

	it("should log a message with the [notice] level", (context) => {
		context.logger.notice("notice_message");

		assert.match(context.message, /notice/);
		assert.match(context.message, /notice_message/);
	});

	it("should log a message with the [info] level", (context) => {
		context.logger.info("info_message");

		assert.match(context.message, /info/);
		assert.match(context.message, /info_message/);
	});

	it("should log a message with the [debug] level", (context) => {
		context.logger.debug("debug_message");

		assert.match(context.message, /debug/);
		assert.match(context.message, /debug_message/);
	});

	it("should log a message with the [undefined] level", (context) => {
		// @ts-ignore
		context.logger.log("", "message");

		assert.match(context.message, /message/);
	});

	it("should suppress console output", (context) => {
		context.logger.suppressConsoleOutput(true);

		context.logger.info("silent_message");
		assert.equal(context.message, "[90m• [39m");

		context.logger.suppressConsoleOutput(false);

		context.logger.info("non_silent_message");
		assert.match(context.message, /non_silent_message/);
	});
});
