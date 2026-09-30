import { Enums } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { Application } from "../application";
import { ListenToShutdownSignals } from "./listen-to-shutdown-signals";

describe<{
	app: Application;
	handler: ListenToShutdownSignals;
}>("ListenToShutdownSignals", ({ beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.handler = context.app.resolve(ListenToShutdownSignals);
	});

	it("should register a handler for every shutdown signal", async ({ handler }) => {
		const spyOn = stub(process, "on");

		await handler.bootstrap();

		spyOn.calledTimes(Object.keys(Enums.Kernel.ShutdownSignal).length);
	});

	it("should terminate the application when a signal is received", async ({ app, handler }) => {
		const listeners: Record<string, () => void> = {};
		stub(process, "on").callsFake((signal: string, listener: () => void) => {
			listeners[signal] = listener;
		});
		const spyTerminate = stub(app, "terminate");

		await handler.bootstrap();
		listeners[Enums.Kernel.ShutdownSignal.SIGINT]();
		// #onSignal is dispatched with `void`, so allow the microtask to settle.
		await new Promise((resolve) => setTimeout(resolve, 0));

		spyTerminate.calledOnce();
		spyTerminate.calledWith(Enums.Kernel.ShutdownSignal.SIGINT);
	});
});
