import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { Application } from "../../application";
import { MemoryEventDispatcher } from "../events";
import { BlockJob } from "./block-job";
import { CronJob } from "./cron-job";
import { Schedule } from "./schedule";

describe<{
	app: Application;
	scheduleService: Schedule;
}>("Schedule", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
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
