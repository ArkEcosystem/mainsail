import { Identifiers } from "@mainsail/constants";
import * as EvmModule from "@mainsail/evm";
import { Application } from "@mainsail/kernel";
import esmock from "esmock";

import { describe } from "@mainsail/test-runner";

const { LogLevel } = EvmModule;

// Captures the `logger` callback the EvmInstance hands to the native Evm constructor so the
// LogLevel routing can be driven directly, without booting the real native EVM.
let capturedLogger: ((record: { level: number; message: string }) => void) | undefined;

class FakeEvm {
	public constructor(options: any) {
		capturedLogger = options.logger;
	}

	public async dispose(): Promise<void> {}
}

// Keep the real module (LogLevel etc.) but swap the Evm class for the capturing fake.
const { EvmInstance } = await esmock("./evm", {
	"@mainsail/evm": { ...EvmModule, Evm: FakeEvm },
});

describe<{
	app: Application;
	logger: Record<string, (...arguments_: unknown[]) => void>;
}>("EvmInstance.logger", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		capturedLogger = undefined;
		context.logger = {
			alert: () => {},
			debug: () => {},
			error: () => {},
			info: () => {},
			notice: () => {},
			warn: () => {},
		};

		context.app = new Application();
		// Application auto-binds itself as Application.Instance; replace it with a fake that
		// only needs dataPath() for initialize().
		context.app.rebind(Identifiers.Application.Instance).toConstantValue({ dataPath: () => "/tmp/evm-logger" });
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		// Resolve to trigger @postConstruct initialize(), which constructs the (fake) Evm.
		context.app.resolve(EvmInstance);
		assert.defined(capturedLogger);
	});

	const cases: [number, string][] = [
		[LogLevel.Info, "info"],
		[LogLevel.Debug, "debug"],
		[LogLevel.Notice, "notice"],
		[LogLevel.Alert, "alert"],
		[LogLevel.Warn, "warn"],
	];

	for (const [level, method] of cases) {
		it(`routes ${method} records to logger.${method} with the evm context`, ({ logger }) => {
			const target = spy(logger, method);

			capturedLogger!({ level, message: `${method} message` });

			target.calledOnce();
			target.calledWith(`${method} message`, "evm");
		});
	}

	it("ignores unmapped log levels", ({ logger }) => {
		const spies = Object.keys(logger).map((method) => spy(logger, method));

		assert.not.throws(() => capturedLogger!({ level: 999, message: "noop" }));

		for (const target of spies) {
			target.neverCalled();
		}
	});

	it("swallows errors thrown by the logger", ({ logger }) => {
		logger.info = () => {
			throw new Error("logger is down");
		};

		assert.not.throws(() => capturedLogger!({ level: LogLevel.Info, message: "boom" }));
	});
});
