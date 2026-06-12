import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import dns from "dns";

import { Checker } from "./checker";

describe<{
	app: Application;
	checker: Checker;
	configuration: any;
	logger: any;
}>("Checker", ({ it, beforeEach, assert, stub, spy }) => {
	beforeEach((context) => {
		context.configuration = { getRequired: () => ["8.8.8.8"] };
		context.logger = { error: () => {}, info: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.checker = context.app.resolve(Checker);
	});

	it("should resolve and log success when the first host responds", async ({ checker, logger }) => {
		const lookupService = stub(dns, "lookupService").callsFake((host, port, callback: any) =>
			callback(null, "dns.google", "domain"),
		);
		const info = spy(logger, "info");
		const error = spy(logger, "error");

		await assert.resolves(() => checker.execute());

		lookupService.calledOnce();
		lookupService.calledWith("8.8.8.8", 53);
		info.calledOnce();
		info.calledWith("Your network DNS connectivity has been verified by 8.8.8.8");
		error.neverCalled();
	});

	it("should try the next host when one fails", async ({ checker, configuration, logger }) => {
		configuration.getRequired = () => ["8.8.8.8", "1.1.1.1"];

		const lookupService = stub(dns, "lookupService")
			.callsFakeNth(0, (host, port, callback: any) => callback(new Error("unreachable")))
			.callsFakeNth(1, (host, port, callback: any) => callback(null, "dns.google", "domain"));
		const error = spy(logger, "error");

		await assert.resolves(() => checker.execute());

		lookupService.calledTimes(2);
		error.calledOnce();
	});

	it("should log each failed host with its error message", async ({ checker, configuration, logger }) => {
		configuration.getRequired = () => ["8.8.8.8"];

		stub(dns, "lookupService").callsFake((host, port, callback: any) => callback(new Error("unreachable")));
		const error = spy(logger, "error");

		await assert.rejects(
			() => checker.execute(),
			"Please check your DNS connectivity, couldn't connect to any host.",
		);

		error.calledOnce();
		error.calledWith("Host 8.8.8.8 responded with: unreachable");
	});

	it("should throw when all hosts fail", async ({ checker, configuration, logger }) => {
		configuration.getRequired = () => ["8.8.8.8", "1.1.1.1", "208.67.222.222"];

		const lookupService = stub(dns, "lookupService").callsFake((host, port, callback: any) =>
			callback(new Error("unreachable")),
		);
		const error = spy(logger, "error");
		const info = spy(logger, "info");

		await assert.rejects(
			() => checker.execute(),
			"Please check your DNS connectivity, couldn't connect to any host.",
		);

		lookupService.calledTimes(3);
		error.calledTimes(3);
		info.neverCalled();
	});

	it("should throw when the host list is empty", async ({ checker, configuration }) => {
		configuration.getRequired = () => [];

		const lookupService = stub(dns, "lookupService");

		await assert.rejects(
			() => checker.execute(),
			"Please check your DNS connectivity, couldn't connect to any host.",
		);

		lookupService.neverCalled();
	});

	it("should handle non-error rejections", async ({ checker, logger }) => {
		stub(dns, "lookupService").callsFake(() => {
			throw "string error";
		});
		const error = spy(logger, "error");

		await assert.rejects(
			() => checker.execute(),
			"Please check your DNS connectivity, couldn't connect to any host.",
		);

		error.calledWith("Host 8.8.8.8 responded with: string error");
	});
});
