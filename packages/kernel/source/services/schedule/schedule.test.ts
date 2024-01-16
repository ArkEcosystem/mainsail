import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework";
import { Application } from "../../application";
import { MemoryEventDispatcher } from "../events";
import { BlockJob } from "./block-job";
import { CronJob } from "./cron-job";
import { Schedule } from "./schedule";

describe<{
	app: Application;
	container: Container;
	scheduleService: Schedule;
}>("Schedule", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.container = new Container();
		context.container.snapshot();

		context.app = new Application(context.container);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).to(MemoryEventDispatcher);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		context.scheduleService = context.app.resolve<Schedule>(Schedule);
	});

	it("should return a cron job instance", (context) => {
		assert.instance(context.scheduleService.cron(), CronJob);
	});

	it("should return a block job instance", (context) => {
		assert.instance(context.scheduleService.block(), BlockJob);
	});
});
