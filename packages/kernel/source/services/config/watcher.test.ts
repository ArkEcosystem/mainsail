import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { writeFileSync } from "fs";
import { dirSync, setGracefulCleanup } from "tmp";

import { describe } from "../../../../test-framework";
import { Application } from "../../application";
import { MemoryEventDispatcher } from "../events";
import { Watcher } from "./watcher";

const configPath: string = dirSync().name;

describe<{
	app: Application;
	watcher: Watcher;
}>("Watcher", ({ afterAll, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.LogService).toConstantValue({});
		context.app.bind(Identifiers.EventDispatcherService).toConstantValue(new MemoryEventDispatcher());
		context.app.bind("path.config").toConstantValue(configPath);

		context.watcher = context.app.resolve<Watcher>(Watcher);
	});

	afterAll(() => setGracefulCleanup());

	it.skip("should watch the configuration files and reboot on change", async (context) => {
		const spyReboot = spy(context.app, "reboot");

		writeFileSync(`${configPath}/.env`, "old");

		await context.watcher.boot();

		spyReboot.neverCalled();

		writeFileSync(`${configPath}/.env`, "new");

		spyReboot.calledOnce();

		await context.watcher.dispose();
	});
});
