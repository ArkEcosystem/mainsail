import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Logger } from "./logger.js";

describe<{
	app: Application;
	logger: Logger;
	kernelLogger: Record<string, (...args: any[]) => void>;
	previousLogExtra: string | undefined;
}>("Logger", ({ it, beforeEach, afterEach, spy }) => {
	beforeEach((context) => {
		context.previousLogExtra = process.env.MAINSAIL_API_SYNC_LOG_EXTRA;
		delete process.env.MAINSAIL_API_SYNC_LOG_EXTRA;

		context.kernelLogger = {
			alert: () => {},
			debug: () => {},
			error: () => {},
			info: () => {},
			notice: () => {},
			warn: () => {},
		};

		context.app = new Application();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.kernelLogger);

		context.logger = context.app.resolve(Logger);
	});

	afterEach(({ previousLogExtra }) => {
		if (previousLogExtra === undefined) {
			delete process.env.MAINSAIL_API_SYNC_LOG_EXTRA;
		} else {
			process.env.MAINSAIL_API_SYNC_LOG_EXTRA = previousLogExtra;
		}
	});

	for (const method of ["alert", "error", "warn", "notice", "info", "debug"] as const) {
		it(`${method}: delegates to the kernel logger`, ({ logger, kernelLogger }) => {
			const delegate = spy(kernelLogger, method);

			logger[method]("message", { tag: "context" });

			delegate.calledOnce();
			delegate.calledWith("message", { tag: "context" });
		});
	}

	for (const [method, delegated] of [
		["warnExtra", "warn"],
		["debugExtra", "debug"],
	] as const) {
		it(`${method}: is silent by default`, ({ logger, kernelLogger }) => {
			const delegate = spy(kernelLogger, delegated);

			logger[method]("message");

			delegate.neverCalled();
		});

		it(`${method}: delegates when extra logging is enabled`, ({ logger, kernelLogger }) => {
			process.env.MAINSAIL_API_SYNC_LOG_EXTRA = "true";
			const delegate = spy(kernelLogger, delegated);

			logger[method]("message");

			delegate.calledOnce();
			delegate.calledWith("message", undefined);
		});
	}
});
