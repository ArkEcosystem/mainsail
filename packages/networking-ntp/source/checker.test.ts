import Sntp from "@hapi/sntp";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { Checker } from "./checker";

describe<{
	app: Application;
	checker: Checker;
	configuration: any;
	logger: any;
}>("Checker", ({ it, beforeEach, assert, stub, spy }) => {
	const hosts = ["a.ntp.test", "b.ntp.test"];
	const timeout = 500;

	beforeEach((context) => {
		context.configuration = {
			getRequired: (key: string) => ({ hosts, timeout })[key],
		};
		context.logger = { error: () => {}, info: () => {} };

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.configuration)
			.whenTagged("plugin", "networking-ntp");
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.checker = context.app.resolve(Checker);
	});

	it("should stop after the first reachable host", async ({ checker, logger }) => {
		const time = stub(Sntp, "time").resolvedValue({ t: 7 });
		const info = spy(logger, "info");
		const error = spy(logger, "error");

		await checker.execute();

		time.calledOnce();
		info.calledOnce();
		error.neverCalled();
	});

	it("should pass the configured host and timeout to Sntp", async ({ checker }) => {
		const time = stub(Sntp, "time").resolvedValue({ t: 7 });

		await checker.execute();

		const [options] = time.getCallArgs(0) as [{ host: string; timeout: number }];
		assert.true(hosts.includes(options.host));
		assert.equal(options.timeout, timeout);
	});

	it("should log the host and time offset on success", async ({ checker, logger }) => {
		const time = stub(Sntp, "time").resolvedValue({ t: 7 });
		const info = spy(logger, "info");

		await checker.execute();

		const [options] = time.getCallArgs(0) as [{ host: string }];
		info.calledWith(`Successfully connected to NTP host: ${options.host}. Time offset: 7 ms`);
	});

	it("should try the next host when a host is not reachable", async ({ checker, logger }) => {
		const time = stub(Sntp, "time").rejectedValue(new Error("socket timeout")).resolvedValueNth(1, { t: 7 });
		const info = spy(logger, "info");
		const error = spy(logger, "error");

		await checker.execute();

		time.calledTimes(2);
		error.calledOnce();
		info.calledOnce();
	});

	it("should log an error for every host and a final error when no host is reachable", async ({
		checker,
		logger,
	}) => {
		stub(Sntp, "time").rejectedValue(new Error("socket timeout"));
		const info = spy(logger, "info");
		const error = spy(logger, "error");

		await checker.execute();

		info.neverCalled();
		error.calledTimes(hosts.length + 1);
		for (const host of hosts) {
			error.calledWith(`Host ${host} responded with: socket timeout`);
		}
		error.calledWith("Please check your NTP connectivity, couldn't connect to any host.");
	});

	it("should handle non-error rejections", async ({ checker, logger }) => {
		stub(Sntp, "time").callsFake(async () => {
			throw "unknown failure";
		});
		const error = spy(logger, "error");

		await checker.execute();

		error.calledTimes(hosts.length + 1);
		for (const host of hosts) {
			error.calledWith(`Host ${host} responded with: unknown failure`);
		}
	});
});
