import { Writable } from "stream";
import { Application, Container, Contracts } from "@arkecosystem/core-kernel";
import { describe } from "@arkecosystem/core-test-framework";
import { sleep } from "@arkecosystem/utils";
import capcon from "capture-console";
import { readdirSync } from "fs-extra";
import { dirSync, setGracefulCleanup } from "tmp";

import { PinoLogger } from "./driver";

describe("Logger", ({ assert, afterAll, afterEach, beforeAll, beforeEach, it }) => {
	beforeAll((context) => {
		capcon.startCapture(process.stdout, (stdout) => (context.message = stdout.toString()));

		capcon.startCapture(process.stderr, (stderr) => (context.message = stderr.toString()));

		// @ts-ignore
		capcon.startCapture(console._stdout, (stdout) => (context.message = stdout.toString()));

		// @ts-ignore
		capcon.startCapture(console._stderr, (stderr) => (context.message = stderr.toString()));
	});

	afterAll(() => setGracefulCleanup());

	beforeEach(async (context) => {
		context.app = new Application(new Container.Container());
		context.app.bind(Container.Identifiers.ConfigFlags).toConstantValue("core");
		context.app.bind(Container.Identifiers.ApplicationNamespace).toConstantValue("ark-unitnet");
		context.app.bind("path.log").toConstantValue(dirSync().name);

		context.logger = await context.app.resolve<Contracts.Kernel.Logger>(PinoLogger).make({
			fileRotator: {
				interval: "1d",
			},
			levels: {
				console: process.env.CORE_LOG_LEVEL || "debug",
				file: process.env.CORE_LOG_LEVEL_FILE || "debug",
			},
		});
	});

	afterEach((context) => (context.message = undefined));

	it("should not be logged if empty", (context) => {
		context.logger.info();

		assert.undefined(context.message);
	});

	it("should modify the message if it is not a string", (context) => {
		context.logger.info(["Hello World"]);

		assert.match(context.message.trim(), "[ 'Hello World' ]");
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

	it("should suppress console output", (context) => {
		context.logger.suppressConsoleOutput(true);

		context.logger.info("silent_message");

		// @TODO Something is working different here
		// assert.undefined(message);
		assert.equal(context.message, "[90m• [39m");

		context.logger.suppressConsoleOutput(false);

		context.logger.info("non_silent_message");
		assert.match(context.message, /non_silent_message/);
	});

	it("should log error if there is an error on file stream", async (context) => {
		const logger = context.app.resolve<Contracts.Kernel.Logger>(PinoLogger);

		const writableMock = new Writable({
			write(chunk, enc, callback) {
				throw new Error("Stream error");
			},
		});
		// @ts-ignore
		logger.getFileStream = () => writableMock;

		await logger.make({
			fileRotator: {
				interval: "1d",
			},
			levels: {
				console: "invalid",
				file: process.env.CORE_LOG_LEVEL_FILE || "debug",
			},
		});

		writableMock.destroy(new Error("Test error"));

		await sleep(100);

		assert.match(context.message, "File stream closed due to an error: Error: Test error");

		await assert.resolves(() => logger.dispose());
	});

	it("should rotate the log 3 times", async (context) => {
		const app = new Application(new Container.Container());
		app.bind(Container.Identifiers.ConfigFlags).toConstantValue("core");
		app.bind(Container.Identifiers.ApplicationNamespace).toConstantValue("ark-unitnet");
		app.useLogPath(dirSync().name);

		const ms = new Date().getMilliseconds();
		await sleep(1000 - ms + 400);

		const logger = await app.resolve(PinoLogger).make({
			fileRotator: {
				interval: "1s",
			},
			levels: {
				console: process.env.CORE_LOG_LEVEL || "emergency",
				file: process.env.CORE_LOG_LEVEL_FILE || "emergency",
			},
		});

		for (let index = 0; index < 3; index++) {
			logger.info(`Test ${index + 1}`);

			await sleep(900);
		}

		const files = readdirSync(app.logPath());
		assert.length(
			files.filter((file) => file.endsWith(".log.gz")),
			3,
		);
		assert.length(files, 5);
	});

	it("should create a file stream if level is valid", (context) => {
		assert.defined(context.logger.combinedFileStream);
	});

	it("should not create a file stream if level not is valid", async (context) => {
		const logger = await context.app.resolve<PinoLogger>(PinoLogger).make({
			fileRotator: {
				interval: "1d",
			},
			levels: {
				console: process.env.CORE_LOG_LEVEL || "debug",
				file: "invalid",
			},
		});

		assert.undefined(logger.combinedFileStream);
	});

	it("should dispose before make", async (context) => {
		const logger = await context.app.resolve<PinoLogger>(PinoLogger);

		await assert.resolves(() => logger.dispose());
	});

	it("should dispose after make", async (context) => {
		await assert.resolves(() => context.logger.dispose());
	});
});
