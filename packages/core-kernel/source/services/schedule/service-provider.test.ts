import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { Application } from "../../application";
import { Schedule } from "./schedule";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("LogServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});
	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.ScheduleService));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.ScheduleService));
		assert.instance(context.app.get(Identifiers.ScheduleService), Schedule);
	});
});
